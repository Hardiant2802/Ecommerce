'use client';

import { useState } from 'react';
import { useCurrency } from '@/lib/hooks';
import { convertCurrency, formatCurrency } from '@/lib/services/currency';
import { POPULAR_CURRENCIES } from '@/types/currency';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

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
    <Card className={className}>
      <div className="space-y-4">
        {/* Header */}
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Chuyển Đổi Tiền Tệ
        </h3>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
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

        {/* From Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Từ
          </label>
          <select
            value={fromCurrency}
            onChange={(e) => setFromCurrency(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={loading}
          >
            {availableCurrencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            onClick={swapCurrencies}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={loading}
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sang
          </label>
          <select
            value={toCurrency}
            onChange={(e) => setToCurrency(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={loading}
          >
            {availableCurrencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>

        {/* Convert Button */}
        <Button
          onClick={handleConvert}
          className="w-full"
          disabled={loading || !amount}
        >
          {loading ? 'Đang tải...' : 'Chuyển đổi'}
        </Button>

        {/* Result */}
        {result !== null && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Kết quả</p>
            <p className="text-2xl font-bold text-primary-600">
              {formatCurrency(result, toCurrency)} {toCurrency}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
