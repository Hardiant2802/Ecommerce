<?php
declare(strict_types=1);

use Magento\Catalog\Api\CategoryRepositoryInterface;
use Magento\Catalog\Api\ProductRepositoryInterface;
use Magento\Catalog\Model\CategoryFactory;
use Magento\Catalog\Model\Product;
use Magento\Catalog\Model\Product\Attribute\Source\Status;
use Magento\Catalog\Model\Product\Visibility;
use Magento\Catalog\Model\ProductFactory;
use Magento\Catalog\Model\ResourceModel\Category\CollectionFactory as CategoryCollectionFactory;
use Magento\Framework\App\Bootstrap;
use Magento\Framework\App\State;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Store\Model\StoreManagerInterface;

require __DIR__ . '/../../app/bootstrap.php';

$bootstrap = Bootstrap::create(BP, $_SERVER);
$objectManager = $bootstrap->getObjectManager();

/** @var State $appState */
$appState = $objectManager->get(State::class);
try {
    $appState->setAreaCode('adminhtml');
} catch (LocalizedException $e) {
    // Area code is already initialized.
}

/** @var StoreManagerInterface $storeManager */
$storeManager = $objectManager->get(StoreManagerInterface::class);
/** @var CategoryFactory $categoryFactory */
$categoryFactory = $objectManager->get(CategoryFactory::class);
/** @var CategoryCollectionFactory $categoryCollectionFactory */
$categoryCollectionFactory = $objectManager->get(CategoryCollectionFactory::class);
/** @var CategoryRepositoryInterface $categoryRepository */
$categoryRepository = $objectManager->get(CategoryRepositoryInterface::class);
/** @var ProductFactory $productFactory */
$productFactory = $objectManager->get(ProductFactory::class);
/** @var ProductRepositoryInterface $productRepository */
$productRepository = $objectManager->get(ProductRepositoryInterface::class);

$rootCategoryId = (int)$storeManager->getStore()->getRootCategoryId();
$websiteId = (int)$storeManager->getStore()->getWebsiteId();
$attributeSetId = 4;

$subcategoryNames = [
    'Android Flagship',
    'Android Midrange',
    'Android Budget',
    'iOS Devices',
    'Gaming Phones',
    'Camera Phones',
    'Battery Phones',
    'Compact Phones',
    'Business Phones',
    'Student Phones',
];

$brandCategories = [
    'apple' => 'Apple',
    'samsung' => 'Samsung',
    'xiaomi' => 'Xiaomi',
    'oppo' => 'Oppo',
    'oneplus' => 'OnePlus',
    'vivo' => 'Vivo',
    'asus' => 'Asus',
    'red-magic' => 'Red Magic',
];

$slugify = static function (string $value): string {
    $slug = strtolower(trim($value));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';

    return trim($slug, '-');
};

$getOrCreateCategory = static function (
    string $name,
    int $parentId,
    string $urlKey
) use (
    $categoryCollectionFactory,
    $categoryFactory,
    $categoryRepository
): int {
    $collection = $categoryCollectionFactory->create();
    $collection->addAttributeToSelect('name');
    $collection->addAttributeToFilter('parent_id', $parentId);
    $collection->addAttributeToFilter('name', $name);
    $collection->setPageSize(1);

    $existing = $collection->getFirstItem();
    if ($existing && $existing->getId()) {
        return (int)$existing->getId();
    }

    $category = $categoryFactory->create();
    $category->setName($name);
    $category->setParentId($parentId);
    $category->setIsActive(true);
    $category->setIncludeInMenu(true);
    $category->setIsAnchor(true);
    $category->setUrlKey($urlKey);

    $saved = $categoryRepository->save($category);

    return (int)$saved->getId();
};

$parentCategoryName = 'Demo Catalog 2026';
$parentCategoryId = $getOrCreateCategory(
    $parentCategoryName,
    $rootCategoryId,
    $slugify($parentCategoryName)
);

$createdProducts = 0;
$updatedProducts = 0;

foreach ($subcategoryNames as $index => $subcategoryName) {
    $subcategoryId = $getOrCreateCategory(
        $subcategoryName,
        $parentCategoryId,
        $slugify($subcategoryName)
    );

    for ($productIndex = 1; $productIndex <= 10; $productIndex++) {
        $categoryNumber = $index + 1;
        $sku = sprintf('DEMO-C%02d-P%02d', $categoryNumber, $productIndex);
        $name = sprintf('%s Phone %02d', $subcategoryName, $productIndex);
        $urlKey = strtolower($sku);
        $price = (float)(500 + ($categoryNumber * 30) + $productIndex);

        $isNew = false;
        try {
            $product = $productRepository->get($sku, false, null, true);
        } catch (NoSuchEntityException $e) {
            $isNew = true;
            $product = $productFactory->create();
            $product->setSku($sku);
            $product->setTypeId(Product\Type::TYPE_SIMPLE);
            $product->setAttributeSetId($attributeSetId);
            $product->setStatus(Status::STATUS_ENABLED);
            $product->setVisibility(Visibility::VISIBILITY_BOTH);
            $product->setTaxClassId(2);
            $product->setWeight(0.2);
        }

        $currentCategoryIds = $product->getCategoryIds() ?: [];
        $newCategoryIds = array_values(array_unique(array_merge($currentCategoryIds, [$parentCategoryId, $subcategoryId])));

        $product->setName($name);
        $product->setUrlKey($urlKey);
        $product->setPrice($price);
        $product->setWebsiteIds([$websiteId]);
        $product->setCategoryIds($newCategoryIds);
        $product->setDescription('Demo smartphone for project requirement validation.');
        $product->setShortDescription('Demo smartphone for catalog testing.');
        $product->setStockData([
            'use_config_manage_stock' => 0,
            'manage_stock' => 1,
            'is_in_stock' => 1,
            'qty' => 100,
            'min_qty' => 0,
        ]);
        $product->setQuantityAndStockStatus([
            'qty' => 100,
            'is_in_stock' => 1,
        ]);

        $productRepository->save($product);

        if ($isNew) {
            $createdProducts++;
        } else {
            $updatedProducts++;
        }
    }
}

$brandParentName = 'Phone Brands';
$brandParentId = $getOrCreateCategory(
    $brandParentName,
    $rootCategoryId,
    $slugify($brandParentName)
);

foreach ($brandCategories as $brandSlug => $brandLabel) {
    $brandCategoryId = $getOrCreateCategory(
        $brandLabel,
        $brandParentId,
        $brandSlug
    );

    for ($productIndex = 1; $productIndex <= 10; $productIndex++) {
        $sku = sprintf('BRAND-%s-%02d', strtoupper(str_replace('-', '', $brandSlug)), $productIndex);
        $name = sprintf('%s Demo Phone %02d', $brandLabel, $productIndex);
        $urlKey = strtolower($sku);
        $price = (float)(600 + ($productIndex * 15));

        $isNew = false;
        try {
            $product = $productRepository->get($sku, false, null, true);
        } catch (NoSuchEntityException $e) {
            $isNew = true;
            $product = $productFactory->create();
            $product->setSku($sku);
            $product->setTypeId(Product\Type::TYPE_SIMPLE);
            $product->setAttributeSetId($attributeSetId);
            $product->setStatus(Status::STATUS_ENABLED);
            $product->setVisibility(Visibility::VISIBILITY_BOTH);
            $product->setTaxClassId(2);
            $product->setWeight(0.2);
        }

        $currentCategoryIds = $product->getCategoryIds() ?: [];
        $newCategoryIds = array_values(array_unique(array_merge($currentCategoryIds, [$brandParentId, $brandCategoryId])));

        $product->setName($name);
        $product->setUrlKey($urlKey);
        $product->setPrice($price);
        $product->setWebsiteIds([$websiteId]);
        $product->setCategoryIds($newCategoryIds);
        $product->setDescription('Brand demo smartphone for frontend brand filtering.');
        $product->setShortDescription('Brand demo smartphone.');
        $product->setStockData([
            'use_config_manage_stock' => 0,
            'manage_stock' => 1,
            'is_in_stock' => 1,
            'qty' => 100,
            'min_qty' => 0,
        ]);
        $product->setQuantityAndStockStatus([
            'qty' => 100,
            'is_in_stock' => 1,
        ]);

        $productRepository->save($product);

        if ($isNew) {
            $createdProducts++;
        } else {
            $updatedProducts++;
        }
    }
}

echo sprintf("Created products: %d\n", $createdProducts);
echo sprintf("Updated products: %d\n", $updatedProducts);
echo sprintf("Created/ensured subcategories: %d\n", count($subcategoryNames));
echo sprintf("Created/ensured brand categories: %d\n", count($brandCategories));
echo "Done. Run bin/magento indexer:reindex and bin/magento cache:flush if needed.\n";