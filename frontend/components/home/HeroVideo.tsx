'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface VideoItem {
  id: string;
  title: string;
  banner: string;
  publishedAt?: string;
}

interface LatestVideosApiResponse {
  data?: {
    videos?: VideoItem[];
  };
}

const VIDEO_LIBRARY: VideoItem[] = [
  { id: 'VoBBKzE1O1s', title: 'iPhone 17 Pro Max', banner: 'https://img.youtube.com/vi/VoBBKzE1O1s/maxresdefault.jpg' },
  { id: 'y2bqmnB75Rk', title: 'Samsung Galaxy S26 Ultra', banner: 'https://img.youtube.com/vi/y2bqmnB75Rk/maxresdefault.jpg' },
  { id: 'vGRbugSOdmw', title: 'Xiaomi 17 Ultra', banner: 'https://img.youtube.com/vi/vGRbugSOdmw/maxresdefault.jpg' },
  { id: 'JkRXhe3KaPE', title: 'OnePlus 13 Review', banner: 'https://img.youtube.com/vi/JkRXhe3KaPE/maxresdefault.jpg' },
];

const HERO_ITEM_LIMIT = 12;
const AUTO_ROTATE_MS = 5500;
const FETCH_REFRESH_MS = 15 * 60 * 1000;
const SWIPE_MS = 520;
const SWIPE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

function normalizeVideos(input: VideoItem[]): VideoItem[] {
  const seen = new Set<string>();
  return input
    .filter((video) => {
      if (!video?.id || seen.has(video.id)) {
        return false;
      }
      seen.add(video.id);
      return true;
    })
    .map((video) => ({
      ...video,
      banner: video.banner || `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`,
    }));
}

export default function HeroVideo() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [isLibraryLoading, setIsLibraryLoading] = useState(true);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [isBannerLoading, setIsBannerLoading] = useState(true);
  const [thumbnailLoading, setThumbnailLoading] = useState<Record<string, boolean>>({});
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<1 | -1>(1);
  const activeIndexRef = useRef(0);
  const swipeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeRafRef = useRef<number | null>(null);

  const visibleVideos = useMemo(
    () => normalizeVideos(videos).slice(0, HERO_ITEM_LIMIT),
    [videos]
  );

  const activeVideo = visibleVideos[activeIndex] || visibleVideos[0] || VIDEO_LIBRARY[0];
  const selectedVideo =
    visibleVideos.find((video) => video.id === selectedVideoId) ||
    visibleVideos[0] ||
    VIDEO_LIBRARY[0];
  const nextVideo =
    pendingIndex !== null
      ? visibleVideos[pendingIndex] || activeVideo
      : activeVideo;
  const highlightedVideoId = selectedVideo.id;
  const swipeTransition = `transform ${SWIPE_MS}ms ${SWIPE_EASING}`;

  useEffect(() => {
    setThumbnailLoading((previous) => {
      const next: Record<string, boolean> = {};
      for (const video of visibleVideos) {
        next[video.id] = previous[video.id] ?? true;
      }
      return next;
    });
  }, [visibleVideos]);

  useEffect(() => {
    setIsPlayerLoading(true);
  }, [selectedVideo.id]);

  useEffect(() => {
    if (visibleVideos.length === 0) {
      setSelectedVideoId(null);
      return;
    }

    setSelectedVideoId((current) => {
      if (current && visibleVideos.some((video) => video.id === current)) {
        return current;
      }
      return visibleVideos[0].id;
    });
    setIsPlayerLoading(true);
  }, [visibleVideos]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const switchToIndex = useCallback((nextIndex: number) => {
    if (visibleVideos.length === 0) {
      return;
    }
    if (pendingIndex !== null) {
      return;
    }

    const normalized = ((nextIndex % visibleVideos.length) + visibleVideos.length) % visibleVideos.length;
    if (normalized === activeIndexRef.current) {
      return;
    }

    const current = activeIndexRef.current;
    const forwardDistance = (normalized - current + visibleVideos.length) % visibleVideos.length;
    const backwardDistance = (current - normalized + visibleVideos.length) % visibleVideos.length;

    if (swipeTimerRef.current) {
      clearTimeout(swipeTimerRef.current);
      swipeTimerRef.current = null;
    }
    if (swipeRafRef.current !== null) {
      cancelAnimationFrame(swipeRafRef.current);
      swipeRafRef.current = null;
    }

    setSwipeDirection(forwardDistance <= backwardDistance ? 1 : -1);
    setPendingIndex(normalized);
    setIsSwiping(false);

    swipeRafRef.current = requestAnimationFrame(() => {
      setIsSwiping(true);
    });

    swipeTimerRef.current = setTimeout(() => {
      activeIndexRef.current = normalized;
      setActiveIndex(normalized);
      setPendingIndex(null);
      setIsSwiping(false);
      swipeRafRef.current = null;
    }, SWIPE_MS + 20);
  }, [pendingIndex, visibleVideos.length]);

  useEffect(() => {
    if (activeIndex < visibleVideos.length) {
      return;
    }
    activeIndexRef.current = 0;
    setActiveIndex(0);
    setPendingIndex(null);
    setIsSwiping(false);
  }, [activeIndex, visibleVideos.length]);

  useEffect(() => {
    if (visibleVideos.length <= 1 || pendingIndex !== null) {
      return;
    }

    const timer = setTimeout(() => {
      const nextIndex = (activeIndexRef.current + 1) % visibleVideos.length;
      switchToIndex(nextIndex);
    }, AUTO_ROTATE_MS);

    return () => clearTimeout(timer);
  }, [activeIndex, pendingIndex, switchToIndex, visibleVideos.length]);

  useEffect(() => {
    return () => {
      if (swipeTimerRef.current) {
        clearTimeout(swipeTimerRef.current);
      }
      if (swipeRafRef.current !== null) {
        cancelAnimationFrame(swipeRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchLatestVideos = async () => {
      try {
        const response = await fetch('/api/videos/latest?limit=12', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }

        const payload: LatestVideosApiResponse = await response.json();
        const remoteVideos = payload?.data?.videos || [];
        const normalized = normalizeVideos(remoteVideos);

        if (!cancelled) {
          setVideos(normalized.length > 0 ? normalized : VIDEO_LIBRARY);
        }
      } catch {
        // Keep current list when API is temporarily unavailable.
        if (!cancelled) {
          setVideos(VIDEO_LIBRARY);
        }
      } finally {
        if (!cancelled) {
          setIsLibraryLoading(false);
        }
      }
    };

    fetchLatestVideos();
    const refreshTimer = setInterval(fetchLatestVideos, FETCH_REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(refreshTimer);
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[400px]">
      {/* Cột Trái: Banner */}
      <div className="w-full lg:w-[65%] h-[200px] sm:h-[300px] lg:h-full rounded-xl overflow-hidden shadow-sm bg-gray-100">
        <div className="relative w-full h-full">
          {(isLibraryLoading || isBannerLoading) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/35 text-white">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                Đang tải ảnh...
              </div>
            </div>
          )}
          <img
            src={activeVideo.banner}
            alt={activeVideo.title}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${(isLibraryLoading || isBannerLoading) ? 'opacity-0' : 'opacity-100'}`}
            style={{
              transform:
                pendingIndex !== null && isSwiping
                  ? swipeDirection === 1
                    ? 'translate3d(-100%, 0, 0)'
                    : 'translate3d(100%, 0, 0)'
                  : 'translate3d(0, 0, 0)',
              transition: pendingIndex !== null ? swipeTransition : 'none',
              willChange: pendingIndex !== null ? 'transform' : 'auto',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/xiaomi17-pro.jpg';
              setIsBannerLoading(false);
            }}
            onLoad={() => setIsBannerLoading(false)}
          />

          {pendingIndex !== null && (
            <img
              src={nextVideo.banner}
              alt={nextVideo.title}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                transform:
                  isSwiping
                    ? 'translate3d(0, 0, 0)'
                    : swipeDirection === 1
                      ? 'translate3d(100%, 0, 0)'
                      : 'translate3d(-100%, 0, 0)',
                transition: swipeTransition,
                willChange: 'transform',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/xiaomi17-pro.jpg';
              }}
            />
          )}
        </div>
      </div>

      {/* Cột Phải: Video Area */}
      <div className="w-full lg:w-[35%] flex flex-col gap-2 h-[400px] lg:h-full">
        <div className="flex-1 rounded-xl overflow-hidden relative shadow-sm bg-black border border-gray-100">
          {(isLibraryLoading || isPlayerLoading) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/65 text-white">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                Đang tải nội dung...
              </div>
            </div>
          )}
          <iframe
            className={`absolute inset-0 w-full h-full transition-opacity duration-200 ${(isLibraryLoading || isPlayerLoading) ? 'opacity-0' : 'opacity-100'}`}
            src={`https://www.youtube-nocookie.com/embed/${selectedVideo.id}?rel=0&modestbranding=1&playsinline=1`}
            title={selectedVideo.title}
            frameBorder="0"
            allowFullScreen
            onLoad={() => setIsPlayerLoading(false)}
          />
        </div>

        {/* Thumbnails */}
        <div className="h-[25%] flex gap-2 overflow-x-auto pb-1">
          {isLibraryLoading
            ? Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`hero-thumb-skeleton-${index}`}
                className="relative min-w-[118px] sm:min-w-[130px] flex-1 rounded-lg overflow-hidden border border-white/20 bg-gray-900/55 animate-pulse"
              >
                <div className="absolute inset-0 flex items-center justify-center text-white/80">
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                </div>
              </div>
            ))
            : visibleVideos.map((video) => (
              <div
                key={video.id}
                onClick={() => {
                  setIsPlayerLoading(true);
                  setSelectedVideoId(video.id);
                }}
                className={`relative min-w-[118px] sm:min-w-[130px] flex-1 rounded-lg overflow-hidden cursor-pointer group border-2 transition-all 
                  ${highlightedVideoId === video.id ? 'border-amber-500' : 'border-transparent'}`}
              >
                {thumbnailLoading[video.id] && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/45 text-white">
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                  </div>
                )}
                <img
                  src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                  className={`w-full h-full object-cover group-hover:opacity-80 transition-opacity ${thumbnailLoading[video.id] ? 'opacity-0' : 'opacity-100'}`}
                  alt={video.title}
                  onLoad={() => {
                    setThumbnailLoading((previous) => ({
                      ...previous,
                      [video.id]: false,
                    }));
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/placeholder.svg';
                    setThumbnailLoading((previous) => ({
                      ...previous,
                      [video.id]: false,
                    }));
                  }}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}