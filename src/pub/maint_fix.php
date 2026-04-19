<?php
/**
 * Temporary maintenance script: fix product images, URLs, caches, and reindex.
 * DELETE THIS FILE after use.
 * Access: https://domain/maint_fix.php?token=FIX_TOKEN_9X2K
 */
declare(strict_types=1);

// Security token check
define('FIX_TOKEN', 'FIX_TOKEN_9X2K');
if (($_GET['token'] ?? '') !== FIX_TOKEN) {
    http_response_code(403);
    exit('Forbidden');
}

// Set no time limit for long operations
set_time_limit(0);
ini_set('memory_limit', '2G');
ob_implicit_flush(true);

function output(string $msg): void {
    echo $msg . "\n";
    if (ob_get_level()) ob_flush();
}

output('=== Magento Fix Script ===');
output('Started: ' . date('Y-m-d H:i:s'));
output('');

// Bootstrap Magento
$magentoRoot = dirname(__DIR__);
require $magentoRoot . '/app/bootstrap.php';

use Magento\Framework\App\Bootstrap as MageBootstrap;
use Magento\Framework\App\ObjectManager;

$bootstrap = MageBootstrap::create($magentoRoot, $_SERVER);
$objectManager = $bootstrap->getObjectManager();

/** @var \Magento\Framework\App\State $state */
$state = $objectManager->get(\Magento\Framework\App\State::class);
try {
    $state->setAreaCode('adminhtml');
} catch (\Exception $e) {
    // Already set
}

output('Magento bootstrapped OK');
output('');

// ============================================================
// STEP 1: Fix core_config_data URLs
// ============================================================
output('--- Step 1: Fix base/media URLs in DB ---');

/** @var \Magento\Framework\App\ResourceConnection $resource */
$resource = $objectManager->get(\Magento\Framework\App\ResourceConnection::class);
$conn = $resource->getConnection();

$baseUrl = 'https://magento.ahphonestore.id.vn/';
$mediaUrl = 'https://magento.ahphonestore.id.vn/media/';
$staticUrl = 'https://magento.ahphonestore.id.vn/static/';

$configTable = $resource->getTableName('core_config_data');

$urlPairs = [
    'web/unsecure/base_url'        => $baseUrl,
    'web/secure/base_url'          => $baseUrl,
    'web/unsecure/base_media_url'  => $mediaUrl,
    'web/secure/base_media_url'    => $mediaUrl,
    'web/unsecure/base_static_url' => $staticUrl,
    'web/secure/base_static_url'   => $staticUrl,
    'web/unsecure/base_link_url'   => $baseUrl,
    'web/secure/base_link_url'     => $baseUrl,
];

foreach ($urlPairs as $path => $value) {
    // Check current DB value
    $currentRow = $conn->fetchRow(
        "SELECT value FROM {$configTable} WHERE path = ? AND scope = 'default' AND scope_id = 0",
        [$path]
    );

    if ($currentRow === false) {
        // Insert
        $conn->insert($configTable, [
            'scope' => 'default',
            'scope_id' => 0,
            'path' => $path,
            'value' => $value,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
        output("  INSERTED: {$path} = {$value}");
    } elseif ($currentRow['value'] !== $value) {
        $conn->update(
            $configTable,
            ['value' => $value, 'updated_at' => date('Y-m-d H:i:s')],
            ["path = ?" => $path, "scope = ?" => "default", "scope_id = ?" => 0]
        );
        output("  UPDATED: {$path}: [{$currentRow['value']}] -> [{$value}]");
    } else {
        output("  OK: {$path} = {$value}");
    }
}
output('');

// ============================================================
// STEP 2: Fix product image roles
// ============================================================
output('--- Step 2: Fix product image roles ---');

$galleryTable   = $resource->getTableName('catalog_product_entity_media_gallery');
$galleryValTable = $resource->getTableName('catalog_product_entity_media_gallery_value_to_entity');
$mediaAttrTable  = $resource->getTableName('catalog_product_entity_varchar');

// Get EAV attribute IDs for image/small_image/thumbnail
$eavTable = $resource->getTableName('eav_attribute');
$entityTypeTable = $resource->getTableName('eav_entity_type');

$attrIds = $conn->fetchPairs(
    "SELECT a.attribute_code, a.attribute_id
     FROM {$eavTable} a
     JOIN {$entityTypeTable} et ON a.entity_type_id = et.entity_type_id
     WHERE et.entity_type_code = 'catalog_product'
     AND a.attribute_code IN ('image','small_image','thumbnail','swatch_image')"
);

output('  Attribute IDs: ' . json_encode($attrIds));

if (empty($attrIds)) {
    output('  ERROR: Could not find attribute IDs. Skipping image fix.');
} else {
    // Get all products that have images in gallery but missing roles
    $productsFixed = 0;
    $productsSkipped = 0;

    // Get products with gallery images
    $productsWithGallery = $conn->fetchAll(
        "SELECT DISTINCT e.entity_id
         FROM {$resource->getTableName('catalog_product_entity')} e
         JOIN {$galleryValTable} vtoe ON vtoe.entity_id = e.entity_id
         JOIN {$galleryTable} mg ON mg.value_id = vtoe.value_id
         WHERE mg.media_type = 'image'
         LIMIT 10000"
    );

    output('  Products with gallery images: ' . count($productsWithGallery));

    foreach ($productsWithGallery as $product) {
        $entityId = $product['entity_id'];

        // Get first non-disabled gallery image for this product
        $firstImage = $conn->fetchOne(
            "SELECT mg.value
             FROM {$galleryTable} mg
             JOIN {$galleryValTable} vtoe ON vtoe.value_id = mg.value_id
             LEFT JOIN {$resource->getTableName('catalog_product_entity_media_gallery_value')} mgv
                 ON mgv.value_id = mg.value_id AND mgv.store_id = 0
             WHERE vtoe.entity_id = ?
             AND mg.media_type = 'image'
             AND (mgv.disabled IS NULL OR mgv.disabled = 0)
             ORDER BY mgv.position ASC, mg.value_id ASC
             LIMIT 1",
            [$entityId]
        );

        if (!$firstImage) {
            $productsSkipped++;
            continue;
        }

        $needsFix = false;
        foreach (['image', 'small_image', 'thumbnail'] as $attrCode) {
            if (!isset($attrIds[$attrCode])) continue;
            $attrId = $attrIds[$attrCode];

            $currentVal = $conn->fetchOne(
                "SELECT value FROM {$mediaAttrTable}
                 WHERE entity_id = ? AND attribute_id = ? AND store_id = 0",
                [$entityId, $attrId]
            );

            if ($currentVal === false || $currentVal === '' || $currentVal === null || $currentVal === 'no_selection') {
                // Need to set this attribute
                if ($currentVal === false) {
                    $conn->insert($mediaAttrTable, [
                        'entity_id'   => $entityId,
                        'attribute_id' => $attrId,
                        'store_id'    => 0,
                        'value'       => $firstImage,
                    ]);
                } else {
                    $conn->update(
                        $mediaAttrTable,
                        ['value' => $firstImage],
                        ['entity_id = ?' => $entityId, 'attribute_id = ?' => $attrId, 'store_id = ?' => 0]
                    );
                }
                $needsFix = true;
            }
        }

        if ($needsFix) {
            $productsFixed++;
        }
    }

    output("  Fixed image roles for {$productsFixed} products (skipped {$productsSkipped} with no images)");
}
output('');

// ============================================================
// STEP 3: Check for disabled/invisible products
// ============================================================
output('--- Step 3: Check product visibility & status ---');

$productEntityTable = $resource->getTableName('catalog_product_entity');
$totalProducts = $conn->fetchOne("SELECT COUNT(*) FROM {$productEntityTable}");
output("  Total products in DB: {$totalProducts}");

// Check status attribute
$statusAttrId = $conn->fetchOne(
    "SELECT a.attribute_id FROM {$eavTable} a
     JOIN {$entityTypeTable} et ON a.entity_type_id = et.entity_type_id
     WHERE et.entity_type_code = 'catalog_product' AND a.attribute_code = 'status'"
);

$enabledCount = $conn->fetchOne(
    "SELECT COUNT(*) FROM {$mediaAttrTable}
     WHERE attribute_id = ? AND store_id = 0 AND value = 1",
    [$statusAttrId]
);
$disabledCount = $conn->fetchOne(
    "SELECT COUNT(*) FROM {$mediaAttrTable}
     WHERE attribute_id = ? AND store_id = 0 AND value = 2",
    [$statusAttrId]
);
output("  Enabled products: {$enabledCount}");
output("  Disabled products: {$disabledCount}");

// Check visibility
$visibilityAttrId = $conn->fetchOne(
    "SELECT a.attribute_id FROM {$eavTable} a
     JOIN {$entityTypeTable} et ON a.entity_type_id = et.entity_type_id
     WHERE et.entity_type_code = 'catalog_product' AND a.attribute_code = 'visibility'"
);

$visibilityCounts = $conn->fetchAll(
    "SELECT value, COUNT(*) as cnt FROM {$mediaAttrTable}
     WHERE attribute_id = ? AND store_id = 0
     GROUP BY value",
    [$visibilityAttrId]
);
// 1=Not Visible, 2=Catalog, 3=Search, 4=Catalog+Search
$visLabels = [1 => 'Not Visible', 2 => 'Catalog', 3 => 'Search', 4 => 'Catalog+Search'];
foreach ($visibilityCounts as $row) {
    $label = $visLabels[$row['value']] ?? 'Unknown';
    output("  Visibility [{$label}]: {$row['cnt']}");
}
output('');

// ============================================================
// STEP 4: Flush all caches
// ============================================================
output('--- Step 4: Flush all caches ---');

// Flush Redis cache
try {
    /** @var \Magento\Framework\App\Cache $cache */
    $cacheManager = $objectManager->get(\Magento\Framework\App\Cache\Manager::class);
    $availableTypes = $cacheManager->getAvailableTypes();
    $cacheManager->flush($availableTypes);
    output('  Redis/all caches flushed: ' . implode(', ', $availableTypes));
} catch (\Exception $e) {
    output('  Cache flush error: ' . $e->getMessage());
}

// Clean filesystem caches
$dirs = [
    $magentoRoot . '/var/cache',
    $magentoRoot . '/var/page_cache',
    $magentoRoot . '/var/view_preprocessed',
    $magentoRoot . '/generated/metadata',
    $magentoRoot . '/generated/code',
];
foreach ($dirs as $dir) {
    if (is_dir($dir)) {
        $files = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        $count = 0;
        foreach ($files as $fileinfo) {
            $todo = ($fileinfo->isDir() ? 'rmdir' : 'unlink');
            try { $todo($fileinfo->getRealPath()); $count++; } catch (\Exception $e) {}
        }
        output("  Cleared {$count} items from " . basename($dir));
    }
}
output('');

// ============================================================
// STEP 5: Reindex catalog
// ============================================================
output('--- Step 5: Reindex catalog ---');

try {
    /** @var \Magento\Indexer\Model\IndexerFactory $indexerFactory */
    $indexerFactory = $objectManager->get(\Magento\Indexer\Model\IndexerFactory::class);

    $indexesToRun = [
        'catalog_product_attribute',
        'catalog_product_price',
        'catalog_product_flat',
        'catalog_category_flat',
        'catalog_category_product',
        'catalogsearch_fulltext',
        'catalog_product_category',
        'catalogrule_rule',
        'catalogrule_product',
        'inventory',
    ];

    foreach ($indexesToRun as $indexId) {
        try {
            $indexer = $indexerFactory->create();
            $indexer->load($indexId);
            if ($indexer->getStatus() !== \Magento\Framework\Indexer\StateInterface::STATUS_VALID) {
                output("  Reindexing: {$indexId} ...");
                $indexer->reindexAll();
                output("  Done: {$indexId}");
            } else {
                output("  Already valid: {$indexId}");
            }
        } catch (\Exception $e) {
            output("  Error reindexing {$indexId}: " . $e->getMessage());
        }
    }
} catch (\Exception $e) {
    output('  Indexer error: ' . $e->getMessage());
}
output('');

// ============================================================
// DONE
// ============================================================
output('=== ALL DONE ===');
output('Finished: ' . date('Y-m-d H:i:s'));
output('');
output('IMPORTANT: Delete this file after confirming everything is fixed!');
output('Run: rm /var/www/html/pub/maint_fix.php');
