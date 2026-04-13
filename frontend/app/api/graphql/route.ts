import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const DEFAULT_MAGENTO_GRAPHQL_URL = 'https://ahphonestore.id.vn/graphql';
const FALLBACK_MAGENTO_GRAPHQL_URL = 'https://www.ahphonestore.id.vn/graphql';

function resolveMagentoGraphqlUrl(request: NextRequest): string {
  const rawUrl = process.env.NEXT_PUBLIC_MAGENTO_GRAPHQL_URL;
  const candidateUrl = rawUrl || DEFAULT_MAGENTO_GRAPHQL_URL;

  const normalized = candidateUrl.trim().toLowerCase();
  if (
    normalized.includes('localhost') ||
    normalized.includes('127.0.0.1') ||
    normalized.includes('0.0.0.0')
  ) {
    return FALLBACK_MAGENTO_GRAPHQL_URL;
  }

  try {
    const targetHost = new URL(candidateUrl).hostname.toLowerCase();
    const frontendHost = request.nextUrl.hostname.toLowerCase();

    // If API target points to the same host as frontend Pages, it will recurse and return HTML.
    if (targetHost === frontendHost) {
      return FALLBACK_MAGENTO_GRAPHQL_URL;
    }
  } catch {
    return FALLBACK_MAGENTO_GRAPHQL_URL;
  }

  return candidateUrl;
}

export async function POST(request: NextRequest) {
  try {
    const magentoGraphqlUrl = resolveMagentoGraphqlUrl(request);
    const body = await request.json();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Store': process.env.NEXT_PUBLIC_MAGENTO_STORE_CODE || 'default',
    };

    // Forward authorization header if present
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(magentoGraphqlUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error('GraphQL Proxy Error:', error);
    return NextResponse.json(
      { 
        errors: [{ 
          message: error instanceof Error ? error.message : 'Failed to fetch from Magento' 
        }] 
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
