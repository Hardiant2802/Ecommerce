// Weather Service - OpenWeatherMap API Client
import type { WeatherData, WeatherDisplayData } from '@/types/weather';

const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';

export interface FetchWeatherOptions {
  city?: string;
  lat?: number;
  lon?: number;
  units?: 'metric' | 'imperial' | 'standard';
  lang?: string;
}

/**
 * Fetch current weather data from OpenWeatherMap API
 * Note: This should be called from API routes to keep the API key secure
 */
export async function fetchWeatherByCity(
  city: string,
  apiKey: string,
  options: Omit<FetchWeatherOptions, 'city'> = {}
): Promise<WeatherData> {
  const { units = 'metric', lang = 'vi' } = options;
  
  const params = new URLSearchParams({
    q: city,
    appid: apiKey,
    units,
    lang,
  });

  const response = await fetch(`${API_BASE_URL}/weather?${params}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `Weather API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch weather by coordinates
 */
export async function fetchWeatherByCoords(
  lat: number,
  lon: number,
  apiKey: string,
  options: Omit<FetchWeatherOptions, 'lat' | 'lon'> = {}
): Promise<WeatherData> {
  const { units = 'metric', lang = 'vi' } = options;
  
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    appid: apiKey,
    units,
    lang,
  });

  const response = await fetch(`${API_BASE_URL}/weather?${params}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `Weather API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Transform raw weather data to display-friendly format
 */
export function transformWeatherData(data: WeatherData): WeatherDisplayData {
  return {
    city: data.name,
    country: data.sys.country,
    temperature: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    description: data.weather[0]?.description || '',
    icon: data.weather[0]?.icon || '01d',
    humidity: data.main.humidity,
    windSpeed: data.wind.speed,
    timestamp: data.dt * 1000, // Convert to milliseconds
  };
}

/**
 * Get weather icon URL from OpenWeatherMap
 */
export function getWeatherIconUrl(iconCode: string, size: '2x' | '4x' = '2x'): string {
  return `https://openweathermap.org/img/wn/${iconCode}@${size}.png`;
}

/**
 * Get weather description in Vietnamese (fallback)
 */
export function getWeatherDescriptionVN(condition: string): string {
  const translations: Record<string, string> = {
    'clear sky': 'Trời quang',
    'few clouds': 'Ít mây',
    'scattered clouds': 'Mây rải rác',
    'broken clouds': 'Nhiều mây',
    'overcast clouds': 'U ám',
    'light rain': 'Mưa nhẹ',
    'moderate rain': 'Mưa vừa',
    'heavy rain': 'Mưa to',
    'thunderstorm': 'Dông bão',
    'snow': 'Tuyết',
    'mist': 'Sương mù',
    'fog': 'Sương mù dày',
  };

  return translations[condition.toLowerCase()] || condition;
}
