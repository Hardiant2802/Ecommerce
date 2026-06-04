'use client';

import { useWeather } from '@/lib/hooks';
import { getWeatherIconUrl } from '@/lib/services/weather';
import Card from '@/components/ui/Card';
import { Clock, Droplets, MapPin, ThermometerSun, Wind } from 'lucide-react';

interface WeatherWidgetProps {
  city?: string;
  className?: string;
}

export default function WeatherWidget({ city, className = '' }: WeatherWidgetProps) {
  const { weather, loading, error } = useWeather({ city });

  if (loading) {
    return (
      <Card className={`h-full ${className}`}>
        <div className="animate-pulse space-y-5">
          <div className="h-5 bg-slate-200 rounded w-1/2" />
          <div className="h-16 bg-slate-200 rounded-md w-full" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-slate-100 rounded-md" />
            <div className="h-16 bg-slate-100 rounded-md" />
            <div className="h-16 bg-slate-100 rounded-md" />
            <div className="h-16 bg-slate-100 rounded-md" />
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`h-full ${className}`}>
        <div className="text-rose-600 text-sm">
          <p className="font-semibold">Không thể tải thông tin thời tiết</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </Card>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <Card className={`h-full ${className}`}>
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Thời tiết</p>
            <h3 className="mt-1 flex items-center gap-2 break-words text-base font-bold text-slate-900 sm:text-lg">
              <MapPin className="h-4 w-4 text-primary-600" />
              {weather.city}, {weather.country}
            </h3>
            <p className="mt-1 text-xs text-slate-500">Cập nhật theo thời gian thực</p>
          </div>
          <div className="rounded-lg bg-primary-50 p-2">
            <img
              src={getWeatherIconUrl(weather.icon, '2x')}
              alt={weather.description}
              className="h-12 w-12 sm:h-14 sm:w-14"
            />
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-primary-100 bg-primary-50 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-primary-700 sm:text-5xl">
                  {weather.temperature}°
                </span>
                <span className="text-lg font-semibold text-slate-600">C</span>
              </div>
              <p className="mt-2 text-sm font-medium capitalize text-slate-700">
                {weather.description}
              </p>
            </div>
            <ThermometerSun className="h-8 w-8 text-primary-600" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <ThermometerSun className="h-3.5 w-3.5" />
              Cảm giác
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {weather.feelsLike}°C
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Droplets className="h-3.5 w-3.5" />
              Độ ẩm
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {weather.humidity}%
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Wind className="h-3.5 w-3.5" />
              Gió
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {weather.windSpeed} m/s
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              Cập nhật
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {new Date(weather.timestamp).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
