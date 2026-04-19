<?php
declare(strict_types=1);

use Magento\Catalog\Api\ProductRepositoryInterface;
use Magento\Catalog\Model\ResourceModel\Product\CollectionFactory as ProductCollectionFactory;
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

/** @var ProductCollectionFactory $productCollectionFactory */
$productCollectionFactory = $objectManager->get(ProductCollectionFactory::class);
/** @var ProductRepositoryInterface $productRepository */
$productRepository = $objectManager->get(ProductRepositoryInterface::class);

$products = $productCollectionFactory->create();
$products->addAttributeToSelect(['sku', 'name', 'description', 'short_description']);
$products->addAttributeToFilter([
    ['attribute' => 'sku', 'like' => 'BRAND-%'],
    ['attribute' => 'sku', 'like' => 'DEMO-%'],
]);
$products->setOrder('entity_id', 'ASC');

$updated = 0;
$skipped = 0;

foreach ($products as $productItem) {
    $sku = (string)$productItem->getSku();
    $name = trim((string)$productItem->getName());
    $description = trim((string)$productItem->getDescription());

    if ($name === '') {
        $skipped++;
        continue;
    }

    if ($description !== '' && stripos($description, $name) !== false) {
        $skipped++;
        continue;
    }

    $newDescription = sprintf(
        '%s la mau dien thoai chinh hang voi thiet ke hien dai, hieu nang on dinh va trai nghiem su dung muot ma. San pham phu hop cho nhu cau hoc tap, lam viec va giai tri hang ngay.',
        $name
    );

    $product = $productRepository->get($sku, false, 0, true);
    $product->setStoreId(0);
    $product->setDescription($newDescription);
    $product->setShortDescription($newDescription);
    $productRepository->save($product);

    $updated++;
}

echo sprintf("Products updated: %d\n", $updated);
echo sprintf("Products skipped: %d\n", $skipped);
echo "Done.\n";
<?php
declare(strict_types=1);

use Magento\Catalog\Api\ProductRepositoryInterface;
use Magento\Catalog\Model\ResourceModel\Product\CollectionFactory as ProductCollectionFactory;
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
} catch (LocalizedException $e) {
    // Area code already set.
}

/** @var ProductCollectionFactory $productCollectionFactory */
$productCollectionFactory = $objectManager->get(ProductCollectionFactory::class);
/** @var ProductRepositoryInterface $productRepository */
$productRepository = $objectManager->get(ProductRepositoryInterface::class);
/** @var StoreManagerInterface $storeManager */
$storeManager = $objectManager->get(StoreManagerInterface::class);

$targetStoreIds = [0];
foreach ($storeManager->getStores() as $store) {
    $targetStoreIds[] = (int)$store->getId();
}
$targetStoreIds = array_values(array_unique($targetStoreIds));

$products = $productCollectionFactory->create();
$products->addAttributeToSelect(['sku', 'name', 'description', 'short_description']);
$products->addAttributeToFilter([
    ['attribute' => 'sku', 'like' => 'BRAND-%'],
    ['attribute' => 'sku', 'like' => 'DEMO-%'],
]);
$products->setOrder('entity_id', 'ASC');

$updated = 0;
$skipped = 0;

foreach ($products as $productItem) {
    $sku = (string)$productItem->getSku();
    $name = trim((string)$productItem->getName());
    $description = trim((string)$productItem->getDescription());

    if ($name === '') {
        $skipped++;
        continue;
    }

    // If current description already mentions product name, keep it.
    if ($description !== '' && stripos($description, $name) !== false) {
        $skipped++;
        continue;
    }

    $newDescription = sprintf(
        '%s la mau dien thoai chinh hang voi thiet ke hien dai, hieu nang on dinh va trai nghiem su dung muot ma. San pham phu hop cho nhu cau hoc tap, lam viec va giai tri hang ngay.',
        $name
    );

    foreach ($targetStoreIds as $storeId) {
        $product = $productRepository->get($sku, false, $storeId, true);
        $product->setStoreId($storeId);
        $product->setDescription($newDescription);
        $product->setShortDescription($newDescription);
        $productRepository->save($product);
    }

    $updated++;
}

echo sprintf("Products updated: %d\n", $updated);
echo sprintf("Products skipped: %d\n", $skipped);
echo "Done. Run cache:flush if needed.\n";
