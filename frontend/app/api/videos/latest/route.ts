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

// Fallback video IDs khi YouTube RSS bị block từ VPS
// Các video review điện thoại từ kênh Vật Vờ Studio (verified real IDs)
const FALLBACK_VIDEOS: VideoItem[] = [
  { id: 'fKtzAtNhcPs', title: 'Đánh giá iOS 26.5 chính thức: Bản cập nhật tốt nhất', banner: 'https://img.youtube.com/vi/fKtzAtNhcPs/maxresdefault.jpg', publishedAt: '2026-05-01T00:00:00Z' },
  { id: 'obeSaIXKoKQ', title: 'Đánh giá Galaxy S24 Ultra sau 2 năm: Hàng cũ ngon thật', banner: 'https://img.youtube.com/vi/obeSaIXKoKQ/maxresdefault.jpg', publishedAt: '2026-04-20T00:00:00Z' },
  { id: 'ccvFfEoQIPA', title: 'Tất Cả Về iOS 27 Tháng Sau Ra Mắt: Tối Ưu Pin, Ổn Định Hơn', banner: 'https://img.youtube.com/vi/ccvFfEoQIPA/maxresdefault.jpg', publishedAt: '2026-04-15T00:00:00Z' },
  { id: 'L2eCLrXeV-w', title: 'Đánh giá OPPO Pad mini: Bạn và tôi đều muốn chiếc máy này', banner: 'https://img.youtube.com/vi/L2eCLrXeV-w/maxresdefault.jpg', publishedAt: '2026-04-10T00:00:00Z' },
  { id: '1M83GfOJ4X8', title: 'Chờ 2 năm để lên đời Galaxy S26 Ultra từ S24 Ultra: Đáng giá?', banner: 'https://img.youtube.com/vi/1M83GfOJ4X8/maxresdefault.jpg', publishedAt: '2026-04-05T00:00:00Z' },
  { id: 'WopU2HJ97f0', title: 'So sánh Galaxy S26 Ultra và Find X9 Ultra', banner: 'https://img.youtube.com/vi/WopU2HJ97f0/maxresdefault.jpg', publishedAt: '2026-04-01T00:00:00Z' },
  { id: 'hEVBeIzRmeE', title: 'Còn nên mua iPhone 15 Pro trong năm 2026?', banner: 'https://img.youtube.com/vi/hEVBeIzRmeE/maxresdefault.jpg', publishedAt: '2026-03-25T00:00:00Z' },
  { id: 'w03-BTN3z-4', title: 'Đánh giá OPPO Find X9 Ultra sau 7 ngày: Flagship Android 500$', banner: 'https://img.youtube.com/vi/w03-BTN3z-4/maxresdefault.jpg', publishedAt: '2026-03-20T00:00:00Z' },
  { id: 'oOOqZiu_xCc', title: 'Kiểm Chứng Đồ Công Nghệ Săn Sale của Vật Vờ Studio', banner: 'https://img.youtube.com/vi/oOOqZiu_xCc/maxresdefault.jpg', publishedAt: '2026-03-15T00:00:00Z' },
  { id: 'qoY43zu5ArI', title: 'Belkin BoostCharge Pro 67W siêu nhỏ, sạc thoải mái 2 máy', banner: 'https://img.youtube.com/vi/qoY43zu5ArI/maxresdefault.jpg', publishedAt: '2026-03-10T00:00:00Z' },
  { id: '6uGH_e5k0sU', title: 'Đánh giá Galaxy Z Fold7 sau 9 tháng: Không đua thông số', banner: 'https://img.youtube.com/vi/6uGH_e5k0sU/maxresdefault.jpg', publishedAt: '2026-03-05T00:00:00Z' },
  { id: 'C0eaJkTohw4', title: 'Tin tức công nghệ mới nhất', banner: 'https://img.youtube.com/vi/C0eaJkTohw4/maxresdefault.jpg', publishedAt: '2026-03-01T00:00:00Z' },
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
    // Nếu RSS không lấy được, dùng fallback videos
    const sourcePool = mergedVideos.length > 0 ? mergedVideos : FALLBACK_VIDEOS;
    const videos = selectVideosForScope(sourcePool, limit, requestedScopeKey);
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

    // Dùng fallback videos khi RSS bị block
    const fallbackVideos = selectVideosForScope(FALLBACK_VIDEOS, limit, requestedScopeKey);
    return NextResponse.json({
      data: {
        channelId: null,
        videos: fallbackVideos,
      },
      source: 'youtube-rss',
      cached: false,
      timestamp: now,
    } satisfies LatestVideosResponse);
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