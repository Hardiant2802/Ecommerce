# New Modules Implementation Guide

## Overview
This document describes the three new modules added to the Mobile Phone Store application:
1. **Weather Module** - Display current weather from OpenWeatherMap
2. **Currency Exchange Module** - Show Vietcombank exchange rates
3. **Business News Module** - Display VnExpress business news

## Features

### 1. Weather Module
- **Location**: Homepage widget, uses OpenWeatherMap API
- **Features**:
  - Current weather for Hanoi (configurable)
  - Temperature, humidity, wind speed
  - Weather icon and description in Vietnamese
  - Auto-refresh with 10-minute cache
- **Components**: `components/weather/WeatherWidget.tsx`
- **API Endpoint**: `/api/weather`

### 2. Currency Exchange Module
- **Location**: Homepage widget + converter
- **Features**:
  - Real-time exchange rates from Vietcombank
  - Popular currencies (USD, EUR, GBP, JPY, etc.)
  - Currency converter tool
  - Auto-refresh with 1-hour cache
- **Components**: 
  - `components/currency/ExchangeRates.tsx`
  - `components/currency/CurrencyConverter.tsx`
- **API Endpoint**: `/api/currency`

### 3. Business News Module
- **Location**: Homepage section + dedicated `/news` page
- **Features**:
  - Latest business news from VnExpress RSS
  - News cards with thumbnails
  - Relative timestamps (e.g., "2 giờ trước")
  - Auto-refresh with 5-minute cache
- **Components**:
  - `components/news/NewsCard.tsx`
  - `components/news/NewsGrid.tsx`
- **Pages**: `/app/news/page.tsx`
- **API Endpoint**: `/api/news`

## Architecture

### Folder Structure
```
frontend/
├── types/              # TypeScript definitions
│   ├── weather.ts
│   ├── currency.ts
│   └── news.ts
├── lib/
│   ├── services/      # API client logic
│   │   ├── weather.ts
│   │   ├── currency.ts
│   │   └── news.ts
│   └── hooks/         # React hooks
│       ├── useWeather.ts
│       ├── useCurrency.ts
│       └── useNews.ts
├── app/
│   ├── api/           # API route proxies
│   │   ├── weather/route.ts
│   │   ├── currency/route.ts
│   │   └── news/route.ts
│   └── news/          # News page
│       └── page.tsx
└── components/
    ├── weather/
    │   └── WeatherWidget.tsx
    ├── currency/
    │   ├── ExchangeRates.tsx
    │   └── CurrencyConverter.tsx
    └── news/
        ├── NewsCard.tsx
        └── NewsGrid.tsx
```

### Data Flow
1. **Client Component** calls custom hook (e.g., `useWeather()`)
2. **Hook** fetches from internal API route (e.g., `/api/weather`)
3. **API Route** proxies to external API + caches result
4. **Service Layer** handles API communication and data transformation
5. **Types** ensure type safety throughout

### Caching Strategy
- **Weather**: 10 minutes (weather doesn't change frequently)
- **Currency**: 1 hour (exchange rates update 1-2 times daily)
- **News**: 5 minutes (news updates frequently)

## API Keys

### Required Environment Variables
Add to `.env.local`:
```bash
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_api_key_here
NEXT_PUBLIC_DEFAULT_CITY=Hanoi
```

### Getting API Keys
1. **OpenWeatherMap**: 
   - Sign up at https://openweathermap.org/
   - Free tier: 60 calls/minute, 1M calls/month
   - Current key: `2216faa3da0a6433470b89d97348c770`

2. **Vietcombank**: No API key required (public XML endpoint)
3. **VnExpress**: No API key required (public RSS feed)

## Testing

### API Endpoints
Test the APIs directly:

```bash
# Weather
curl http://localhost:3000/api/weather
curl http://localhost:3000/api/weather?city=HoChiMinh

# Currency
curl http://localhost:3000/api/currency

# News
curl http://localhost:3000/api/news?limit=5
```

### Expected Response Format

**Weather API:**
```json
{
  "data": {
    "coord": { "lon": 105.8412, "lat": 21.0245 },
    "weather": [{"main": "Rain", "description": "mưa nhẹ"}],
    "main": { "temp": 29, "humidity": 81 }
  },
  "cached": true,
  "timestamp": 1775482765483
}
```

**Currency API:**
```json
{
  "data": {
    "rates": [
      {
        "currencyCode": "USD",
        "currencyName": "US DOLLAR",
        "buy": "26,111.00",
        "transfer": "26,141.00",
        "sell": "26,361.00"
      }
    ]
  }
}
```

**News API:**
```json
{
  "data": {
    "articles": [
      {
        "id": "5059246",
        "title": "Article title",
        "description": "Article description",
        "link": "https://vnexpress.net/...",
        "pubDate": "Mon, 06 Apr 2026 18:53:32 +0700",
        "thumbnail": "https://..."
      }
    ]
  }
}
```

## Usage Examples

### Weather Widget
```tsx
import WeatherWidget from '@/components/weather/WeatherWidget';

<WeatherWidget city="Hanoi" className="my-custom-class" />
```

### Exchange Rates
```tsx
import ExchangeRates from '@/components/currency/ExchangeRates';

<ExchangeRates showAllRates={false} />
```

### Currency Converter
```tsx
import CurrencyConverter from '@/components/currency/CurrencyConverter';

<CurrencyConverter />
```

### News Grid
```tsx
import NewsGrid from '@/components/news/NewsGrid';

<NewsGrid limit={10} />
```

## Error Handling

All modules include:
- Loading states with skeleton screens
- Error states with user-friendly messages
- Fallback to cached data on API errors
- Graceful degradation

## Performance

### Optimization Techniques
1. **Server-side caching** in API routes
2. **React Query patterns** in hooks with refetch triggers
3. **Lazy loading** of images in news cards
4. **Responsive images** with proper sizing
5. **Code splitting** - components load only when used

### Bundle Impact
- Weather: ~3KB gzipped
- Currency: ~5KB gzipped  
- News: ~4KB gzipped
- Total: ~12KB additional bundle size

## Customization

### Change Default City
In `.env.local`:
```bash
NEXT_PUBLIC_DEFAULT_CITY=HoChiMinh
```

### Modify Cache Duration
In `app/api/[module]/route.ts`:
```typescript
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
```

### Add More Currencies
In `types/currency.ts`:
```typescript
export const POPULAR_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'YOUR_CURRENCY'
] as const;
```

## Troubleshooting

### Weather not loading
- Check API key in `.env.local`
- Verify OpenWeatherMap API quota
- Check browser console for CORS errors

### Currency rates showing old data
- Clear browser cache
- Restart dev server to clear server-side cache
- Check Vietcombank XML endpoint is accessible

### News feed empty
- VnExpress RSS may be temporarily unavailable
- Check network tab for 403/500 errors
- Verify RSS feed URL is correct

## Future Enhancements

Potential improvements:
1. **Weather**: Add 5-day forecast, multiple cities
2. **Currency**: Historical charts, rate alerts
3. **News**: Search, categories, bookmarking
4. **All**: Persist cache to localStorage/Redis
5. **All**: Add real-time updates with WebSockets

## Support

For issues or questions:
- Check the API endpoints are accessible
- Review browser console for errors
- Verify environment variables are set
- Test API routes directly with curl

---

**Implementation Date**: April 6, 2026
**Status**: ✅ Complete and tested
**Developer**: GitHub Copilot CLI
