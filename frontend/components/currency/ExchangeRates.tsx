'use client';

import { useCurrency } from '@/lib/hooks';
import { formatCurrency } from '@/lib/services/currency';
import { POPULAR_CURRENCIES } from '@/types/currency';
import Card from '@/components/ui/Card';

interface ExchangeRatesProps {
  className?: string;
  showAllRates?: boolean;
}

export default function ExchangeRates({ className = '', showAllRates = false }: ExchangeRatesProps) {
  const { rates, loading, error, lastUpdated } = useCurrency();

  if (loading) {
    return (
      <Card className={className}>
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/2 mb-4"></div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <div className="text-red-600 text-sm">
          <p className="font-semibold">Không thể tải tỉ giá</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </Card>
    );
  }

  const displayRates = showAllRates 
    ? rates 
    : rates.filter(rate => POPULAR_CURRENCIES.includes(rate.currencyCode as any));

  return (
    <Card className={className}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <h3 className="text-lg font-semibold text-gray-900">Tỉ Giá Ngoại Tệ</h3>
          {lastUpdated && (
            <p className="text-xs text-gray-500">
              {new Date(lastUpdated).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-gray-600 pb-2 border-b border-gray-100">
          <div>Ngoại tệ</div>
          <div className="text-right">Mua vào</div>
          <div className="text-right">Chuyển khoản</div>
          <div className="text-right">Bán ra</div>
        </div>

        {/* Rates */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {displayRates.map((rate) => (
            <div
              key={rate.currencyCode}
              className="grid grid-cols-4 gap-2 text-sm py-2 hover:bg-gray-50 rounded transition-colors"
            >
              <div className="font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <span className="text-primary-600">{rate.currencyCode}</span>
                  <span className="text-xs text-gray-500 truncate hidden sm:inline">
                    {rate.currencyName}
                  </span>
                </div>
              </div>
              <div className="text-right text-gray-700">
                {rate.buy !== '-' ? formatCurrency(rate.buy) : '-'}
              </div>
              <div className="text-right text-gray-700">
                {rate.transfer !== '-' ? formatCurrency(rate.transfer) : '-'}
              </div>
              <div className="text-right text-gray-700">
                {rate.sell !== '-' ? formatCurrency(rate.sell) : '-'}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-500 pt-3 border-t border-gray-200">
          Nguồn: Vietcombank | Đơn vị: VNĐ
        </div>
      </div>
    </Card>
  );
}
