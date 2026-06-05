'use client';

import { useCurrency } from '@/lib/hooks';
import { formatCurrency } from '@/lib/services/currency';
import { POPULAR_CURRENCIES } from '@/types/currency';
import Card from '@/components/ui/Card';
import { Clock3, TrendingUp } from 'lucide-react';

interface ExchangeRatesProps {
  className?: string;
  showAllRates?: boolean;
}

export default function ExchangeRates({ className = '', showAllRates = false }: ExchangeRatesProps) {
  const { rates, loading, error, lastUpdated } = useCurrency();

  if (loading) {
    return (
      <Card className={`h-full ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-slate-200 rounded w-1/2 mb-4"></div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`h-full ${className}`}>
        <div className="text-rose-600 text-sm">
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
    <Card className={`h-full ${className}`}>
      <div className="flex h-full flex-col space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Tài chính</p>
            <h3 className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-900">
              <TrendingUp className="h-5 w-5 text-primary-600" />
              Tỉ giá ngoại tệ
            </h3>
          </div>
          {lastUpdated && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              <Clock3 className="h-3.5 w-3.5" />
              {new Date(lastUpdated).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          <div>Mã</div>
          <div className="text-right">Mua</div>
          <div className="text-right">CK</div>
          <div className="text-right">Bán</div>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {displayRates.map((rate) => (
            <div
              key={rate.currencyCode}
              className="grid grid-cols-4 gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-primary-50"
            >
              <div className="font-semibold text-slate-900">
                <div className="flex items-center gap-2">
                  <span className="text-primary-700">{rate.currencyCode}</span>
                  <span className="text-xs text-slate-500 truncate hidden sm:inline">
                    {rate.currencyName}
                  </span>
                </div>
              </div>
              <div className="text-right font-medium text-slate-700">
                {rate.buy !== '-' ? formatCurrency(rate.buy) : '-'}
              </div>
              <div className="text-right font-medium text-slate-700">
                {rate.transfer !== '-' ? formatCurrency(rate.transfer) : '-'}
              </div>
              <div className="text-right font-medium text-slate-700">
                {rate.sell !== '-' ? formatCurrency(rate.sell) : '-'}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-3 text-xs text-slate-500">
          Nguồn: Vietcombank | Đơn vị: VNĐ
        </div>
      </div>
    </Card>
  );
}
