// News Service - VnExpress RSS Parser
import type { NewsData, NewsArticle } from '@/types/news';

const VNEXPRESS_RSS_URL = 'https://vnexpress.net/rss/kinh-doanh.rss';

/**
 * Fetch and parse VnExpress business news RSS feed
 * Note: Should be called from API routes to handle CORS
 */
export async function fetchBusinessNews(): Promise<NewsData> {
  try {
    const response = await fetch(VNEXPRESS_RSS_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS: ${response.status}`);
    }

    const xmlText = await response.text();
    const articles = parseVnExpressRSS(xmlText);

    return {
      articles,
      lastUpdated: new Date().toISOString(),
      source: 'VnExpress',
      channelTitle: 'VnExpress - Kinh Doanh',
      channelDescription: 'Tin tức kinh doanh mới nhất',
    };
  } catch (error) {
    throw new Error(`News fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse VnExpress RSS XML to structured article data
 */
export function parseVnExpressRSS(xmlText: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  
  // Extract items from RSS
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch;
  
  while ((itemMatch = itemRegex.exec(xmlText)) !== null) {
    const itemContent = itemMatch[1];
    
    // Extract fields from each item
    const title = extractTag(itemContent, 'title');
    const link = extractTag(itemContent, 'link');
    const description = extractTag(itemContent, 'description');
    const pubDate = extractTag(itemContent, 'pubDate');
    
    // Extract thumbnail from description (VnExpress embeds images in CDATA)
    const thumbnail = extractImageFromDescription(description);
    
    if (title && link) {
      articles.push({
        id: generateIdFromLink(link),
        title: cleanText(title),
        description: cleanDescription(description),
        link,
        pubDate: pubDate || new Date().toISOString(),
        thumbnail,
        category: 'Kinh Doanh',
      });
    }
  }
  
  return articles;
}

/**
 * Extract content from XML tag
 */
function extractTag(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}(?:[^>]*)><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tagName}>|<${tagName}(?:[^>]*)>([\\s\\S]*?)<\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? (match[1] || match[2] || '').trim() : '';
}

/**
 * Extract image URL from description HTML
 */
function extractImageFromDescription(description: string): string | undefined {
  const imgRegex = /<img[^>]+src="([^">]+)"/i;
  const match = description.match(imgRegex);
  return match ? match[1] : undefined;
}

/**
 * Clean HTML tags from text
 */
function cleanText(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * Clean description - remove images and limit length
 */
function cleanDescription(description: string): string {
  const cleaned = description
    .replace(/<img[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Limit to 200 characters
  if (cleaned.length > 200) {
    return cleaned.substring(0, 200) + '...';
  }
  
  return cleaned;
}

/**
 * Generate unique ID from article link
 */
function generateIdFromLink(link: string): string {
  const match = link.match(/(\d+)\.html/);
  return match ? match[1] : link.substring(link.length - 10);
}

/**
 * Format date for display
 */
export function formatNewsDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) {
    return `${diffMins} phút trước`;
  } else if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  } else if (diffDays < 7) {
    return `${diffDays} ngày trước`;
  } else {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}

/**
 * Get excerpt from article description
 */
export function getExcerpt(description: string, maxLength: number = 150): string {
  if (description.length <= maxLength) return description;
  return description.substring(0, maxLength).trim() + '...';
}
