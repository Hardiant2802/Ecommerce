<?php
declare(strict_types=1);

use Magento\Catalog\Api\ProductRepositoryInterface;
use Magento\Catalog\Model\ResourceModel\Product\CollectionFactory as ProductCollectionFactory;
use Magento\Framework\App\Bootstrap;
use Magento\Framework\App\ResourceConnection;
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
} catch (LocalizedException $e) {
    // Area code already set.
}

/** @var ProductCollectionFactory $productCollectionFactory */
$productCollectionFactory = $objectManager->get(ProductCollectionFactory::class);
/** @var ProductRepositoryInterface $productRepository */
$productRepository = $objectManager->get(ProductRepositoryInterface::class);
/** @var StoreManagerInterface $storeManager */
$storeManager = $objectManager->get(StoreManagerInterface::class);
/** @var ResourceConnection $resourceConnection */
$resourceConnection = $objectManager->get(ResourceConnection::class);
$db = $resourceConnection->getConnection();

$targetStoreIds = [0];
foreach ($storeManager->getStores() as $store) {
    $targetStoreIds[] = (int)$store->getId();
}
$targetStoreIds = array_values(array_unique($targetStoreIds));

$seedApis = [
    'https://dummyjson.com/products/category/smartphones?limit=100',
    'https://dummyjson.com/products/search?q=iphone&limit=30',
    'https://dummyjson.com/products/search?q=samsung&limit=30',
    'https://dummyjson.com/products/search?q=xiaomi&limit=30',
    'https://dummyjson.com/products/search?q=oppo&limit=30',
    'https://dummyjson.com/products/search?q=vivo&limit=30',
    'https://dummyjson.com/products/search?q=oneplus&limit=30',
    'https://dummyjson.com/products/search?q=asus&limit=30',
    'https://dummyjson.com/products/search?q=redmagic&limit=30',
];

$brandKeyMap = [
    'apple' => 'apple',
    'iphone' => 'apple',
    'samsung' => 'samsung',
    'xiaomi' => 'xiaomi',
    'redmi' => 'xiaomi',
    'oppo' => 'oppo',
    'vivo' => 'vivo',
    'oneplus' => 'oneplus',
    'asus' => 'asus',
    'redmagic' => 'red-magic',
    'red-magic' => 'red-magic',
    'nubia' => 'red-magic',
];

$brandDisplayNames = [
    'apple' => 'Apple',
    'samsung' => 'Samsung',
    'xiaomi' => 'Xiaomi',
    'oppo' => 'Oppo',
    'oneplus' => 'OnePlus',
    'vivo' => 'Vivo',
    'asus' => 'Asus',
    'red-magic' => 'Red Magic',
];

$brandModelCatalog = [
    'apple' => ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15', 'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14', 'iPhone 13', 'iPhone 12', 'iPhone SE (2022)'],
    'samsung' => ['Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy S23 Ultra', 'Galaxy S23', 'Galaxy Z Fold5', 'Galaxy Z Flip5', 'Galaxy A55', 'Galaxy A35', 'Galaxy M55'],
    'xiaomi' => ['Xiaomi 14 Ultra', 'Xiaomi 14 Pro', 'Xiaomi 14', 'Redmi Note 13 Pro+', 'Redmi Note 13 Pro', 'Redmi Note 13', 'Xiaomi 13T Pro', 'POCO F6 Pro', 'POCO X6 Pro', 'POCO M6 Pro'],
    'oppo' => ['Oppo Find X7 Ultra', 'Oppo Find X7', 'Oppo Reno 11 Pro', 'Oppo Reno 11', 'Oppo Reno 10 Pro+', 'Oppo A98 5G', 'Oppo A79 5G', 'Oppo A78', 'Oppo A58', 'Oppo A38'],
    'oneplus' => ['OnePlus 12', 'OnePlus 12R', 'OnePlus Open', 'OnePlus 11', 'OnePlus 11R', 'OnePlus Nord 4', 'OnePlus Nord CE 4', 'OnePlus Nord 3', 'OnePlus Nord CE 3', 'OnePlus Ace 3'],
    'vivo' => ['Vivo X100 Pro', 'Vivo X100', 'Vivo X90 Pro', 'Vivo V30 Pro', 'Vivo V30', 'Vivo V29', 'Vivo Y200', 'Vivo Y100', 'Vivo Y36', 'Vivo Y28'],
    'asus' => ['Asus ROG Phone 8 Pro', 'Asus ROG Phone 8', 'Asus ROG Phone 7 Ultimate', 'Asus ROG Phone 7', 'Asus Zenfone 11 Ultra', 'Asus Zenfone 10', 'Asus Zenfone 9', 'Asus ROG Phone 6D', 'Asus ROG Phone 6', 'Asus Zenfone 8'],
    'red-magic' => ['Red Magic 9 Pro+', 'Red Magic 9 Pro', 'Red Magic 8S Pro', 'Red Magic 8 Pro', 'Red Magic 7S Pro', 'Red Magic 7 Pro', 'Red Magic 7', 'Red Magic 6S Pro', 'Red Magic 6 Pro', 'Red Magic 6'],
];

$brandBasePrice = [
    'apple' => 999,
    'samsung' => 899,
    'xiaomi' => 599,
    'oppo' => 499,
    'oneplus' => 649,
    'vivo' => 449,
    'asus' => 799,
    'red-magic' => 749,
];

$brandImagePool = [
    'apple' => [
        'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro-max.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-plus.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14-pro-max-.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-12.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-se-2022.jpg',
    ],
    'samsung' => [
        'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-ultra-5g-sm-s928.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-plus-5g-sm-s926.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-5g-sm-s921.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-ultra-5g.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-5g.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold5-5g.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip5-5g.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a55.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a35.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-m55.jpg',
    ],
    'xiaomi' => [
        'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-13-pro-plus.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-13-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-13.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-13t-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-poco-f6-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-poco-x6-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/poco-m6-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-13t.jpg',
    ],
    'oppo' => [
        'https://fdn2.gsmarena.com/vv/bigpic/oppo-find-x7-ultra.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oppo-find-x7.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oppo-reno11-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oppo-reno11.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oppo-reno10-pro-plus.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oppo-a98.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oppo-a79.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oppo-a78-4g.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oppo-a58.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oppo-a38.jpg',
    ],
    'oneplus' => [
        'https://fdn2.gsmarena.com/vv/bigpic/oneplus-12.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oneplus-12r.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oneplus-11.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oneplus-ace3.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oneplus-ace-2-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oneplus-nord-2t.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oneplus-nord.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oneplus-12.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oneplus-12r.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/oneplus-11.jpg',
    ],
    'vivo' => [
        'https://fdn2.gsmarena.com/vv/bigpic/vivo-x100-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/vivo-x100.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/vivo-x90-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/vivo-v30-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/vivo-v30.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/vivo-v29.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/vivo-y200.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/vivo-y100.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/vivo-y36.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/vivo-y28.jpg',
    ],
    'asus' => [
        'https://fdn2.gsmarena.com/vv/bigpic/asus-rog-phone-8-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/asus-rog-phone-8.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/asus-rog-phone-7-ultimate.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/asus-rog-phone-7.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/asus-zenfone-11-ultra.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/asus-zenfone10.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/asus-zenfone-9.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/asus-rog-phone-6d.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/asus-rog-phone-6.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/asus-zenfone8.jpg',
    ],
    'red-magic' => [
        'https://fdn2.gsmarena.com/vv/bigpic/zte-nubia-red-magic-8-pro-plus.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/zte-nubia-red-magic-8s-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/zte-nubia-red-magic-8-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/zte-nubia-red-magic-7s-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/zte-nubia-red-magic-7-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/zte-nubia-red-magic-7.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/zte-nubia-red-magic-6r.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/zte-nubia-red-magic-6-pro.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/zte-nubia-red-magic-6.jpg',
        'https://fdn2.gsmarena.com/vv/bigpic/zte-nubia-red-magic-8-pro.jpg',
    ],
];

$downloadDir = BP . '/pub/media/import/phone-seed-images';
if (!is_dir($downloadDir) && !mkdir($downloadDir, 0775, true) && !is_dir($downloadDir)) {
    throw new RuntimeException('Cannot create image download directory: ' . $downloadDir);
}

$httpGetJson = static function (string $url): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    ]);
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (!$raw || $status >= 400) {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
};

$downloadImage = static function (string $url, string $destination): bool {
    $ch = curl_init($url);
    $fp = fopen($destination, 'wb');
    if (!$fp) {
        return false;
    }

    curl_setopt_array($ch, [
        CURLOPT_FILE => $fp,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    ]);

    $ok = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    fclose($fp);

    if (!$ok || $status >= 400) {
        @unlink($destination);
        return false;
    }

    return true;
};

$prepareSupportedImage = static function (string $filePath): ?string {
    if (!file_exists($filePath)) {
        return null;
    }

    $imageInfo = @getimagesize($filePath);
    $mime = strtolower((string)($imageInfo['mime'] ?? ''));
    if ($mime === '') {
        return null;
    }

    if (in_array($mime, ['image/jpeg', 'image/png', 'image/gif'], true)) {
        return $filePath;
    }

    if ($mime === 'image/webp' && function_exists('imagecreatefromwebp') && function_exists('imagejpeg')) {
        $resource = @imagecreatefromwebp($filePath);
        if (!$resource) {
            return null;
        }

        $jpegPath = preg_replace('/\.[^.]+$/', '.jpg', $filePath) ?: ($filePath . '.jpg');
        $converted = @imagejpeg($resource, $jpegPath, 90);
        imagedestroy($resource);

        if ($converted) {
            return $jpegPath;
        }
    }

    return null;
};

$normalizeBrandKey = static function (string $brand, string $title) use ($brandKeyMap): string {
    $haystack = strtolower(trim($brand . ' ' . $title));
    foreach ($brandKeyMap as $needle => $brandKey) {
        if (strpos($haystack, $needle) !== false) {
            return $brandKey;
        }
    }

    return 'generic';
};

$slugify = static function (string $value): string {
    $slug = strtolower(trim($value));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
    return trim($slug, '-');
};

$allSeeds = [];
$seedByBrand = [];

foreach ($seedApis as $api) {
    $data = $httpGetJson($api);
    $items = $data['products'] ?? [];
    if (!is_array($items)) {
        continue;
    }

    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }

        $title = trim((string)($item['title'] ?? ''));
        $brand = trim((string)($item['brand'] ?? ''));
        $description = trim((string)($item['description'] ?? ''));
        $price = (float)($item['price'] ?? 0);
        $thumbnail = trim((string)($item['thumbnail'] ?? ''));

        if ($title === '' || $price <= 0 || $thumbnail === '') {
            continue;
        }

        $seedId = (string)($item['id'] ?? md5($title . '|' . $brand));
        $uniqueKey = strtolower($title . '|' . $brand);
        if (isset($allSeeds[$uniqueKey])) {
            continue;
        }

        $seed = [
            'seed_id' => $seedId,
            'title' => $title,
            'brand' => $brand,
            'description' => $description,
            'price' => $price,
            'image_url' => $thumbnail,
        ];

        $allSeeds[$uniqueKey] = $seed;

        $brandKey = $normalizeBrandKey($brand, $title);
        if (!isset($seedByBrand[$brandKey])) {
            $seedByBrand[$brandKey] = [];
        }
        $seedByBrand[$brandKey][] = $seed;
    }
}

$seedPool = array_values($allSeeds);
if (count($seedPool) < 10) {
    throw new RuntimeException('Not enough phone seed data fetched from public APIs.');
}

/** @var \Magento\Catalog\Model\ResourceModel\Product\Collection $products */
$products = $productCollectionFactory->create();
$products->addAttributeToSelect(['sku', 'name', 'url_key']);
$products->addAttributeToFilter([
    ['attribute' => 'sku', 'like' => 'DEMO-%'],
    ['attribute' => 'sku', 'like' => 'BRAND-%'],
]);
$products->setOrder('entity_id', 'ASC');

$globalPointer = 0;
$brandPointers = [];
$nameUsage = [];
$updated = 0;
$withImage = 0;
$imageFailed = 0;

foreach ($products as $productItem) {
    $sku = (string)$productItem->getSku();
    $brandKey = 'generic';
    $skuIndex = 1;

    if (strpos($sku, 'BRAND-') === 0) {
        $parts = explode('-', $sku);
        if (count($parts) >= 3) {
            $raw = strtolower($parts[1]);
            if ($raw === 'redmagic') {
                $raw = 'red-magic';
            }
            $brandKey = $raw;
        }

        if (preg_match('/-(\d{2})$/', $sku, $matches) === 1) {
            $skuIndex = max(1, (int)$matches[1]);
        }
    }

    $candidates = $seedByBrand[$brandKey] ?? $seedPool;
    if (!isset($brandPointers[$brandKey])) {
        $brandPointers[$brandKey] = 0;
    }

    $seed = $candidates[$brandPointers[$brandKey] % count($candidates)] ?? $seedPool[$globalPointer % count($seedPool)];
    $brandPointers[$brandKey]++;
    $globalPointer++;

    $nameBase = trim((string)$seed['title']);
    if (strpos($sku, 'BRAND-') === 0 && isset($brandModelCatalog[$brandKey])) {
        $modelList = $brandModelCatalog[$brandKey];
        $nameBase = $modelList[($skuIndex - 1) % count($modelList)];
        $displayBrand = $brandDisplayNames[$brandKey] ?? ucfirst($brandKey);
        if (stripos($nameBase, $displayBrand) === false) {
            $nameBase = $displayBrand . ' ' . $nameBase;
        }
    }

    $nameCount = ($nameUsage[$nameBase] ?? 0) + 1;
    $nameUsage[$nameBase] = $nameCount;
    $name = (strpos($sku, 'BRAND-') === 0)
        ? $nameBase
        : ($nameCount > 1 ? sprintf('%s (%02d)', $nameBase, $nameCount) : $nameBase);

    $urlKey = $slugify($name . '-' . strtolower(str_replace('_', '-', $sku)));
    $price = max(99, (float)$seed['price']);
    if (strpos($sku, 'BRAND-') === 0) {
        $base = $brandBasePrice[$brandKey] ?? 399;
        $price = (float)($base + (($skuIndex % 10) * 20));
    }
    $description = trim((string)$seed['description']);
    if ($description === '') {
        $description = 'Modern smartphone with reliable performance and premium build quality.';
    }

    foreach ($targetStoreIds as $storeId) {
        $product = $productRepository->get($sku, false, $storeId, true);
        $product->setStoreId($storeId);
        $product->setName($name);
        $product->setUrlKey($urlKey);
        $product->setDescription($description);
        $product->setShortDescription($description);
        if ($storeId === 0) {
            $product->setPrice($price);
        }
        $productRepository->save($product);
    }
    $updated++;

    $imageUrl = (string)$seed['image_url'];
    $targetFile = '';
    if (strpos($sku, 'BRAND-') === 0 && isset($brandImagePool[$brandKey])) {
        $pool = $brandImagePool[$brandKey];
        $imageUrl = $pool[($skuIndex - 1) % count($pool)];
        $targetFile = $downloadDir . '/' . strtolower(str_replace('_', '-', $sku)) . '.jpg';
        if (file_exists($targetFile)) {
            @unlink($targetFile);
        }
    } else {
        $fileSlug = $slugify((string)$seed['brand'] . '-' . (string)$seed['title'] . '-' . (string)$seed['seed_id']);
        $targetFile = $downloadDir . '/' . $fileSlug . '.jpg';
    }

    if (!file_exists($targetFile)) {
        $downloadImage($imageUrl, $targetFile);
    }

    $finalImage = $prepareSupportedImage($targetFile);
    if ($finalImage) {
        try {
            $productWithImage = $productRepository->get($sku, false, 0, true);
            $productWithImage->setStoreId(0);
            $productWithImage->setData('media_gallery', ['images' => [], 'values' => []]);
            $productWithImage->setMediaGalleryEntries([]);
            $productWithImage->addImageToMediaGallery($finalImage, null, false, false);
            $productRepository->save($productWithImage);

            $newImagePath = (string)$db->fetchOne(
                "SELECT mg.value
                 FROM catalog_product_entity cpe
                 JOIN catalog_product_entity_media_gallery_value_to_entity l ON l.entity_id = cpe.entity_id
                 JOIN catalog_product_entity_media_gallery mg ON mg.value_id = l.value_id
                 WHERE cpe.sku = :sku
                 ORDER BY mg.value_id DESC
                 LIMIT 1",
                ['sku' => $sku]
            );

            if ($newImagePath !== '') {
                $productRoot = $productRepository->get($sku, false, 0, true);
                $productRoot->setStoreId(0);
                $productRoot->setImage($newImagePath);
                $productRoot->setSmallImage($newImagePath);
                $productRoot->setThumbnail($newImagePath);
                $productRepository->save($productRoot);

                foreach ($targetStoreIds as $storeId) {
                    if ($storeId === 0) {
                        continue;
                    }

                    $productInStore = $productRepository->get($sku, false, $storeId, true);
                    $productInStore->setStoreId($storeId);
                    $productInStore->setImage($newImagePath);
                    $productInStore->setSmallImage($newImagePath);
                    $productInStore->setThumbnail($newImagePath);
                    $productRepository->save($productInStore);
                }
            }

            $withImage++;
        } catch (\Throwable $e) {
            $imageFailed++;
            echo sprintf("[warn] image skipped for %s: %s\n", $sku, $e->getMessage());
        }
    }
}

echo sprintf("Seed phones fetched: %d\n", count($seedPool));
echo sprintf("Products updated: %d\n", $updated);
echo sprintf("Products updated with image: %d\n", $withImage);
echo sprintf("Products failed image assignment: %d\n", $imageFailed);
echo "Done. Run indexer:reindex and cache:flush.\n";
