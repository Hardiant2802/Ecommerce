<?php

namespace TMDT\Bai2\Controller\Index;

use Magento\Framework\App\Action\Context;
use Magento\Framework\View\Result\PageFactory;

class Index extends \Magento\Framework\App\Action\Action
{
    public function execute()
    {
        // Create new banner with unique data
        $timestamp = time();
        $banner = $this->_objectManager->create("TMDT\Bai2\Model\Banner");
        $banner->addData([
            "image" => "banner-" . $timestamp . ".jpg",
            "link" => "http://example.com/page-" . $timestamp,
            "sort_order" => rand(1, 100),
            "status" => 1
        ])->save();

        echo "✅ Created new banner with ID: " . $banner->getId() . "<br>";
        echo "📷 Image: " . $banner->getImage() . "<br>";
        echo "🔗 Link: " . $banner->getLink() . "<br>";
        echo "📊 Sort Order: " . $banner->getSortOrder() . "<br>";
        echo "✨ Status: " . ($banner->getStatus() ? 'Active' : 'Inactive') . "<br><br>";

        // Show all banners in database
        $collection = $this->_objectManager->create("TMDT\Bai2\Model\ResourceModel\Banner\Collection");
        echo "📋 Total banners in database: " . $collection->getSize() . "<br><br>";
        
        echo "<h3>All Banners:</h3>";
        foreach ($collection as $bannerItem) {
            echo "ID {$bannerItem->getId()}: {$bannerItem->getImage()} - Status: " . 
                 ($bannerItem->getStatus() ? 'Active' : 'Inactive') . "<br>";
        }
        
        echo "<br>🎉 Banner saved successfully! Refresh page to create another banner.";
    }
}
