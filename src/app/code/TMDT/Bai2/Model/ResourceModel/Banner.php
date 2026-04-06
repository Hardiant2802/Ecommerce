<?php

namespace TMDT\Bai2\Model\ResourceModel;

class Banner extends \Magento\Framework\Model\ResourceModel\Db\AbstractDb
{
    protected function _construct()
    {
        // Table name + primary column
        $this->_init("banner", "id");
    }
}
