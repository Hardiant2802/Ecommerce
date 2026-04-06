import { GraphQLResponse } from '@/types/api';

// Use Next.js API route as proxy to avoid CORS issues
const GRAPHQL_ENDPOINT = '/api/graphql';

export interface GraphQLRequestOptions {
  query: string;
  variables?: Record<string, any>;
  token?: string;
  cache?: RequestCache;
  tags?: string[];
}

export async function graphqlClient<T>({
  query,
  variables,
  token,
  cache = 'no-store',
  tags = [],
}: GraphQLRequestOptions): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
      cache,
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

    return result.data;
  } catch (error) {
    console.error('GraphQL Client Error:', error);
    throw error;
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
