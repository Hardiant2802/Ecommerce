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
  const [videos, setVideos] = useState<VideoItem[]>(VIDEO_LIBRARY);
  const [activeIndex, setActiveIndex] = useState(0);
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
  const nextVideo =
    pendingIndex !== null
      ? visibleVideos[pendingIndex] || activeVideo
      : activeVideo;
  const highlightedVideoId =
    pendingIndex !== null ? (visibleVideos[pendingIndex]?.id || activeVideo.id) : activeVideo.id;

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const switchToIndex = useCallback((nextIndex: number) => {
    if (visibleVideos.length === 0) {
      return;
    }

    const normalized = ((nextIndex % visibleVideos.length) + visibleVideos.length) % visibleVideos.length;
    if (normalized === activeIndexRef.current) {
      return;
    }

    if (swipeTimerRef.current) {
      clearTimeout(swipeTimerRef.current);
      swipeTimerRef.current = null;
    }
    if (swipeRafRef.current !== null) {
      cancelAnimationFrame(swipeRafRef.current);
      swipeRafRef.current = null;
    }

    setSwipeDirection(normalized > activeIndexRef.current ? 1 : -1);
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
  }, [visibleVideos.length]);

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
    if (visibleVideos.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      const nextIndex = (activeIndexRef.current + 1) % visibleVideos.length;
      switchToIndex(nextIndex);
    }, AUTO_ROTATE_MS);

    return () => clearInterval(timer);
  }, [switchToIndex, visibleVideos.length]);

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

        if (!cancelled && normalized.length > 0) {
          setVideos(normalized);
        }
      } catch {
        // Keep current list when API is temporarily unavailable.
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
          <img
            src={activeVideo.banner}
            alt={activeVideo.title}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transform:
                pendingIndex !== null && isSwiping
                  ? swipeDirection === 1
                    ? 'translateX(-100%)'
                    : 'translateX(100%)'
                  : 'translateX(0)',
              transition: `transform ${SWIPE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/xiaomi17-pro.jpg';
            }}
          />

          {pendingIndex !== null && (
            <img
              src={nextVideo.banner}
              alt={nextVideo.title}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                transform:
                  isSwiping
                    ? 'translateX(0)'
                    : swipeDirection === 1
                      ? 'translateX(100%)'
                      : 'translateX(-100%)',
                transition: `transform ${SWIPE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
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
          <iframe
            key={activeVideo.id}
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?rel=0&modestbranding=1&playsinline=1`}
            title={activeVideo.title}
            frameBorder="0"
            allowFullScreen
          />
        </div>

        {/* Thumbnails */}
        <div className="h-[25%] flex gap-2 overflow-x-auto pb-1">
          {visibleVideos.map((video, index) => (
            <div
              key={video.id}
              onClick={() => switchToIndex(index)}
              className={`relative min-w-[118px] sm:min-w-[130px] flex-1 rounded-lg overflow-hidden cursor-pointer group border-2 transition-all 
                ${highlightedVideoId === video.id ? 'border-amber-500' : 'border-transparent'}`}
            >
              <img
                src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                alt={video.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/placeholder.svg';
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}