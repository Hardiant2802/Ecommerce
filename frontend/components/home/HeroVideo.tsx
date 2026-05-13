'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

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

const HERO_ITEM_LIMIT = 12;
const HOUR_REFRESH_MS = 60 * 60 * 1000;
const BANNER_ROTATE_MS = 5_000;
const BANNER_SLIDE_MS = 1400;
const BANNER_SWIPE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

function getCurrentHourSlotKey(date: Date = new Date()): string {
  const slotTime = new Date(date);
  slotTime.setMinutes(0, 0, 0);
  return slotTime.toISOString().slice(0, 13);
}

function getMsUntilNextHour(date: Date = new Date()): number {
  const nextHour = new Date(date);
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return Math.max(1000, nextHour.getTime() - date.getTime());
}

function normalizeVideos(input: VideoItem[]): VideoItem[] {
  const seen = new Set<string>();
  return input
    .filter((video) => {
      if (!video?.id || !video?.banner?.trim() || seen.has(video.id)) {
        return false;
      }
      seen.add(video.id);
      return true;
    })
    .map((video) => ({
      ...video,
      banner: video.banner.trim(),
    }));
}

export default function HeroVideo() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [bannerVideoId, setBannerVideoId] = useState<string | null>(null);
  const [pendingBannerVideoId, setPendingBannerVideoId] = useState<string | null>(null);
  const [isBannerSliding, setIsBannerSliding] = useState(false);
  const [isBannerSlideActive, setIsBannerSlideActive] = useState(false);
  const [bannerSlideDirection, setBannerSlideDirection] = useState<1 | -1>(1);
  const [isLibraryLoading, setIsLibraryLoading] = useState(true);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [thumbnailLoading, setThumbnailLoading] = useState<Record<string, boolean>>({});
  const [bannerLoading, setBannerLoading] = useState<Record<string, boolean>>({});
  const pendingBannerIdRef = useRef<string | null>(null);

  const visibleVideos = useMemo(
    () => normalizeVideos(videos).slice(0, HERO_ITEM_LIMIT),
    [videos]
  );

  const selectedVideo =
    visibleVideos.find((video) => video.id === selectedVideoId) || visibleVideos[0] || null;
  const activeBannerVideo =
    visibleVideos.find((video) => video.id === bannerVideoId) || visibleVideos[0] || null;
  const pendingBannerVideo =
    visibleVideos.find((video) => video.id === pendingBannerVideoId) || null;
  const highlightedVideoId = selectedVideo?.id || '';

  useEffect(() => {
    setThumbnailLoading((previous) => {
      const next: Record<string, boolean> = {};
      for (const video of visibleVideos) {
        next[video.id] = previous[video.id] ?? true;
      }
      return next;
    });

    setBannerLoading((previous) => {
      const next: Record<string, boolean> = {};
      for (const video of visibleVideos) {
        next[video.id] = previous[video.id] ?? true;
      }
      return next;
    });

    for (const video of visibleVideos) {
      const preload = new Image();
      preload.src = video.banner;
      preload.onload = () => {
        setBannerLoading((current) => ({
          ...current,
          [video.id]: false,
        }));
      };
      preload.onerror = () => {
        setBannerLoading((current) => ({
          ...current,
          [video.id]: false,
        }));
      };
    }
  }, [visibleVideos]);

  useEffect(() => {
    if (visibleVideos.length === 0) {
      setSelectedVideoId(null);
      setBannerVideoId(null);
      setPendingBannerVideoId(null);
      setIsBannerSliding(false);
      setIsBannerSlideActive(false);
      pendingBannerIdRef.current = null;
      return;
    }

    setSelectedVideoId((current) => {
      if (current && visibleVideos.some((video) => video.id === current)) {
        return current;
      }
      return visibleVideos[0].id;
    });
    setBannerVideoId((current) => {
      if (current && visibleVideos.some((video) => video.id === current)) {
        return current;
      }
      return visibleVideos[0].id;
    });
    setPendingBannerVideoId((current) => {
      if (current && visibleVideos.some((video) => video.id === current)) {
        return current;
      }
      return null;
    });
    setIsPlayerLoading(true);
  }, [visibleVideos]);

  useEffect(() => {
    if (!activeBannerVideo?.id || !pendingBannerVideoId || pendingBannerVideoId === activeBannerVideo.id) {
      pendingBannerIdRef.current = null;
      setIsBannerSliding(false);
      setIsBannerSlideActive(false);
      return;
    }

    if (pendingBannerIdRef.current === pendingBannerVideoId) {
      return;
    }

    pendingBannerIdRef.current = pendingBannerVideoId;

    const previousIndex = visibleVideos.findIndex((video) => video.id === activeBannerVideo.id);
    const nextIndex = visibleVideos.findIndex((video) => video.id === pendingBannerVideoId);
    const direction: 1 | -1 = (previousIndex >= 0 && nextIndex >= 0 && nextIndex < previousIndex) ? -1 : 1;

    setBannerSlideDirection(direction);
    setIsBannerSliding(true);
    setIsBannerSlideActive(false);

    const frame = requestAnimationFrame(() => {
      setIsBannerSlideActive(true);
    });

    const timer = setTimeout(() => {
      setBannerVideoId(pendingBannerVideoId);
      setPendingBannerVideoId(null);
      setIsBannerSliding(false);
      setIsBannerSlideActive(false);
      pendingBannerIdRef.current = null;
    }, BANNER_SLIDE_MS);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [activeBannerVideo?.id, pendingBannerVideoId, visibleVideos]);

  useEffect(() => {
    if (activeBannerVideo?.id && !isBannerVisible) {
      const frame = requestAnimationFrame(() => {
        setIsBannerVisible(true);
      });

      return () => {
        cancelAnimationFrame(frame);
      };
    }
  }, [activeBannerVideo?.id, isBannerVisible]);

  useEffect(() => {
    if (selectedVideo?.id) {
      setIsPlayerLoading(true);
    }
  }, [selectedVideo?.id]);

  useEffect(() => {
    if (visibleVideos.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setPendingBannerVideoId((currentPending) => {
        if (currentPending) {
          return currentPending;
        }

        const baseVideoId = bannerVideoId || visibleVideos[0]?.id;
        if (!baseVideoId) {
          return null;
        }

        const currentIndex = visibleVideos.findIndex((video) => video.id === baseVideoId);
        const nextIndex = currentIndex >= 0
          ? (currentIndex + 1) % visibleVideos.length
          : 0;

        const nextId = visibleVideos[nextIndex].id;
        return nextId === baseVideoId ? null : nextId;
      });
    }, BANNER_ROTATE_MS);

    return () => {
      clearInterval(timer);
    };
  }, [bannerVideoId, visibleVideos]);

  useEffect(() => {
    let cancelled = false;
    let nextHourTimer: ReturnType<typeof setTimeout> | null = null;
    let hourlyRefreshTimer: ReturnType<typeof setInterval> | null = null;

    const fetchLatestVideos = async () => {
      setLibraryError(null);
      try {
        const slotKey = getCurrentHourSlotKey();
        const response = await fetch(`/api/videos/latest?limit=12&slot=${encodeURIComponent(slotKey)}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload: LatestVideosApiResponse = await response.json();
        const remoteVideos = payload?.data?.videos || [];
        const normalized = normalizeVideos(remoteVideos);

        if (!cancelled) {
          if (normalized.length > 0) {
            setVideos(normalized);
          } else {
            setLibraryError('Chưa có video YouTube mới hợp lệ, sẽ tự cập nhật khi có dữ liệu.');
          }
        }
      } catch (error) {
        if (!cancelled) {
          setVideos((previous) => previous);
          setLibraryError(error instanceof Error ? error.message : 'Không thể tải video YouTube.');
        }
      } finally {
        if (!cancelled) {
          setIsLibraryLoading(false);
        }
      }
    };

    const scheduleMinuteZeroRefresh = () => {
      const waitMs = getMsUntilNextHour();
      nextHourTimer = setTimeout(() => {
        void fetchLatestVideos();
        hourlyRefreshTimer = setInterval(() => {
          void fetchLatestVideos();
        }, HOUR_REFRESH_MS);
      }, waitMs);
    };

    void fetchLatestVideos();
    scheduleMinuteZeroRefresh();

    return () => {
      cancelled = true;
      if (nextHourTimer) {
        clearTimeout(nextHourTimer);
      }
      if (hourlyRefreshTimer) {
        clearInterval(hourlyRefreshTimer);
      }
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[400px]">
      {/* Cột Trái: Banner */}
      <div className="w-full lg:w-[65%] h-[200px] sm:h-[300px] lg:h-full rounded-xl overflow-hidden shadow-sm bg-gray-100">
        <div className="relative w-full h-full">
          {activeBannerVideo && (
            <img
              src={activeBannerVideo.banner}
              alt={activeBannerVideo.title}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                transform: isBannerSliding
                  ? (isBannerSlideActive
                    ? `translate3d(${bannerSlideDirection * -100}%, 0, 0)`
                    : 'translate3d(0, 0, 0)')
                  : 'translate3d(0, 0, 0)',
                transition: isBannerSliding ? `transform ${BANNER_SLIDE_MS}ms ${BANNER_SWIPE_EASING}` : 'none',
                willChange: isBannerSliding ? 'transform' : 'auto',
              }}
            />
          )}
          {pendingBannerVideo ? (
            <img
              src={pendingBannerVideo.banner}
              alt={pendingBannerVideo.title}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${(isLibraryLoading || !isBannerVisible || bannerLoading[pendingBannerVideo.id]) ? 'opacity-0' : 'opacity-100'}`}
              style={{
                transform: isBannerSliding
                  ? (isBannerSlideActive
                    ? 'translate3d(0, 0, 0)'
                    : `translate3d(${bannerSlideDirection * 100}%, 0, 0)`)
                  : `translate3d(${bannerSlideDirection * 100}%, 0, 0)`,
                transition: isBannerSliding ? `transform ${BANNER_SLIDE_MS}ms ${BANNER_SWIPE_EASING}` : 'none',
                willChange: isBannerSliding ? 'transform' : 'auto',
              }}
              onLoad={() => {
                setBannerLoading((current) => ({
                  ...current,
                  [pendingBannerVideo.id]: false,
                }));
              }}
              onError={() => {
                setBannerLoading((current) => ({
                  ...current,
                  [pendingBannerVideo.id]: false,
                }));
              }}
            />
          ) : !isLibraryLoading && activeBannerVideo ? (
            <img
              src={activeBannerVideo.banner}
              alt={activeBannerVideo.title}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${(isLibraryLoading || !isBannerVisible || bannerLoading[activeBannerVideo.id]) ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => {
                setBannerLoading((current) => ({
                  ...current,
                  [activeBannerVideo.id]: false,
                }));
              }}
              onError={() => {
                setBannerLoading((current) => ({
                  ...current,
                  [activeBannerVideo.id]: false,
                }));
              }}
            />
          ) : (
            !isLibraryLoading && (
              <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-gray-600">
                {libraryError || 'Không có video YouTube để hiển thị'}
              </div>
            )
          )}
        </div>
      </div>

      {/* Cột Phải: Video Area */}
      <div className="w-full lg:w-[35%] flex flex-col gap-2 h-[400px] lg:h-full">
        <div className="flex-1 rounded-xl overflow-hidden relative shadow-sm bg-black border border-gray-100">
          {selectedVideo && (isLibraryLoading || isPlayerLoading) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/65 text-white">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                Đang tải nội dung...
              </div>
            </div>
          )}
          {selectedVideo ? (
            <iframe
              className={`absolute inset-0 w-full h-full transition-opacity duration-200 ${(isLibraryLoading || isPlayerLoading) ? 'opacity-0' : 'opacity-100'}`}
              src={`https://www.youtube-nocookie.com/embed/${selectedVideo.id}?rel=0&modestbranding=1&playsinline=1`}
              title={selectedVideo.title}
              frameBorder="0"
              allowFullScreen
              onLoad={() => setIsPlayerLoading(false)}
            />
          ) : (
            !isLibraryLoading && (
              <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-gray-300">
                Không thể tải video YouTube.
              </div>
            )
          )}
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
                  src={video.banner}
                  className={`w-full h-full object-cover group-hover:opacity-80 transition-opacity ${thumbnailLoading[video.id] ? 'opacity-0' : 'opacity-100'}`}
                  alt={video.title}
                  onLoad={() => {
                    setThumbnailLoading((previous) => ({
                      ...previous,
                      [video.id]: false,
                    }));
                  }}
                  onError={() => {
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