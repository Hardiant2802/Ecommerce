// Weather API Route - Proxy to OpenWeatherMap
import { NextRequest, NextResponse } from 'next/server';
import { fetchWeatherByCity, fetchWeatherByCoords, transformWeatherData } from '@/lib/services/weather';
import type { WeatherApiResponse } from '@/types/weather';

export const runtime = 'edge';

// Cache weather data for 10 minutes
const CACHE_DURATION = 10 * 60 * 1000;
let cachedData: WeatherApiResponse | null = null;
let cacheTimestamp = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city') || process.env.NEXT_PUBLIC_DEFAULT_CITY || 'Hanoi';
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chưa cấu hình API key OpenWeatherMap' },
        { status: 500 }
      );
    }

    // Check cache
    const now = Date.now();
    if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json({
        ...cachedData,
        cached: true,
      });
    }

    // Fetch fresh data
    let weatherData;
    if (lat && lon) {
      weatherData = await fetchWeatherByCoords(
        parseFloat(lat),
        parseFloat(lon),
        apiKey
      );
    } else {
      weatherData = await fetchWeatherByCity(city, apiKey);
    }

    const response: WeatherApiResponse = {
      data: weatherData,
      cached: false,
      timestamp: now,
    };

    // Update cache
    cachedData = response;
    cacheTimestamp = now;

    return NextResponse.json(response);
  } catch (error) {
    console.error('Weather API error:', error);
    
    // Return cached data if available, even if expired
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        cached: true,
        error: 'Đang dùng dữ liệu đã lưu do lỗi API',
      });
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Không thể lấy dữ liệu thời tiết',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
