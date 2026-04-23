import { GraphQLResponse } from '@/types/api';

// Use Next.js API route as proxy to avoid CORS issues
const GRAPHQL_ENDPOINT = '/api/graphql';

export interface GraphQLRequestOptions {
  query: string;
  variables?: Record<string, any>;
  token?: string;
  cache?: RequestCache;
  tags?: string[];
  ttlMs?: number;
  signal?: AbortSignal;
}

const BROWSER_CACHE_PREFIX = 'graphql-cache:v1:';
const memoryCache = new Map<string, { expiresAt: number; data: unknown }>();
const inFlightRequests = new Map<string, Promise<unknown>>();

function createCacheKey(query: string, variables?: Record<string, any>): string {
  return `${BROWSER_CACHE_PREFIX}${JSON.stringify([query, variables || {}])}`;
}

function getCachedValue<T>(cacheKey: string): T | null {
  const now = Date.now();
  const memoryItem = memoryCache.get(cacheKey);
  if (memoryItem && memoryItem.expiresAt > now) {
    return memoryItem.data as T;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(cacheKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { expiresAt: number; data: T };
    if (parsed.expiresAt <= now) {
      window.sessionStorage.removeItem(cacheKey);
      return null;
    }

    memoryCache.set(cacheKey, {
      expiresAt: parsed.expiresAt,
      data: parsed.data,
    });
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedValue<T>(cacheKey: string, data: T, ttlMs: number): void {
  if (ttlMs <= 0) {
    return;
  }

  const payload = {
    expiresAt: Date.now() + ttlMs,
    data,
  };

  memoryCache.set(cacheKey, payload);

  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch {
    // Ignore storage quota/security errors and keep in-memory cache only.
  }
}

export async function graphqlClient<T>({
  query,
  variables,
  token,
  cache = 'no-store',
  tags = [],
  ttlMs = 90_000,
  signal,
}: GraphQLRequestOptions): Promise<T> {
  const canUseBrowserCache = typeof window !== 'undefined' && !token && ttlMs > 0 && cache !== 'no-store';
  const cacheKey = canUseBrowserCache ? createCacheKey(query, variables) : '';

  if (canUseBrowserCache) {
    const cachedValue = getCachedValue<T>(cacheKey);
    if (cachedValue) {
      return cachedValue;
    }

    const existingRequest = inFlightRequests.get(cacheKey);
    if (existingRequest) {
      return existingRequest as Promise<T>;
    }
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const doRequest = async () => {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
      cache,
      signal,
      ...(tags.length > 0 && { next: { tags } }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors) {
      console.error('GraphQL Errors:', result.errors);
      throw new Error(result.errors[0]?.message || 'GraphQL error occurred');
    }

    if (!result.data) {
      throw new Error('No data returned from GraphQL');
    }

    if (canUseBrowserCache) {
      setCachedValue(cacheKey, result.data, ttlMs);
    }

    return result.data;
  };

  try {
    if (canUseBrowserCache) {
      const requestPromise = doRequest();
      inFlightRequests.set(cacheKey, requestPromise as Promise<unknown>);
      const data = await requestPromise;
      return data;
    }

    return await doRequest();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    console.error('GraphQL Client Error:', error);
    throw error;
  } finally {
    if (canUseBrowserCache) {
      inFlightRequests.delete(cacheKey);
    }
  }
}

// Helper for client-side requests with error handling
export async function graphqlClientSafe<T>(
  options: GraphQLRequestOptions
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await graphqlClient<T>(options);
    return { data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return { data: null, error: message };
  }
}
