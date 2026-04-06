<?php

namespace TMDT\Bai2\Setup;

use Magento\Framework\Setup\SchemaSetupInterface;
use Magento\Framework\Setup\ModuleContextInterface;
use Magento\Framework\Setup\InstallSchemaInterface;
use Magento\Framework\DB\Ddl\Table;

class InstallSchema implements \Magento\Framework\Setup\InstallSchemaInterface
{
    public function install(SchemaSetupInterface $setup, ModuleContextInterface $context)
    {
        $setup->startSetup();


        $connection = $setup->getConnection();

        $tablename = $setup->getTable("banner");

        if ($connection->isTableExists($tablename) != true) {
            $table = $connection->newTable($tablename)->addColumn(
                "id",
                Table::TYPE_INTEGER,
                null,
                ["primary" => true, "nullable" => false, "identity" => true]
            )->addColumn(
                "image",
                Table::TYPE_TEXT,
                255,
                ["nullable" => false]
            )->addColumn(
                "link",
                Table::TYPE_TEXT,
                255,
                ["nullable" => false]
            )->addColumn(
                "sort_order",
                Table::TYPE_INTEGER,
                null,
                ["nullable" => true, "default" => 0]
            )->addColumn(
                "status",
                Table::TYPE_SMALLINT,
                null,
                ["nullable" => true, "default" => 1]
            )->setOption("charset", "utf8");

            $connection->createTable($table);
        }




        $setup->endSetup();
    }
}
