// Business News Types (VnExpress RSS)

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  thumbnail?: string;
  category?: string;
  author?: string;
}

export interface NewsData {
  articles: NewsArticle[];
  lastUpdated: string;
  source: string;
  channelTitle?: string;
  channelDescription?: string;
}

export interface NewsApiResponse {
  data?: NewsData;
  error?: string;
  cached?: boolean;
  timestamp?: number;
}

export interface NewsFilters {
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}
