// useCurrency Hook - Fetch exchange rates from API
'use client';

import { useState, useEffect } from 'react';
import type { CurrencyData, ExchangeRate } from '@/types/currency';

interface UseCurrencyReturn {
  rates: ExchangeRate[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  refetch: () => void;
  getRate: (currencyCode: string) => ExchangeRate | undefined;
}

export function useCurrency(): UseCurrencyReturn {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    const fetchRates = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/currency');
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        if (data.data) {
          setRates(data.data.rates);
          setLastUpdated(data.data.lastUpdated);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể lấy tỉ giá');
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, [refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  const getRate = (currencyCode: string): ExchangeRate | undefined => {
    return rates.find(rate => rate.currencyCode === currencyCode);
  };

  return { rates, loading, error, lastUpdated, refetch, getRate };
}
