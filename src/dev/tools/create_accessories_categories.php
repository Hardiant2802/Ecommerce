<?php
declare(strict_types=1);

use Magento\Catalog\Api\CategoryRepositoryInterface;
use Magento\Catalog\Api\ProductRepositoryInterface;
use Magento\Catalog\Model\CategoryFactory;
use Magento\Catalog\Model\Product\Attribute\Source\Status;
use Magento\Catalog\Model\Product\Type;
use Magento\Catalog\Model\Product\Visibility;
use Magento\Catalog\Model\ProductFactory;
use Magento\Framework\App\Bootstrap;
use Magento\Framework\App\State;
use Magento\Framework\Exception\LocalizedException;

require __DIR__ . '/../../app/bootstrap.php';

$bootstrap = Bootstrap::create(BP, $_SERVER);
$objectManager = $bootstrap->getObjectManager();

/** @var State $appState */
$appState = $objectManager->get(State::class);
try {
    $appState->setAreaCode('adminhtml');
} catch (LocalizedException $e) {
}

/** @var CategoryRepositoryInterface $categoryRepository */
$categoryRepository = $objectManager->get(CategoryRepositoryInterface::class);
/** @var CategoryFactory $categoryFactory */
$categoryFactory = $objectManager->get(CategoryFactory::class);
/** @var ProductRepositoryInterface $productRepository */
$productRepository = $objectManager->get(ProductRepositoryInterface::class);
/** @var ProductFactory $productFactory */
$productFactory = $objectManager->get(ProductFactory::class);

function findOrCreateCategory($categoryFactory, $categoryRepository, $objectManager, string $name, string $urlKey, int $parentId): int
{
    $collection = $objectManager->create(\Magento\Catalog\Model\ResourceModel\Category\Collection::class);
    $collection->addAttributeToFilter('url_key', $urlKey);
    $collection->setPageSize(1);
    $existing = $collection->getFirstItem();

    if ($existing && $existing->getId()) {
        echo "[OK] Category {$name} exists (ID: {$existing->getId()})\n";
        return (int)$existing->getId();
    }

    $category = $categoryFactory->create();
    $category->setName($name);
    $category->setUrlKey($urlKey);
    $category->setIsActive(true);
    $category->setParentId($parentId);
    $category->setIncludeInMenu(true);

    $saved = $categoryRepository->save($category);
    echo "[CREATED] Category {$name} (ID: {$saved->getId()})\n";
    return (int)$saved->getId();
}

function createProduct($productFactory, $productRepository, array $data, int $categoryId): void
{
    try {
        $productRepository->get($data['sku']);
        echo "[SKIP] {$data['sku']} already exists\n";
        return;
    } catch (\Magento\Framework\Exception\NoSuchEntityException $e) {
    }

    $product = $productFactory->create();
    $product->setTypeId(Type::TYPE_SIMPLE);
    $product->setAttributeSetId(4);
    $product->setWebsiteIds([1]);
    $product->setName($data['name']);
    $product->setSku($data['sku']);
    $product->setPrice($data['price']);
    $product->setStatus(Status::STATUS_ENABLED);
    $product->setVisibility(Visibility::VISIBILITY_BOTH);
    $product->setStockData([
        'use_config_manage_stock' => 0,
        'manage_stock' => 1,
        'is_in_stock' => 1,
        'qty' => 100,
    ]);
    $product->setDescription($data['description']);
    $product->setShortDescription($data['short_description']);
    $product->setCategoryIds([$categoryId]);

    $productRepository->save($product);
    echo "[CREATED] {$data['sku']}\n";
}

$parentCategoryId = 2;
$taiNgheCatId = findOrCreateCategory($categoryFactory, $categoryRepository, $objectManager, 'Tai nghe', 'tai-nghe', $parentCategoryId);
$phuKienCatId = findOrCreateCategory($categoryFactory, $categoryRepository, $objectManager, 'Phụ kiện', 'phu-kien', $parentCategoryId);

$taiNgheProducts = [
    ['sku' => 'TAI-NGHE-001', 'name' => 'Apple AirPods Pro 2 (USB-C)', 'price' => 6490000, 'description' => 'Tai nghe Apple AirPods Pro 2.', 'short_description' => 'AirPods Pro 2 USB-C'],
    ['sku' => 'TAI-NGHE-002', 'name' => 'Samsung Galaxy Buds2 Pro', 'price' => 3490000, 'description' => 'Tai nghe Samsung Galaxy Buds2 Pro.', 'short_description' => 'Galaxy Buds2 Pro'],
];

$phuKienProducts = [
    ['sku' => 'PHU-KIEN-001', 'name' => 'Sạc nhanh 65W GaN USB-C PD', 'price' => 490000, 'description' => 'Củ sạc nhanh 65W GaN.', 'short_description' => 'Sạc 65W GaN'],
    ['sku' => 'PHU-KIEN-002', 'name' => 'Cáp sạc USB-C to USB-C 1m 100W', 'price' => 190000, 'description' => 'Cáp sạc USB-C 100W.', 'short_description' => 'Cáp USB-C 100W'],
];

echo "=== Creating Tai nghe products ===\n";
foreach ($taiNgheProducts as $p) {
    createProduct($productFactory, $productRepository, $p, $taiNgheCatId);
}

echo "=== Creating Phu kien products ===\n";
foreach ($phuKienProducts as $p) {
    createProduct($productFactory, $productRepository, $p, $phuKienCatId);
}

echo "Done. Run: bin/magento indexer:reindex && bin/magento cache:flush\n";
<?php
declare(strict_types=1);

use Magento\Catalog\Api\CategoryRepositoryInterface;
use Magento\Catalog\Api\ProductRepositoryInterface;
use Magento\Catalog\Model\CategoryFactory;
use Magento\Catalog\Model\Product\Attribute\Source\Status;
use Magento\Catalog\Model\Product\Type;
use Magento\Catalog\Model\Product\Visibility;
use Magento\Catalog\Model\ProductFactory;
use Magento\Framework\App\Bootstrap;
use Magento\Framework\App\State;
use Magento\Framework\Exception\LocalizedException;

require __DIR__ . '/../../app/bootstrap.php';

$bootstrap = Bootstrap::create(BP, $_SERVER);
$objectManager = $bootstrap->getObjectManager();

/** @var State $appState */
$appState = $objectManager->get(State::class);
try {
    $appState->setAreaCode('adminhtml');
} catch (LocalizedException $e) {
}

/** @var CategoryRepositoryInterface $categoryRepository */
$categoryRepository = $objectManager->get(CategoryRepositoryInterface::class);
/** @var CategoryFactory $categoryFactory */
$categoryFactory = $objectManager->get(CategoryFactory::class);
/** @var ProductRepositoryInterface $productRepository */
$productRepository = $objectManager->get(ProductRepositoryInterface::class);
/** @var ProductFactory $productFactory */
$productFactory = $objectManager->get(ProductFactory::class);

function findOrCreateCategory($categoryFactory, $categoryRepository, $objectManager, string $name, string $urlKey, int $parentId): int
{
    $collection = $objectManager->create(\Magento\Catalog\Model\ResourceModel\Category\Collection::class);
    $collection->addAttributeToFilter('url_key', $urlKey);
    $collection->setPageSize(1);
    $existing = $collection->getFirstItem();

    if ($existing && $existing->getId()) {
        echo "[OK] Category {$name} exists (ID: {$existing->getId()})\n";
        return (int)$existing->getId();
    }

    $category = $categoryFactory->create();
    $category->setName($name);
    $category->setUrlKey($urlKey);
    $category->setIsActive(true);
    $category->setParentId($parentId);
    $category->setIncludeInMenu(true);

    $saved = $categoryRepository->save($category);
    echo "[CREATED] Category {$name} (ID: {$saved->getId()})\n";
    return (int)$saved->getId();
}

function createProduct($productFactory, $productRepository, array $data, int $categoryId): void
{
    try {
        $productRepository->get($data['sku']);
        echo "[SKIP] {$data['sku']} already exists\n";
        return;
    } catch (\Magento\Framework\Exception\NoSuchEntityException $e) {
    }

    $product = $productFactory->create();
    $product->setTypeId(Type::TYPE_SIMPLE);
    $product->setAttributeSetId(4);
    $product->setWebsiteIds([1]);
    $product->setName($data['name']);
    $product->setSku($data['sku']);
    $product->setPrice($data['price']);
    $product->setStatus(Status::STATUS_ENABLED);
    $product->setVisibility(Visibility::VISIBILITY_BOTH);
    $product->setStockData([
        'use_config_manage_stock' => 0,
        'manage_stock' => 1,
        'is_in_stock' => 1,
        'qty' => 100,
    ]);
    $product->setDescription($data['description']);
    $product->setShortDescription($data['short_description']);
    $product->setCategoryIds([$categoryId]);

    $productRepository->save($product);
    echo "[CREATED] {$data['sku']}\n";
}

$parentCategoryId = 2;
$taiNgheCatId = findOrCreateCategory($categoryFactory, $categoryRepository, $objectManager, 'Tai nghe', 'tai-nghe', $parentCategoryId);
$phuKienCatId = findOrCreateCategory($categoryFactory, $categoryRepository, $objectManager, 'Phụ kiện', 'phu-kien', $parentCategoryId);

$taiNgheProducts = [
    ['sku' => 'TAI-NGHE-001', 'name' => 'Apple AirPods Pro 2 (USB-C)', 'price' => 6490000, 'description' => 'Tai nghe Apple AirPods Pro 2.', 'short_description' => 'AirPods Pro 2 USB-C'],
    ['sku' => 'TAI-NGHE-002', 'name' => 'Samsung Galaxy Buds2 Pro', 'price' => 3490000, 'description' => 'Tai nghe Samsung Galaxy Buds2 Pro.', 'short_description' => 'Galaxy Buds2 Pro'],
];

$phuKienProducts = [
    ['sku' => 'PHU-KIEN-001', 'name' => 'Sạc nhanh 65W GaN USB-C PD', 'price' => 490000, 'description' => 'Củ sạc nhanh 65W GaN.', 'short_description' => 'Sạc 65W GaN'],
    ['sku' => 'PHU-KIEN-002', 'name' => 'Cáp sạc USB-C to USB-C 1m 100W', 'price' => 190000, 'description' => 'Cáp sạc USB-C 100W.', 'short_description' => 'Cáp USB-C 100W'],
];

echo "=== Creating Tai nghe products ===\n";
foreach ($taiNgheProducts as $p) {
    createProduct($productFactory, $productRepository, $p, $taiNgheCatId);
}

echo "=== Creating Phu kien products ===\n";
foreach ($phuKienProducts as $p) {
    createProduct($productFactory, $productRepository, $p, $phuKienCatId);
}

echo "Done. Run: bin/magento indexer:reindex && bin/magento cache:flush\n";
<?php
declare(strict_types=1);

use Magento\Catalog\Api\CategoryRepositoryInterface;
use Magento\Catalog\Api\ProductRepositoryInterface;
use Magento\Catalog\Model\CategoryFactory;
use Magento\Catalog\Model\Product\Attribute\Source\Status;
use Magento\Catalog\Model\Product\Type;
use Magento\Catalog\Model\Product\Visibility;
use Magento\Catalog\Model\ProductFactory;
use Magento\Framework\App\Bootstrap;
use Magento\Framework\App\State;
use Magento\Framework\Exception\LocalizedException;
use Magento\Store\Model\StoreManagerInterface;

require __DIR__ . '/../../app/bootstrap.php';

$bootstrap = Bootstrap::create(BP, $_SERVER);
$objectManager = $bootstrap->getObjectManager();

/** @var State $appState */
$appState = $objectManager->get(State::class);
try {
    $appState->setAreaCode('adminhtml');
} catch (LocalizedException $e) {}

/** @var StoreManagerInterface $storeManager */
$storeManager = $objectManager->get(StoreManagerInterface::class);
/** @var CategoryRepositoryInterface $categoryRepository */
$categoryRepository = $objectManager->get(CategoryRepositoryInterface::class);
/** @var CategoryFactory $categoryFactory */
$categoryFactory = $objectManager->get(CategoryFactory::class);
/** @var ProductRepositoryInterface $productRepository */
$productRepository = $objectManager->get(ProductRepositoryInterface::class);
/** @var ProductFactory $productFactory */
$productFactory = $objectManager->get(ProductFactory::class);

// Find parent category (root catalog)
$parentCategoryId = 2; // Default Magento root catalog

$targetStoreIds = [0];
foreach ($storeManager->getStores() as $store) {
    $targetStoreIds[] = (int)$store->getId();
}
$targetStoreIds = array_values(array_unique($targetStoreIds));

// ---------------------------------------------------------------------------
// Helper: find or create category
// ---------------------------------------------------------------------------
function findOrCreateCategory(
    $categoryFactory,
    $categoryRepository,
    $objectManager,
    string $name,
    string $urlKey,
    int $parentId
): int {
    /** @var \Magento\Catalog\Model\ResourceModel\Category\Collection $collection */
    $collection = $objectManager->create(\Magento\Catalog\Model\ResourceModel\Category\Collection::class);
    $collection->addAttributeToFilter('url_key', $urlKey);
    $collection->setPageSize(1);
    $existing = $collection->getFirstItem();

    if ($existing && $existing->getId()) {
        echo "  [OK] Category '{$name}' already exists (ID: {$existing->getId()})\n";
        return (int)$existing->getId();
    }

    $category = $categoryFactory->create();
    $category->setName($name);
    $category->setUrlKey($urlKey);
    $category->setIsActive(true);
    $category->setParentId($parentId);
    $category->setIncludeInMenu(true);
    $category->setIsAnchor(false);
    $category->setCustomAttributes([]);
    $saved = $categoryRepository->save($category);
    echo "  [CREATED] Category '{$name}' (ID: {$saved->getId()})\n";
    return (int)$saved->getId();
}

// ---------------------------------------------------------------------------
// Helper: create product
// ---------------------------------------------------------------------------
function createProduct(
    $productFactory,
    $productRepository,
    $objectManager,
    array $data,
    int $categoryId,
    array $storeIds
): void {
    // Check if product already exists
    try {
        $existing = $productRepository->get($data['sku']);
        echo "  [SKIP] Product '{$data['name']}' already exists\n";
        return;
    } catch (\Magento\Framework\Exception\NoSuchEntityException $e) {
        // not found, proceed
    }

    /** @var \Magento\Catalog\Model\Product $product */
    $product = $productFactory->create();
    $product->setTypeId(Type::TYPE_SIMPLE);
    $product->setAttributeSetId(4); // Default attribute set
    $product->setWebsiteIds([1]);
    $product->setName($data['name']);
    $product->setSku($data['sku']);
    $product->setPrice($data['price']);
    $product->setStatus(Status::STATUS_ENABLED);
    $product->setVisibility(Visibility::VISIBILITY_BOTH);
    $product->setStockData([
        'use_config_manage_stock' => 0,
        'manage_stock' => 1,
        'is_in_stock' => 1,
        'qty' => 100,
    ]);
    $product->setDescription($data['description']);
    $product->setShortDescription($data['short_description']);
    $product->setCategoryIds([$categoryId]);

    try {
        $saved = $productRepository->save($product);
        echo "  [CREATED] Product '{$data['name']}' (SKU: {$data['sku']})\n";

        // Try to download and assign image
        if (!empty($data['image_url'])) {
            $downloadDir = BP . '/pub/media/import/accessories-images';
            if (!is_dir($downloadDir)) {
                mkdir($downloadDir, 0775, true);
            }

            $ext = pathinfo(parse_url($data['image_url'], PHP_URL_PATH), PATHINFO_EXTENSION) ?: 'jpg';
            $localFile = $downloadDir . '/' . preg_replace('/[^a-z0-9_-]/', '-', strtolower($data['sku'])) . '.' . $ext;

            if (!file_exists($localFile)) {
                $ch = curl_init($data['image_url']);
                $fp = fopen($localFile, 'wb');
                curl_setopt_array($ch, [
                    CURLOPT_FILE => $fp,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_CONNECTTIMEOUT => 15,
                    CURLOPT_TIMEOUT => 30,
                    CURLOPT_USERAGENT => 'Mozilla/5.0',
                ]);
                curl_exec($ch);
                $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                fclose($fp);
                if ($httpCode >= 400 || !file_exists($localFile) || filesize($localFile) < 100) {
                    @unlink($localFile);
                    $localFile = null;
                }
            }

            if ($localFile && file_exists($localFile)) {
                $imageInfo = @getimagesize($localFile);
                if ($imageInfo && in_array($imageInfo['mime'], ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], true)) {
                    try {
                        $productWithImg = $productRepository->get($data['sku'], false, 0, true);
                        $productWithImg->setStoreId(0);
                        $productWithImg->setData('media_gallery', ['images' => [], 'values' => []]);
                        $productWithImg->setMediaGalleryEntries([]);
                        $productWithImg->addImageToMediaGallery($localFile, ['image', 'small_image', 'thumbnail'], false, false);
                        $productRepository->save($productWithImg);
                        echo "    [IMG] Image assigned\n";
                    } catch (\Throwable $imgErr) {
                        echo "    [WARN] Image failed: {$imgErr->getMessage()}\n";
                    }
                }
            }
        }
    } catch (\Throwable $e) {
        echo "  [ERROR] {$data['name']}: {$e->getMessage()}\n";
    }
}

// ---------------------------------------------------------------------------
// Categories data
// ---------------------------------------------------------------------------
echo "\n=== Creating categories ===\n";
$taiNgheCatId  = findOrCreateCategory($categoryFactory, $categoryRepository, $objectManager, 'Tai nghe', 'tai-nghe', $parentCategoryId);
$phuKienCatId  = findOrCreateCategory($categoryFactory, $categoryRepository, $objectManager, 'Phụ kiện', 'phu-kien', $parentCategoryId);

// ---------------------------------------------------------------------------
// Tai nghe — 10 products
// ---------------------------------------------------------------------------
$taiNgheProducts = [
    [
        'sku'              => 'TAI-NGHE-001',
        'name'             => 'Apple AirPods Pro 2 (USB-C)',
        'price'            => 6490000,
        'description'      => 'Apple AirPods Pro 2 với chip H2, chống ồn chủ động ANC thế hệ 2, âm thanh Spatial Audio, tích hợp sạc USB-C. Kháng nước IPX4, thời lượng pin 6 giờ.',
        'short_description'=> 'Tai nghe True Wireless Apple AirPods Pro 2, ANC, USB-C, IPX4',
        'image_url'        => 'https://fdn2.gsmarena.com/vv/bigpic/apple-airpods-pro-2nd-gen.jpg',
    ],
    [
        'sku'              => 'TAI-NGHE-002',
        'name'             => 'Samsung Galaxy Buds2 Pro',
        'price'            => 3490000,
        'description'      => 'Samsung Galaxy Buds2 Pro với chống ồn chủ động 3 micro, âm thanh Hi-Fi 24bit, tích hợp 360 Audio, kháng nước IPX7. Thời lượng pin 5 giờ (29 giờ với hộp sạc).',
        'short_description'=> 'Tai nghe TWS Samsung Galaxy Buds2 Pro, ANC 3-mic, Hi-Fi 24bit, IPX7',
        'image_url'        => 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-buds2-pro-.jpg',
    ],
    [
        'sku'              => 'TAI-NGHE-003',
        'name'             => 'Sony WF-1000XM5',
        'price'            => 5990000,
        'description'      => 'Sony WF-1000XM5 với chip QN2e mới nhất, chống ồn chủ động vô địch, âm thanh LDAC 990kbps, multipoint kết nối 2 thiết bị cùng lúc. IPX4, pin 8 giờ.',
        'short_description'=> 'Tai nghe TWS Sony WF-1000XM5, ANC hàng đầu, LDAC, Multipoint',
        'image_url'        => 'https://www.sony.com.vn/image/5d02da5df552836db894cead586eca00?fmt=pjpeg&wid=330&bgcolor=FFFFFF&bgc=FFFFFF',
    ],
    [
        'sku'              => 'TAI-NGHE-004',
        'name'             => 'Xiaomi Redmi Buds 5 Pro',
        'price'            => 1490000,
        'description'      => 'Xiaomi Redmi Buds 5 Pro với ANC 52dB, driver 11mm, Bluetooth 5.3, LHDC 5.0, pin 10 giờ liên tục (40 giờ với hộp sạc). Sạc nhanh 3 phút dùng 90 phút.',
        'short_description'=> 'Tai nghe TWS Xiaomi Redmi Buds 5 Pro, ANC 52dB, LHDC 5.0',
        'image_url'        => 'https://i01.appmifile.com/webfile/globalimg/products/m/redmi-buds-5-pro/overview-1.png',
    ],
    [
        'sku'              => 'TAI-NGHE-005',
        'name'             => 'OPPO Enco X2',
        'price'            => 2990000,
        'description'      => 'OPPO Enco X2 hợp tác cùng Dynaudio, driver kép 11mm + BA, chống ồn chủ động 45dB, Bluetooth 5.3, LHDC 5.0. Kháng nước IPX4, pin 6 giờ.',
        'short_description'=> 'Tai nghe TWS OPPO Enco X2 x Dynaudio, ANC 45dB, LHDC 5.0',
        'image_url'        => 'https://oimg.oppo.com/content/dam/oppo/product-asset-library/accessories/audio/enco-x2/v1/assets/PC/a1.png',
    ],
    [
        'sku'              => 'TAI-NGHE-006',
        'name'             => 'JBL Tune 230NC TWS',
        'price'            => 1290000,
        'description'      => 'JBL Tune 230NC TWS với JBL Pure Bass Sound, chống ồn chủ động, VoiceAware. Bluetooth 5.2, IPX4, pin 10 giờ (40 giờ với hộp sạc).',
        'short_description'=> 'Tai nghe TWS JBL Tune 230NC, Pure Bass, ANC, IPX4',
        'image_url'        => 'https://www.jbl.com/dw/image/v2/AAUJ_PRD/on/demandware.static/-/Sites-masterCatalog_Harman/default/dw3e3be5b1/JBL_TUNE230NCTWSBLK_Front-1_01.png',
    ],
    [
        'sku'              => 'TAI-NGHE-007',
        'name'             => 'Jabra Elite 5 TWS',
        'price'            => 2490000,
        'description'      => 'Jabra Elite 5 TWS với 6 micro, Hybrid ANC, Jabra Sound+ app, Spotify Tap. Bluetooth 5.2 Multipoint, IPX55, pin 7 giờ (36 giờ với hộp sạc).',
        'short_description'=> 'Tai nghe TWS Jabra Elite 5, Hybrid ANC 6-mic, IPX55',
        'image_url'        => 'https://www.jabra.com/~/media/Product%20Imagery/PLP%20images/100-99183000-02.png',
    ],
    [
        'sku'              => 'TAI-NGHE-008',
        'name'             => 'Bose QuietComfort Ultra Earbuds',
        'price'            => 7990000,
        'description'      => 'Bose QuietComfort Ultra Earbuds với CustomTune technology, Immersive Audio (Spatial), ANC hàng đầu, thời lượng pin 6 giờ (24 giờ với hộp sạc). IPX4.',
        'short_description'=> 'Tai nghe TWS Bose QC Ultra, Spatial Audio, ANC đỉnh cao',
        'image_url'        => 'https://assets.bose.com/content/dam/Bose_DAM/Web/consumer_electronics/global/products/headphones/qc_ultra_earbuds/product_silo_images/QCUltraEarbuds_Black_EC_Hero.png',
    ],
    [
        'sku'              => 'TAI-NGHE-009',
        'name'             => 'Sony WH-1000XM5',
        'price'            => 7490000,
        'description'      => 'Tai nghe chụp tai Sony WH-1000XM5 với 8 micro ANC đỉnh cao, Multipoint kết nối 2 thiết bị, LDAC 990kbps, Speak-to-Chat. Pin 30 giờ, sạc nhanh 3 phút = 3 giờ.',
        'short_description'=> 'Tai nghe chụp tai Sony WH-1000XM5, ANC 8-mic, LDAC, 30h',
        'image_url'        => 'https://www.sony.com.vn/image/a7640c8e334af03ea91c02ea3d1be3ec?fmt=pjpeg&wid=330&bgcolor=FFFFFF&bgc=FFFFFF',
    ],
    [
        'sku'              => 'TAI-NGHE-010',
        'name'             => 'Anker Soundcore Liberty 4 NC',
        'price'            => 1190000,
        'description'      => 'Anker Soundcore Liberty 4 NC với ANC 98.5%, LDAC, 6 micro ENC. Bluetooth 5.3, IPX4, pin 10 giờ (50 giờ với hộp sạc). Sạc nhanh USB-C.',
        'short_description'=> 'Tai nghe TWS Anker Soundcore Liberty 4 NC, ANC 98.5%, LDAC',
        'image_url'        => 'https://cdn.soundcore.com/upload/image/20230612/liberty4NC-s2.webp',
    ],
];

// ---------------------------------------------------------------------------
// Phụ kiện — 10 products
// ---------------------------------------------------------------------------
$phuKienProducts = [
    [
        'sku'              => 'PHU-KIEN-001',
        'name'             => 'Sạc nhanh 65W GaN USB-C PD',
        'price'            => 490000,
        'description'      => 'Củ sạc nhanh 65W GaN (Gallium Nitride) cổng USB-C PD, tương thích Apple PD, Qualcomm QC 4.0+, USB-PD 3.0. Nhỏ gọn, tản nhiệt tốt, an toàn với bảo vệ quá áp, quá nhiệt.',
        'short_description'=> 'Củ sạc 65W GaN USB-C PD, QC 4.0, nhỏ gọn',
        'image_url'        => 'https://cdn.mobilecity.vn/mobilecity-prod/images/2023/03/sac-nhanh-anker-nano-pro-65w-usb-c.jpg',
    ],
    [
        'sku'              => 'PHU-KIEN-002',
        'name'             => 'Cáp sạc USB-C to USB-C 1m 100W',
        'price'            => 190000,
        'description'      => 'Cáp USB-C to USB-C dài 1m, hỗ trợ sạc nhanh 100W (PD), truyền dữ liệu USB 3.2 Gen 2 (10Gbps). Bọc nylon chống rối, đầu nhôm, tương thích tất cả thiết bị USB-C.',
        'short_description'=> 'Cáp USB-C to USB-C 1m 100W, USB 3.2 10Gbps',
        'image_url'        => 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MQKJ3?wid=1144&hei=1144&fmt=jpeg&qlt=90&.v=1683157745521',
    ],
    [
        'sku'              => 'PHU-KIEN-003',
        'name'             => 'Kính cường lực iPhone 15 Pro Max 9H',
        'price'            => 150000,
        'description'      => 'Kính cường lực chống trầy cho iPhone 15 Pro Max, độ cứng 9H, độ trong 99.9%, chống vân tay oleophobic, keo AB tự động loại bọt khí. Viền cạnh full-cover.',
        'short_description'=> 'Kính cường lực 9H iPhone 15 Pro Max, full-cover chống vân tay',
        'image_url'        => 'https://cdn.mobilecity.vn/mobilecity-prod/images/2023/10/kinh-cuong-luc-iphone-15-pro-max.jpg',
    ],
    [
        'sku'              => 'PHU-KIEN-004',
        'name'             => 'Pin sạc dự phòng 20000mAh 22.5W',
        'price'            => 590000,
        'description'      => 'Pin sạc dự phòng 20000mAh, sạc ra 22.5W (USB-C + USB-A), sạc vào 20W USB-C. Hiển thị đèn LED 4 mức, nhỏ gọn. Có thể sạc đồng thời 2 thiết bị, pin Lithium polymer an toàn.',
        'short_description'=> 'Pin dự phòng 20000mAh, 22.5W, USB-C PD, sạc 2 thiết bị',
        'image_url'        => 'https://cdn.mobilecity.vn/mobilecity-prod/images/2022/09/pin-du-phong-xiaomi-20000mah-22.5w.jpg',
    ],
    [
        'sku'              => 'PHU-KIEN-005',
        'name'             => 'Ốp lưng MagSafe iPhone 15 Pro (Silicon)',
        'price'            => 390000,
        'description'      => 'Ốp lưng silicon từ tính MagSafe cho iPhone 15 Pro, hỗ trợ sạc không dây MagSafe 15W, chất liệu silicon mềm mại, chống trơn. 4 màu: đen, trắng, xanh navy, tím.',
        'short_description'=> 'Ốp lưng Silicon MagSafe iPhone 15 Pro, sạc không dây 15W',
        'image_url'        => 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MT0Y3?wid=1144&hei=1144&fmt=jpeg&qlt=90&.v=1693596486712',
    ],
    [
        'sku'              => 'PHU-KIEN-006',
        'name'             => 'Đế sạc không dây 3-in-1 MagSafe 15W',
        'price'            => 690000,
        'description'      => 'Đế sạc không dây 3-in-1 cho iPhone (MagSafe 15W) + Apple Watch (5W) + AirPods (5W). Chất liệu silicon, thiết kế gọn nhẹ, tương thích tất cả thiết bị Qi/MagSafe.',
        'short_description'=> 'Đế sạc không dây 3-in-1 MagSafe 15W iPhone + Watch + AirPods',
        'image_url'        => 'https://cdn.mobilecity.vn/mobilecity-prod/images/2023/10/de-sac-3-in-1-magsafe-15w.jpg',
    ],
    [
        'sku'              => 'PHU-KIEN-007',
        'name'             => 'Ốp lưng Samsung Galaxy S25 Ultra Rugged',
        'price'            => 350000,
        'description'      => 'Ốp lưng chống sốc Samsung Galaxy S25 Ultra chuẩn MIL-STD-810G, thiết kế 2 lớp TPU + PC, bảo vệ 4 góc, viền lưng texture. Tương thích sạc không dây.',
        'short_description'=> 'Ốp lưng chống sốc Samsung S25 Ultra, MIL-STD-810G, sạc không dây',
        'image_url'        => 'https://image-us.samsung.com/SamsungUS/home/mobile/galaxy-s/buy/galaxy-s25-ultra/02072025/EF-RS938CBEGUS_1_Black_531531531.jpg',
    ],
    [
        'sku'              => 'PHU-KIEN-008',
        'name'             => 'Cáp Lightning to USB-C 1m 27W MFi',
        'price'            => 250000,
        'description'      => 'Cáp Lightning to USB-C chứng nhận MFi Apple, hỗ trợ sạc nhanh 27W cho iPhone. Bọc bện nylon cao cấp, dài 1m, tương thích iPhone 5 đến iPhone 14 series.',
        'short_description'=> 'Cáp Lightning USB-C 27W MFi Apple, bọc nylon 1m',
        'image_url'        => 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MQGH2?wid=1144&hei=1144&fmt=jpeg&qlt=90&.v=1681841876931',
    ],
    [
        'sku'              => 'PHU-KIEN-009',
        'name'             => 'Kính cường lực Samsung Galaxy S25 Ultra',
        'price'            => 180000,
        'description'      => 'Kính cường lực Samsung Galaxy S25 Ultra độ cứng 9H, keo UV full-cover viền cạnh cong, chống va đập 4 góc. Độ trong 99%, chống vân tay, bộ gồm 2 miếng.',
        'short_description'=> 'Kính cường lực 9H Samsung Galaxy S25 Ultra, UV full-cover',
        'image_url'        => 'https://image-us.samsung.com/SamsungUS/home/mobile/galaxy-s/buy/galaxy-s25-ultra/02072025/EF-US928CTEGUS_1_Clear_531531531.jpg',
    ],
    [
        'sku'              => 'PHU-KIEN-010',
        'name'             => 'Bộ sạc nhanh iPhone 20W USB-C + Cáp',
        'price'            => 350000,
        'description'      => 'Bộ sạc nhanh 20W USB-C PD cho iPhone + cáp USB-C to Lightning 1m MFi. Tương thích tất cả iPhone từ iPhone 8 trở lên. Thiết kế nhỏ gọn, hỗ trợ sạc MacBook Air công suất thấp.',
        'short_description'=> 'Bộ sạc 20W USB-C + Cáp Lightning 1m MFi cho iPhone',
        'image_url'        => 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MHJA3?wid=1144&hei=1144&fmt=jpeg&qlt=90&.v=1603732290000',
    ],
];

// ---------------------------------------------------------------------------
// Create products
// ---------------------------------------------------------------------------
echo "\n=== Creating Tai nghe products ===\n";
foreach ($taiNgheProducts as $p) {
    createProduct($productFactory, $productRepository, $objectManager, $p, $taiNgheCatId, $targetStoreIds);
}

echo "\n=== Creating Phu kien products ===\n";
foreach ($phuKienProducts as $p) {
    createProduct($productFactory, $productRepository, $objectManager, $p, $phuKienCatId, $targetStoreIds);
}

echo "\n=== Done! ===\n";
echo "Tai nghe category ID: {$taiNgheCatId}\n";
echo "Phu kien category ID: {$phuKienCatId}\n";
echo "Run: bin/magento indexer:reindex && bin/magento cache:flush\n";
