<?php

namespace TMDT\Bai2\Model\ResourceModel\Banner;

class Collection extends \Magento\Framework\Model\ResourceModel\Db\Collection\AbstractCollection
{
    protected function _construct()
    {
        $this->_init("TMDT\Bai2\Model\Banner", "TMDT\Bai2\Model\ResourceModel\Banner");
    }
}
