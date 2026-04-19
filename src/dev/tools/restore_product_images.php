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
    // Area code is already set.
}

/** @var ProductCollectionFactory $productCollectionFactory */
$productCollectionFactory = $objectManager->get(ProductCollectionFactory::class);
/** @var ProductRepositoryInterface $productRepository */
$productRepository = $objectManager->get(ProductRepositoryInterface::class);

$collection = $productCollectionFactory->create();
$collection->addAttributeToSelect(['sku', 'image', 'small_image', 'thumbnail', 'media_gallery']);
$collection->setPageSize(5000);

$processed = 0;
$updated = 0;
$skipped = 0;
$errors = 0;

foreach ($collection as $item) {
    $processed++;
    $sku = (string)$item->getSku();

    try {
        $product = $productRepository->get($sku, false, 0, true);
        $entries = $product->getMediaGalleryEntries();

        if (!is_array($entries) || count($entries) === 0) {
            $skipped++;
            continue;
        }

        $currentImage = (string)$product->getData('image');
        $currentSmall = (string)$product->getData('small_image');
        $currentThumb = (string)$product->getData('thumbnail');

        $needsImage = ($currentImage === '' || $currentImage === 'no_selection');
        $needsSmall = ($currentSmall === '' || $currentSmall === 'no_selection');
        $needsThumb = ($currentThumb === '' || $currentThumb === 'no_selection');

        if (!$needsImage && !$needsSmall && !$needsThumb) {
            $skipped++;
            continue;
        }

        $firstEnabledFile = null;
        foreach ($entries as $entry) {
            if ($entry->isDisabled()) {
                continue;
            }
            $file = (string)$entry->getFile();
            if ($file !== '') {
                $firstEnabledFile = $file;
                break;
            }
        }

        if ($firstEnabledFile === null) {
            $skipped++;
            continue;
        }

        if ($needsImage) {
            $product->setData('image', $firstEnabledFile);
        }
        if ($needsSmall) {
            $product->setData('small_image', $firstEnabledFile);
        }
        if ($needsThumb) {
            $product->setData('thumbnail', $firstEnabledFile);
        }

        $productRepository->save($product);
        $updated++;
    } catch (Throwable $e) {
        $errors++;
        echo sprintf("[ERROR] SKU %s: %s\n", $sku, $e->getMessage());
    }
}

echo sprintf(
    "Done. processed=%d updated=%d skipped=%d errors=%d\n",
    $processed,
    $updated,
    $skipped,
    $errors
);
