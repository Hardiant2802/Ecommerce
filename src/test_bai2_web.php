<?php

require __DIR__ . '/app/bootstrap.php';

use Magento\Framework\App\Bootstrap;

$bootstrap = Bootstrap::create(BP, $_SERVER);
$objectManager = $bootstrap->getObjectManager();

try {
    $state = $objectManager->get('Magento\Framework\App\State');
    $state->setAreaCode('frontend');
    
    // Test Bai2 Module
    $timestamp = time();
    $banner = $objectManager->create('TMDT\Bai2\Model\Banner');
    $banner->addData([
        'image' => 'web-banner-' . $timestamp . '.jpg',
        'link' => 'http://example.com/web-test-' . $timestamp,
        'sort_order' => rand(1, 100),
        'status' => 1
    ])->save();
    
    echo "<h2>✅ TMDT Bai2 Module Test</h2>";
    echo "<p><strong>Banner created successfully!</strong></p>";
    echo "<p>ID: " . $banner->getId() . "</p>";
    echo "<p>Image: " . $banner->getImage() . "</p>";
    echo "<p>Link: " . $banner->getLink() . "</p>";
    echo "<p>Sort Order: " . $banner->getSortOrder() . "</p>";
    echo "<p>Status: " . ($banner->getStatus() ? 'Active' : 'Inactive') . "</p>";
    
    // Show all banners
    $collection = $objectManager->create('TMDT\Bai2\Model\ResourceModel\Banner\Collection');
    echo "<h3>All Banners (" . $collection->getSize() . " total):</h3>";
    echo "<ul>";
    foreach ($collection as $item) {
        echo "<li>ID {$item->getId()}: {$item->getImage()} - " . 
             ($item->getStatus() ? 'Active' : 'Inactive') . "</li>";
    }
    echo "</ul>";
    echo "<p><em>Refresh this page to create another banner!</em></p>";
    
} catch (Exception $e) {
    echo "<h2>❌ Error</h2>";
    echo "<p>" . $e->getMessage() . "</p>";
}
?>