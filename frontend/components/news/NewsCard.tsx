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
      className={`block bg-white rounded-lg border border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg transition-all duration-200 overflow-hidden ${className}`}
    >
      <div className="flex flex-col gap-3 p-3 min-[460px]:flex-row min-[460px]:gap-4 sm:p-4">
        {/* Thumbnail */}
        {article.thumbnail && (
          <div className="h-40 w-full flex-shrink-0 overflow-hidden rounded-md bg-slate-100 min-[460px]:h-24 min-[460px]:w-24 sm:h-32 sm:w-32">
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
          <h3 className="font-semibold text-slate-900 text-sm sm:text-base line-clamp-2 mb-2 hover:text-primary-700 transition-colors">
            {article.title}
          </h3>
          
          <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mb-2">
            {article.description}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:gap-3">
            {article.category && (
              <span className="inline-flex items-center px-2 py-1 bg-primary-50 text-primary-800 rounded">
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
