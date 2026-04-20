import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface VideoItem {
  id: string;
  title: string;
  banner: string;
  publishedAt?: string;
}

interface LatestVideosResponse {
  data: {
    channelId: string | null;
    videos: VideoItem[];
  };
  source: 'youtube-rss' | 'youtube-rss-multi' | 'fallback';
  cached: boolean;
  timestamp: number;
  error?: string;
}

const CACHE_DURATION = 15 * 60 * 1000;
const REQUESTED_TECH_CHANNEL_IDS = [
  'UCEeXA5Tu7n9X5_zkOgGsyww', // Vat Vo Studio
  'UCOIQz3h1TAaI9fIdPKkaB2Q', // MobileCity official
  'UCilo7PrAr98E2yhUlh5AmEA', // MC Studio
  'UCOygiQNXiiQ_rpRjHU5ri-A', // Duy Tham (Ngo Duc Duy)
];

const FALLBACK_VIDEOS: VideoItem[] = [
  { id: 'yxmR_B2aOdw', title: 'Vật Vờ Studio', banner: 'https://img.youtube.com/vi/yxmR_B2aOdw/maxresdefault.jpg' },
  { id: 'ncIEXFRXYu8', title: 'Vật Vờ Studio', banner: 'https://img.youtube.com/vi/ncIEXFRXYu8/maxresdefault.jpg' },
  { id: 'BVWgzHhOzcU', title: 'MC Studio', banner: 'https://img.youtube.com/vi/BVWgzHhOzcU/maxresdefault.jpg' },
  { id: 'DUiwR51Kh3A', title: 'Duy Thẩm', banner: 'https://img.youtube.com/vi/DUiwR51Kh3A/maxresdefault.jpg' },
  { id: 'rl4qjFqwPw8', title: 'Duy Thẩm', banner: 'https://img.youtube.com/vi/rl4qjFqwPw8/maxresdefault.jpg' },
];

let cachedData: LatestVideosResponse | null = null;
let cacheTimestamp = 0;

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseFeedVideos(xml: string, limit: number): VideoItem[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  const results: VideoItem[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);

    const id = idMatch?.[1]?.trim();
    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    results.push({
      id,
      title: decodeXmlEntities(titleMatch?.[1] || 'YouTube Video'),
      banner: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
      publishedAt: publishedMatch?.[1]?.trim(),
    });

    if (results.length >= limit) {
      break;
    }
  }

  return results;
}

function getChannelIdFromEnv(): string | null {
  const value =
    process.env.YOUTUBE_CHANNEL_ID ||
    process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID ||
    null;

  if (!value) {
    return null;
  }

  return /^UC[\w-]{22}$/.test(value) ? value : null;
}

async function fetchLatestVideos(channelId: string, limit: number): Promise<VideoItem[]> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  const response = await fetch(feedUrl, {
    headers: {
      Accept: 'application/atom+xml,application/xml,text/xml',
      'User-Agent': 'Mozilla/5.0 (AHPhoneStoreBot/1.0)',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch YouTube feed: ${response.status}`);
  }

  const xml = await response.text();
  return parseFeedVideos(xml, limit);
}

function mergeUniqueVideos(sources: VideoItem[][], limit: number): VideoItem[] {
  const deduped = new Map<string, VideoItem>();

  for (const list of sources) {
    for (const video of list) {
      if (!video?.id || deduped.has(video.id)) {
        continue;
      }
      deduped.set(video.id, video);
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => {
      const da = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const db = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return db - da;
    })
    .slice(0, limit);
}

function buildFallbackResponse(limit: number, now: number, error?: string): LatestVideosResponse {
  return {
    data: {
      channelId: null,
      videos: FALLBACK_VIDEOS.slice(0, limit),
    },
    source: 'fallback',
    cached: false,
    timestamp: now,
    error,
  };
}

export async function GET(request: NextRequest) {
  const now = Date.now();
  const requestedLimit = Number.parseInt(request.nextUrl.searchParams.get('limit') || '6', 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 12)
    : 6;

  if (cachedData && now - cacheTimestamp < CACHE_DURATION) {
    return NextResponse.json({
      ...cachedData,
      cached: true,
      data: {
        ...cachedData.data,
        videos: cachedData.data.videos.slice(0, limit),
      },
    });
  }

  try {
    const envChannelId = getChannelIdFromEnv();
    const channelCandidates = [
      ...(envChannelId ? [envChannelId] : []),
      ...REQUESTED_TECH_CHANNEL_IDS,
    ].filter((id, index, arr) => arr.indexOf(id) === index);

    const sourceLists: VideoItem[][] = [];
    for (const channelId of channelCandidates) {
      try {
        const videos = await fetchLatestVideos(channelId, Math.max(6, limit));
        if (videos.length > 0) {
          sourceLists.push(videos);
        }
      } catch {
        // Ignore single source failure and continue.
      }

      if (mergeUniqueVideos(sourceLists, limit).length >= limit) {
        break;
      }
    }

    const videos = mergeUniqueVideos(sourceLists, limit);
    if (videos.length === 0) {
      throw new Error('Không có video mới hợp lệ từ các feed YouTube');
    }

    const response: LatestVideosResponse = {
      data: {
        channelId: channelCandidates[0] || null,
        videos,
      },
      source: sourceLists.length > 1 ? 'youtube-rss-multi' : 'youtube-rss',
      cached: false,
      timestamp: now,
    };

    cachedData = response;
    cacheTimestamp = now;

    return NextResponse.json(response);
  } catch (error) {
    console.error('Latest videos API error:', error);

    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        cached: true,
        data: {
          ...cachedData.data,
          videos: cachedData.data.videos.slice(0, limit),
        },
      });
    }

    const fallback = buildFallbackResponse(
      limit,
      now,
      error instanceof Error ? error.message : 'Không thể lấy video mới từ YouTube'
    );

    return NextResponse.json(fallback);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}