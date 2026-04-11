'use client';

import { useWeather } from '@/lib/hooks';
import { getWeatherIconUrl } from '@/lib/services/weather';
import Card from '@/components/ui/Card';

interface WeatherWidgetProps {
  city?: string;
  className?: string;
}

export default function WeatherWidget({ city, className = '' }: WeatherWidgetProps) {
  const { weather, loading, error } = useWeather({ city });

  if (loading) {
    return (
      <Card className={className}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <div className="text-red-600 text-sm">
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
    <Card className={className}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {weather.city}, {weather.country}
            </h3>
            <p className="text-xs text-gray-500">Thời tiết hiện tại</p>
          </div>
          <img
            src={getWeatherIconUrl(weather.icon, '2x')}
            alt={weather.description}
            className="w-12 h-12"
          />
        </div>

        {/* Temperature */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-primary-600">
            {weather.temperature}°
          </span>
          <span className="text-gray-600">C</span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-700 capitalize">
          {weather.description}
        </p>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500">Cảm giác như</p>
            <p className="text-sm font-semibold text-gray-900">
              {weather.feelsLike}°C
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Độ ẩm</p>
            <p className="text-sm font-semibold text-gray-900">
              {weather.humidity}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Tốc độ gió</p>
            <p className="text-sm font-semibold text-gray-900">
              {weather.windSpeed} m/s
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Cập nhật</p>
            <p className="text-sm font-semibold text-gray-900">
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
