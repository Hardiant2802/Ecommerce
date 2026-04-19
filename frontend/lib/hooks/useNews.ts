// useNews Hook - Fetch news from API
'use client';

import { useState, useEffect } from 'react';
import type { NewsArticle, NewsData } from '@/types/news';

interface UseNewsOptions {
  limit?: number;
  enabled?: boolean;
}

interface UseNewsReturn {
  articles: NewsArticle[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  refetch: () => void;
}

export function useNews(options: UseNewsOptions = {}): UseNewsReturn {
  const { limit = 10, enabled = true } = options;
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const fetchNews = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
        });

        const response = await fetch(`/api/news?${params}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        if (data.data) {
          setArticles(data.data.articles);
          setLastUpdated(data.data.lastUpdated);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể lấy tin tức');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [limit, enabled, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return { articles, loading, error, lastUpdated, refetch };
}
