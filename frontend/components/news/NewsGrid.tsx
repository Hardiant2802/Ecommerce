'use client';

import { useNews } from '@/lib/hooks';
import NewsCard from './NewsCard';
import Card from '@/components/ui/Card';

interface NewsGridProps {
  limit?: number;
  className?: string;
}

export default function NewsGrid({ limit = 6, className = '' }: NewsGridProps) {
  const { articles, loading, error } = useNews({ limit });

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Tin Tức Kinh Doanh</h2>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <div className="animate-pulse flex gap-4">
                <div className="w-32 h-32 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <div className="text-red-600 text-sm">
          <p className="font-semibold">Không thể tải tin tức</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </Card>
    );
  }

  if (articles.length === 0) {
    return (
      <Card className={className}>
        <p className="text-gray-500 text-center py-8">
          Không có tin tức nào
        </p>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Tin Tức Kinh Doanh</h2>
        <a
          href="https://vnexpress.net/kinh-doanh"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Xem tất cả →
        </a>
      </div>
      
      <div className="grid gap-4">
        {articles.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
