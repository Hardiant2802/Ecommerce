// Currency API Route - Proxy to Vietcombank
import { NextRequest, NextResponse } from 'next/server';
import { fetchExchangeRates } from '@/lib/services/currency';
import type { CurrencyApiResponse } from '@/types/currency';

// Cache exchange rates for 1 hour (rates don't change frequently)
const CACHE_DURATION = 60 * 60 * 1000;
let cachedData: CurrencyApiResponse | null = null;
let cacheTimestamp = 0;

export async function GET(request: NextRequest) {
  try {
    // Check cache
    const now = Date.now();
    if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json({
        ...cachedData,
        cached: true,
      });
    }

    // Fetch fresh data
    const currencyData = await fetchExchangeRates();

    const response: CurrencyApiResponse = {
      data: currencyData,
      cached: false,
      timestamp: now,
    };

    // Update cache
    cachedData = response;
    cacheTimestamp = now;

    return NextResponse.json(response);
  } catch (error) {
    console.error('Currency API error:', error);
    
    // Return cached data if available, even if expired
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        cached: true,
        error: 'Using cached data due to API error',
      });
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch exchange rates',
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
