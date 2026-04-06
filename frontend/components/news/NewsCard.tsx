'use client';

import type { NewsArticle } from '@/types/news';
import { formatNewsDate } from '@/lib/services/news';

interface NewsCardProps {
  article: NewsArticle;
  className?: string;
}

export default function NewsCard({ article, className = '' }: NewsCardProps) {
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`block bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all duration-200 overflow-hidden ${className}`}
    >
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        {article.thumbnail && (
          <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={article.thumbnail}
              alt={article.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2 mb-2 hover:text-primary-600 transition-colors">
            {article.title}
          </h3>
          
          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2">
            {article.description}
          </p>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            {article.category && (
              <span className="inline-flex items-center px-2 py-1 bg-primary-50 text-primary-700 rounded">
                {article.category}
              </span>
            )}
            <span>{formatNewsDate(article.pubDate)}</span>
          </div>
        </div>
      </div>
    </a>
  );
}
