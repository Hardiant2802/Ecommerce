<?php
namespace Magento\CatalogInventoryGraphQl\Model\Resolver\QuantityResolver;

/**
 * Interceptor class for @see \Magento\CatalogInventoryGraphQl\Model\Resolver\QuantityResolver
 */
class Interceptor extends \Magento\CatalogInventoryGraphQl\Model\Resolver\QuantityResolver implements \Magento\Framework\Interception\InterceptorInterface
{
    use \Magento\Framework\Interception\Interceptor;

    public function __construct(\Magento\Catalog\Api\ProductRepositoryInterface $productRepositoryInterface, \Magento\Framework\App\Config\ScopeConfigInterface $scopeConfig, \Magento\CatalogInventory\Model\StockState $stockState, \Magento\QuoteGraphQl\Model\CartItem\ProductStock $productStock)
    {
        $this->___init();
        parent::__construct($productRepositoryInterface, $scopeConfig, $stockState, $productStock);
    }

    /**
     * {@inheritdoc}
     */
    public function resolve(\Magento\Framework\GraphQl\Config\Element\Field $field, $context, \Magento\Framework\GraphQl\Schema\Type\ResolveInfo $info, ?array $value = null, ?array $args = null): ?float
    {
        $pluginInfo = $this->pluginList->getNext($this->subjectType, 'resolve');
        return $pluginInfo ? $this->___callPlugins('resolve', func_get_args(), $pluginInfo) : parent::resolve($field, $context, $info, $value, $args);
    }
}
