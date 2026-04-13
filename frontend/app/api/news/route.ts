// News API Route - Proxy to VnExpress RSS
import { NextRequest, NextResponse } from 'next/server';
import { fetchBusinessNews } from '@/lib/services/news';
import type { NewsApiResponse } from '@/types/news';

export const runtime = 'edge';

// Cache news for 5 minutes (news updates frequently)
const CACHE_DURATION = 5 * 60 * 1000;
let cachedData: NewsApiResponse | null = null;
let cacheTimestamp = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    // Check cache
    const now = Date.now();
    if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
      const response = {
        ...cachedData,
        cached: true,
      };

      // Apply limit if specified
      if (response.data && limit) {
        response.data = {
          ...response.data,
          articles: response.data.articles.slice(0, limit),
        };
      }

      return NextResponse.json(response);
    }

    // Fetch fresh data
    const newsData = await fetchBusinessNews();

    const response: NewsApiResponse = {
      data: newsData,
      cached: false,
      timestamp: now,
    };

    // Update cache
    cachedData = response;
    cacheTimestamp = now;

    // Apply limit if specified
    const limitedResponse = { ...response };
    if (limitedResponse.data && limit) {
      limitedResponse.data = {
        ...limitedResponse.data,
        articles: limitedResponse.data.articles.slice(0, limit),
      };
    }

    return NextResponse.json(limitedResponse);
  } catch (error) {
    console.error('News API error:', error);
    
    // Return cached data if available, even if expired
    if (cachedData) {
      const response = {
        ...cachedData,
        cached: true,
        error: 'Using cached data due to API error',
      };

      const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
      if (response.data && limit) {
        response.data = {
          ...response.data,
          articles: response.data.articles.slice(0, limit),
        };
      }

      return NextResponse.json(response);
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch news',
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
