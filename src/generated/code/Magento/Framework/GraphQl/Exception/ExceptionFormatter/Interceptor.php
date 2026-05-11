<?php
namespace Magento\Framework\GraphQl\Exception\ExceptionFormatter;

/**
 * Interceptor class for @see \Magento\Framework\GraphQl\Exception\ExceptionFormatter
 */
class Interceptor extends \Magento\Framework\GraphQl\Exception\ExceptionFormatter implements \Magento\Framework\Interception\InterceptorInterface
{
    use \Magento\Framework\Interception\Interceptor;

    public function __construct(\Magento\Framework\App\State $appState, \Magento\Framework\Webapi\ErrorProcessor $errorProcessor, \Psr\Log\LoggerInterface $logger)
    {
        $this->___init();
        parent::__construct($appState, $errorProcessor, $logger);
    }

    /**
     * {@inheritdoc}
     */
    public function create(\Throwable $exception, $internalErrorMessage = null): array
    {
        $pluginInfo = $this->pluginList->getNext($this->subjectType, 'create');
        return $pluginInfo ? $this->___callPlugins('create', func_get_args(), $pluginInfo) : parent::create($exception, $internalErrorMessage);
    }

    /**
     * {@inheritdoc}
     */
    public function shouldShowDetail(): bool
    {
        $pluginInfo = $this->pluginList->getNext($this->subjectType, 'shouldShowDetail');
        return $pluginInfo ? $this->___callPlugins('shouldShowDetail', func_get_args(), $pluginInfo) : parent::shouldShowDetail();
    }
}
