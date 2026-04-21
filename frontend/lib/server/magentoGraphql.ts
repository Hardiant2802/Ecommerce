const DEFAULT_MAGENTO_GRAPHQL_URL = 'https://ahphonestore.id.vn/graphql';
const FALLBACK_MAGENTO_GRAPHQL_URL = 'https://www.ahphonestore.id.vn/graphql';

interface MagentoGraphqlError {
  message?: string;
}

interface MagentoGraphqlResponse<T> {
  data?: T;
  errors?: MagentoGraphqlError[];
}

export function resolveMagentoGraphqlUrl(requestUrl?: URL): string {
  const rawUrl = process.env.NEXT_PUBLIC_MAGENTO_GRAPHQL_URL;
  const candidateUrl = rawUrl || DEFAULT_MAGENTO_GRAPHQL_URL;

  try {
    const targetUrl = new URL(candidateUrl);
    const hostname = targetUrl.hostname.toLowerCase();

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

    if (
      requestUrl &&
      hostname === requestUrl.hostname.toLowerCase() &&
      targetUrl.port === requestUrl.port &&
      targetUrl.pathname === '/api/graphql'
    ) {
      return FALLBACK_MAGENTO_GRAPHQL_URL;
    }
  } catch {
    return FALLBACK_MAGENTO_GRAPHQL_URL;
  }

  return candidateUrl;
}

export async function magentoGraphqlRequest<T>(params: {
  requestUrl?: URL;
  query: string;
  variables?: Record<string, unknown>;
  token?: string;
}): Promise<T> {
  const { requestUrl, query, variables, token } = params;
  const endpoint = resolveMagentoGraphqlUrl(requestUrl);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Store: process.env.NEXT_PUBLIC_MAGENTO_STORE_CODE || 'default',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  let payload: MagentoGraphqlResponse<T> | null = null;
  try {
    payload = (await response.json()) as MagentoGraphqlResponse<T>;
  } catch {
    payload = null;
  }

  if (payload?.errors?.length) {
    throw new Error(payload.errors[0]?.message || 'Magento GraphQL error');
  }

  if (!response.ok) {
    throw new Error(`Magento request failed with HTTP ${response.status}`);
  }

  if (!payload?.data) {
    throw new Error('Magento returned empty response data');
  }

  return payload.data;
}
