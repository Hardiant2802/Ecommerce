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
  source: 'youtube-rss' | 'youtube-rss-multi';
  cached: boolean;
  timestamp: number;
  error?: string;
}

const CACHE_DURATION = 15 * 60 * 1000;
const SLOT_ROTATION_POOL_FACTOR = 3;
const REQUESTED_TECH_CHANNEL_IDS = [
  'UCEeXA5Tu7n9X5_zkOgGsyww', // Vat Vo Studio
  'UCOIQz3h1TAaI9fIdPKkaB2Q', // MobileCity official
  'UCilo7PrAr98E2yhUlh5AmEA', // MC Studio
  'UCOygiQNXiiQ_rpRjHU5ri-A', // Duy Tham (Ngo Duc Duy)
];

let cachedData: LatestVideosResponse | null = null;
let cacheTimestamp = 0;
let cacheScopeKey: string | null = null;

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function isYouTubeShortEntry(title: string, alternateUrl: string): boolean {
  const normalizedUrl = alternateUrl.toLowerCase();
  if (normalizedUrl.includes('/shorts/')) {
    return true;
  }

  const normalizedTitle = title.toLowerCase();
  return /(^|\s)#shorts?\b/.test(normalizedTitle);
}

function parseFeedVideos(xml: string, limit: number): VideoItem[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  const results: VideoItem[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const alternateLinkMatch =
      entry.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"[^>]*\/>/i)
      || entry.match(/<link[^>]*href="([^"]+)"[^>]*rel="alternate"[^>]*\/>/i);

    const id = idMatch?.[1]?.trim();
    if (!id || seen.has(id)) {
      continue;
    }

    const decodedTitle = decodeXmlEntities(titleMatch?.[1] || 'YouTube Video');
    const alternateUrl = alternateLinkMatch?.[1]?.trim() || '';
    if (isYouTubeShortEntry(decodedTitle, alternateUrl)) {
      continue;
    }

    seen.add(id);
    results.push({
      id,
      title: decodedTitle,
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

function mergeUniqueVideos(sources: VideoItem[][]): VideoItem[] {
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
    });
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function selectVideosForScope(videos: VideoItem[], limit: number, scopeKey: string | null): VideoItem[] {
  if (videos.length <= limit) {
    return videos.slice(0, limit);
  }

  if (!scopeKey) {
    return videos.slice(0, limit);
  }

  const poolSize = Math.min(videos.length, Math.max(limit * SLOT_ROTATION_POOL_FACTOR, limit));
  const pool = videos.slice(0, poolSize);

  return [...pool]
    .sort((a, b) => hashString(`${scopeKey}:${a.id}`) - hashString(`${scopeKey}:${b.id}`))
    .slice(0, limit);
}

export async function GET(request: NextRequest) {
  const now = Date.now();
  const requestedScopeSlot = request.nextUrl.searchParams.get('slot')?.trim() || null;
  const requestedDay = request.nextUrl.searchParams.get('day')?.trim() || null;
  const requestedScopeKey = requestedScopeSlot || requestedDay;
  const requestedLimit = Number.parseInt(request.nextUrl.searchParams.get('limit') || '6', 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 12)
    : 6;

  const isSameRequestedScope = !requestedScopeKey || cacheScopeKey === requestedScopeKey;

  if (cachedData && now - cacheTimestamp < CACHE_DURATION && isSameRequestedScope) {
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
        const fetchLimit = Math.max(8, limit * SLOT_ROTATION_POOL_FACTOR);
        const videos = await fetchLatestVideos(channelId, fetchLimit);
        if (videos.length > 0) {
          sourceLists.push(videos);
        }
      } catch {
        // Ignore single source failure and continue.
      }

      const pooledEnough = mergeUniqueVideos(sourceLists).length >= Math.max(limit, limit * SLOT_ROTATION_POOL_FACTOR);
      if (pooledEnough) {
        break;
      }
    }

    const mergedVideos = mergeUniqueVideos(sourceLists);
    const videos = selectVideosForScope(mergedVideos, limit, requestedScopeKey);
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
  cacheScopeKey = requestedScopeKey;

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

    return NextResponse.json(
      {
        data: {
          channelId: null,
          videos: [],
        },
        source: 'youtube-rss',
        cached: false,
        timestamp: now,
        error: error instanceof Error ? error.message : 'Không thể lấy video mới từ YouTube',
      } satisfies LatestVideosResponse,
      { status: 503 }
    );
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