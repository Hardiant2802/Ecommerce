import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_MAGENTO_GRAPHQL_URL = 'https://ahphonestore.id.vn/graphql';
const FALLBACK_MAGENTO_GRAPHQL_URL = 'https://www.ahphonestore.id.vn/graphql';

function resolveMagentoGraphqlUrl(request: NextRequest): string {
  const rawUrl = process.env.NEXT_PUBLIC_MAGENTO_GRAPHQL_URL;
  const candidateUrl = rawUrl || DEFAULT_MAGENTO_GRAPHQL_URL;

  try {
    const targetUrl = new URL(candidateUrl);
    const hostname = targetUrl.hostname.toLowerCase();

    // Local Magento often redirects HTTP -> HTTPS. Keep HTTPS for local hosts
    // to avoid POST body loss across redirects (which causes GraphQL EOF).
    if (
      targetUrl.protocol === 'http:' &&
      (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'magento.test')
    ) {
      targetUrl.protocol = 'https:';
      if (targetUrl.port === '80') {
        targetUrl.port = '';
      }
      return targetUrl.toString();
    }

    // Guard against accidental recursion when proxy points back to itself.
    if (
      hostname === request.nextUrl.hostname.toLowerCase() &&
      targetUrl.port === request.nextUrl.port &&
      targetUrl.pathname === '/api/graphql'
    ) {
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
