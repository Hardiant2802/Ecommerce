<?php

namespace TMDT\Bai2\Model;

class Banner extends \Magento\Framework\Model\AbstractModel
{
    protected function _construct()
    {
        $this->_init(\TMDT\Bai2\Model\ResourceModel\Banner::class);
    }
}
