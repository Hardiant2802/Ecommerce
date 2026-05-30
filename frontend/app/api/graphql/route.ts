import { NextRequest, NextResponse } from 'next/server';

// Changed from 'edge' to 'nodejs' so that NODE_TLS_REJECT_UNAUTHORIZED=0 is
// honoured when proxying to the Magento backend over self-signed HTTPS on the VPS.
export const runtime = 'nodejs';

const DEFAULT_INTERNAL_MAGENTO_GRAPHQL_URL = 'https://127.0.0.1/graphql';
const DEFAULT_PUBLIC_MAGENTO_GRAPHQL_URL = 'https://www.ahphonestore.id.vn/graphql';
const CONFIGURED_UPSTREAM_MAGENTO_GRAPHQL_URL = process.env.MAGENTO_GRAPHQL_UPSTREAM_URL?.trim() || '';
const FRONTEND_HOSTS = new Set([
  'ahphonestore.id.vn',
  'www.ahphonestore.id.vn',
  'e-commerce-75g.pages.dev',
  'main.e-commerce-75g.pages.dev',
]);
const GRAPHQL_PROXY_CACHE_TTL_MS = 2 * 60 * 1000; // 2 phút
const DEFAULT_GRAPHQL_PROXY_TIMEOUT_MS = 12_000;

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

/**
 * Kiểm tra payload có chứa dữ liệu thực sự không (không cache kết quả rỗng).
 * Tránh cache trường hợp Magento trả về total_count: 0 do OpenSearch down.
 */
function isPayloadWorthCaching(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return true; // không phải products query → cache bình thường

  // Kiểm tra nếu là products query → không cache nếu total_count = 0
  const anyData = data as Record<string, unknown>;
  for (const key of Object.keys(anyData)) {
    const val = anyData[key];
    if (val && typeof val === 'object') {
      const totalCount = (val as { total_count?: unknown }).total_count;
      if (totalCount !== undefined && Number(totalCount) === 0) {
        return false; // Không cache kết quả 0 sản phẩm
      }
    }
  }
  return true;
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

function buildInternalUpstream(frontendHost: string): string {
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

  return DEFAULT_INTERNAL_MAGENTO_GRAPHQL_URL;
}

function resolveMagentoGraphqlUrl(request: NextRequest): string {
  const frontendHost = request.nextUrl.hostname.toLowerCase();
  const internalUpstream = buildInternalUpstream(frontendHost);

  // Public traffic should always use internal VPS upstream to avoid Cloudflare round-trips.
  if (!isLocalRequestHost(frontendHost)) {
    return internalUpstream;
  }

  const rawPublicUrl = process.env.NEXT_PUBLIC_MAGENTO_GRAPHQL_URL?.trim();
  const candidateUrl = rawPublicUrl || DEFAULT_PUBLIC_MAGENTO_GRAPHQL_URL;

  try {
    const targetHost = new URL(candidateUrl).hostname.toLowerCase();

    // If API target points to a frontend host, it will recurse and return HTML instead of GraphQL JSON.
    if (targetHost === frontendHost || FRONTEND_HOSTS.has(targetHost)) {
      return internalUpstream;
    }
  } catch {
    return internalUpstream;
  }

  return candidateUrl;
}

function getGraphqlProxyTimeoutMs(): number {
  const rawTimeout = process.env.GRAPHQL_PROXY_TIMEOUT_MS?.trim();
  if (!rawTimeout) {
    return DEFAULT_GRAPHQL_PROXY_TIMEOUT_MS;
  }

  const parsed = Number(rawTimeout);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_GRAPHQL_PROXY_TIMEOUT_MS;
  }

  return parsed;
}

function resolveMagentoGraphqlUrls(request: NextRequest): string[] {
  return [resolveMagentoGraphqlUrl(request)];
}

function isTransientUpstreamError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('abort') ||
    message.includes('fetch failed') ||
    message.includes('econnreset') ||
    message.includes('econnrefused')
  );
}

function shouldRetryWithAnotherUpstream(statusCode: number): boolean {
  return statusCode === 502 || statusCode === 503 || statusCode === 504;
}

function parseUpstreamPayload(responseText: string, responseStatus: number): { payload: unknown; isJson: boolean } {
  if (!responseText) {
    return { payload: {}, isJson: true };
  }

  try {
    return { payload: JSON.parse(responseText), isJson: true };
  } catch {
    return {
      isJson: false,
      payload: {
        errors: [
          {
            message: `Magento upstream returned non-JSON response (HTTP ${responseStatus})`,
          },
        ],
      },
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const magentoGraphqlUrls = resolveMagentoGraphqlUrls(request);
    const primaryMagentoGraphqlUrl =
      magentoGraphqlUrls[0] || resolveMagentoGraphqlUrl(request);
    const body = await request.json();
    const timeoutMs = getGraphqlProxyTimeoutMs();
    
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
    const cacheKey = canCache ? createProxyCacheKey(primaryMagentoGraphqlUrl, body) : '';

    if (canCache) {
      const cached = getCachedProxyResponse(cacheKey);
      if (cached) {
        return NextResponse.json(cached.payload, {
          status: cached.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Cache-Control': 'public, max-age=120, s-maxage=120, stale-while-revalidate=60',
            'X-GraphQL-Proxy-Cache': 'HIT',
          }
        });
      }
    }

    let lastError: unknown = null;

    for (let index = 0; index < magentoGraphqlUrls.length; index += 1) {
      const upstreamUrl = magentoGraphqlUrls[index];
      const isLastUpstream = index === magentoGraphqlUrls.length - 1;

      try {
        const response = await fetch(upstreamUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });

        const responseText = await response.text();
        const { payload, isJson } = parseUpstreamPayload(responseText, response.status);

        if (!isLastUpstream && shouldRetryWithAnotherUpstream(response.status)) {
          lastError = new Error(`Upstream ${upstreamUrl} returned HTTP ${response.status}`);
          continue;
        }

        if (canCache && response.ok && isJson && isPayloadWorthCaching(payload)) {
          proxyCache.set(cacheKey, {
            expiresAt: Date.now() + GRAPHQL_PROXY_CACHE_TTL_MS,
            status: response.status,
            payload,
          });
        }

        return NextResponse.json(payload, {
          status: response.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Cache-Control': canCache
              ? 'public, max-age=120, s-maxage=120, stale-while-revalidate=60'
              : 'no-store',
            'X-GraphQL-Proxy-Cache': canCache ? 'MISS' : 'BYPASS',
            'X-GraphQL-Upstream-Format': isJson ? 'JSON' : 'TEXT',
            'X-GraphQL-Upstream': upstreamUrl,
          }
        });
      } catch (error) {
        lastError = error;

        if (!isLastUpstream && isTransientUpstreamError(error)) {
          continue;
        }

        throw error;
      }
    }

    throw (lastError ?? new Error('No GraphQL upstream available'));
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
