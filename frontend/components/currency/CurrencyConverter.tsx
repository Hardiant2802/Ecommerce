'use client';

import { useState } from 'react';
import { useCurrency } from '@/lib/hooks';
import { convertCurrency, formatCurrency } from '@/lib/services/currency';
import { POPULAR_CURRENCIES } from '@/types/currency';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { ArrowUpDown, Calculator } from 'lucide-react';

interface CurrencyConverterProps {
  className?: string;
}

export default function CurrencyConverter({ className = '' }: CurrencyConverterProps) {
  const { rates, loading } = useCurrency();
  const [amount, setAmount] = useState<string>('1000000');
  const [fromCurrency, setFromCurrency] = useState<string>('VND');
  const [toCurrency, setToCurrency] = useState<string>('USD');
  const [result, setResult] = useState<number | null>(null);

  const handleConvert = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    const converted = convertCurrency(numAmount, fromCurrency, toCurrency, rates);
    setResult(converted);
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setResult(null);
  };

  const availableCurrencies = ['VND', ...POPULAR_CURRENCIES];

  return (
    <Card className={`h-full ${className}`}>
      <div className="flex h-full flex-col space-y-4">
        <div className="border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Công cụ</p>
          <h3 className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-900">
            <Calculator className="h-5 w-5 text-primary-600" />
            Chuyển đổi tiền tệ
          </h3>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Số tiền
          </label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Nhập số tiền"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 min-[420px]:gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Từ
            </label>
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={loading}
            >
              {availableCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={swapCurrencies}
            className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50"
            disabled={loading}
            aria-label="Đảo chiều tiền tệ"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Sang
            </label>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={loading}
            >
              {availableCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button
          onClick={handleConvert}
          className="w-full"
          disabled={loading || !amount}
        >
          {loading ? 'Đang tải...' : 'Chuyển đổi'}
        </Button>

        {result !== null && (
          <div className="mt-auto rounded-lg border border-primary-200 bg-primary-50 p-4">
            <p className="text-sm font-medium text-slate-600 mb-1">Kết quả quy đổi</p>
            <p className="break-words text-xl font-black text-primary-700 sm:text-2xl">
              {formatCurrency(result, toCurrency)} {toCurrency}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
