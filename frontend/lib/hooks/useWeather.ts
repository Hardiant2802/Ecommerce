// useWeather Hook - Fetch weather data from API
'use client';

import { useState, useEffect } from 'react';
import type { WeatherData, WeatherDisplayData } from '@/types/weather';
import { transformWeatherData } from '@/lib/services/weather';

interface UseWeatherOptions {
  city?: string;
  lat?: number;
  lon?: number;
  enabled?: boolean;
}

interface UseWeatherReturn {
  weather: WeatherDisplayData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWeather(options: UseWeatherOptions = {}): UseWeatherReturn {
  const { city, lat, lon, enabled = true } = options;
  const [weather, setWeather] = useState<WeatherDisplayData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const fetchWeather = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (lat && lon) {
          params.set('lat', lat.toString());
          params.set('lon', lon.toString());
        } else if (city) {
          params.set('city', city);
        }

        const response = await fetch(`/api/weather?${params}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        if (data.data) {
          const transformed = transformWeatherData(data.data);
          setWeather(transformed);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể lấy dữ liệu thời tiết');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [city, lat, lon, enabled, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return { weather, loading, error, refetch };
}
