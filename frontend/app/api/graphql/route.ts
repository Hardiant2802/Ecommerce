import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const DEFAULT_MAGENTO_GRAPHQL_URL = 'https://www.ahphonestore.id.vn/graphql';
const CONFIGURED_UPSTREAM_MAGENTO_GRAPHQL_URL = process.env.MAGENTO_GRAPHQL_UPSTREAM_URL?.trim() || '';
const FRONTEND_HOSTS = new Set([
  'ahphonestore.id.vn',
  'e-commerce-75g.pages.dev',
  'main.e-commerce-75g.pages.dev',
]);
const GRAPHQL_PROXY_CACHE_TTL_MS = 5_000;

type CachedGraphqlResponse = {
  expiresAt: number;
  status: number;
  payload: unknown;
};

const proxyCache = new Map<string, CachedGraphqlResponse>();

function createProxyCacheKey(url: string, body: unknown): string {
  return `${url}:${JSON.stringify(body)}`;
}

function shouldCacheRequest(body: unknown, hasAuthHeader: boolean): boolean {
  if (hasAuthHeader) {
    return false;
  }

  if (!body || typeof body !== 'object') {
    return false;
  }

  const query = (body as { query?: unknown }).query;
  if (typeof query !== 'string') {
    return false;
  }

  return !/\bmutation\b/i.test(query);
}

function getCachedProxyResponse(cacheKey: string): CachedGraphqlResponse | null {
  const item = proxyCache.get(cacheKey);
  if (!item) {
    return null;
  }

  if (item.expiresAt <= Date.now()) {
    proxyCache.delete(cacheKey);
    return null;
  }

  return item;
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
}

function isLocalRequestHost(hostname: string): boolean {
  return isLoopbackHost(hostname) || hostname.endsWith('.local');
}

function buildFallbackUpstream(frontendHost: string): string {
  if (CONFIGURED_UPSTREAM_MAGENTO_GRAPHQL_URL) {
    try {
      const host = new URL(CONFIGURED_UPSTREAM_MAGENTO_GRAPHQL_URL).hostname.toLowerCase();
      if (host !== frontendHost && !FRONTEND_HOSTS.has(host)) {
        return CONFIGURED_UPSTREAM_MAGENTO_GRAPHQL_URL;
      }
    } catch {
      // Ignore invalid configured fallback and continue with default.
    }
  }

  return DEFAULT_MAGENTO_GRAPHQL_URL;
}

function resolveMagentoGraphqlUrl(request: NextRequest): string {
  const frontendHost = request.nextUrl.hostname.toLowerCase();
  const fallbackUpstream = buildFallbackUpstream(frontendHost);
  const rawPublicUrl = process.env.NEXT_PUBLIC_MAGENTO_GRAPHQL_URL?.trim();
  const candidateUrl = rawPublicUrl || CONFIGURED_UPSTREAM_MAGENTO_GRAPHQL_URL || DEFAULT_MAGENTO_GRAPHQL_URL;

  try {
    const targetHost = new URL(candidateUrl).hostname.toLowerCase();

    // A deployed edge runtime cannot reach localhost from the user's browser context.
    if (isLoopbackHost(targetHost) && !isLocalRequestHost(frontendHost)) {
      return fallbackUpstream;
    }

    // If API target points to a frontend host, it will recurse and return HTML instead of GraphQL JSON.
    if (targetHost === frontendHost || FRONTEND_HOSTS.has(targetHost)) {
      return fallbackUpstream;
    }
  } catch {
    return fallbackUpstream;
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

    const canCache = shouldCacheRequest(body, !!authHeader);
    const cacheKey = canCache ? createProxyCacheKey(magentoGraphqlUrl, body) : '';

    if (canCache) {
      const cached = getCachedProxyResponse(cacheKey);
      if (cached) {
        return NextResponse.json(cached.payload, {
          status: cached.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Cache-Control': 'public, max-age=5, s-maxage=5, stale-while-revalidate=10',
            'X-GraphQL-Proxy-Cache': 'HIT',
          }
        });
      }
    }

    const response = await fetch(magentoGraphqlUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (canCache && response.ok) {
      proxyCache.set(cacheKey, {
        expiresAt: Date.now() + GRAPHQL_PROXY_CACHE_TTL_MS,
        status: response.status,
        payload: data,
      });
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': canCache
          ? 'public, max-age=5, s-maxage=5, stale-while-revalidate=10'
          : 'no-store',
        'X-GraphQL-Proxy-Cache': canCache ? 'MISS' : 'BYPASS',
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
