'use client';

import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';

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
const MOBILE_BANNER_SLIDE_MS = 620;
const MOBILE_BREAKPOINT_PX = 1024;
const SWIPE_THRESHOLD_PX = 44;
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

function getBannerImageSrc(video: VideoItem, isMobileViewport: boolean): string {
  if (!video?.id) {
    return video?.banner || '';
  }

  if (isMobileViewport) {
    return `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
  }

  return video.banner || `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`;
}

function getThumbnailImageSrc(video: VideoItem): string {
  if (!video?.id) {
    return video?.banner || '';
  }

  return `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`;
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
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const pendingBannerIdRef = useRef<string | null>(null);
  const bannerTouchStartXRef = useRef<number | null>(null);
  const bannerTouchDeltaXRef = useRef(0);
  const bannerTouchDirectionRef = useRef<1 | -1 | null>(null);
  const isDraggingBannerRef = useRef(false);

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
  const bannerSlideMs = isMobileViewport ? MOBILE_BANNER_SLIDE_MS : BANNER_SLIDE_MS;
  const isPendingBannerLoaded = pendingBannerVideoId
    ? bannerLoading[pendingBannerVideoId] === false
    : false;
  const activeBannerSrc = activeBannerVideo
    ? getBannerImageSrc(activeBannerVideo, isMobileViewport)
    : '';
  const pendingBannerSrc = pendingBannerVideo
    ? getBannerImageSrc(pendingBannerVideo, isMobileViewport)
    : '';

  const activeDragOffsetPercent = isDraggingBanner
    ? Math.max(-100, Math.min(100, dragOffsetX))
    : 0;

  const pendingDragOffsetPercent = isDraggingBanner
    ? Math.max(-100, Math.min(100, dragOffsetX + ((bannerTouchDirectionRef.current || 1) * 100)))
    : 0;

  const resolveAdjacentBannerId = (baseVideoId: string, step: 1 | -1): string | null => {
    if (!baseVideoId || visibleVideos.length <= 1) {
      return null;
    }

    const baseIndex = visibleVideos.findIndex((video) => video.id === baseVideoId);
    const currentIndex = baseIndex >= 0 ? baseIndex : 0;
    const nextIndex = (currentIndex + step + visibleVideos.length) % visibleVideos.length;
    const nextVideo = visibleVideos[nextIndex];

    if (!nextVideo || nextVideo.id === baseVideoId) {
      return null;
    }

    return nextVideo.id;
  };

  const queueBannerByStep = (step: 1 | -1) => {
    if (visibleVideos.length <= 1 || pendingBannerVideoId || isBannerSliding) {
      return;
    }

    const baseVideoId = bannerVideoId || visibleVideos[0]?.id;
    if (!baseVideoId) {
      return;
    }

    const currentIndex = visibleVideos.findIndex((video) => video.id === baseVideoId);
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (baseIndex + step + visibleVideos.length) % visibleVideos.length;
    const nextId = visibleVideos[nextIndex]?.id;

    if (!nextId || nextId === baseVideoId) {
      return;
    }

    setPendingBannerVideoId(nextId);
  };

  const handleBannerTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!isMobileViewport || isBannerSliding || visibleVideos.length <= 1) {
      return;
    }

    if (event.touches.length !== 1) {
      bannerTouchStartXRef.current = null;
      bannerTouchDeltaXRef.current = 0;
      bannerTouchDirectionRef.current = null;
      return;
    }

    bannerTouchStartXRef.current = event.touches[0].clientX;
    bannerTouchDeltaXRef.current = 0;
    bannerTouchDirectionRef.current = null;
    setIsDraggingBanner(true);
    setDragOffsetX(0);
  };

  const handleBannerTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const startX = bannerTouchStartXRef.current;
    if (!isDraggingBanner || startX === null || event.touches.length !== 1) {
      return;
    }

    const deltaX = event.touches[0].clientX - startX;
    bannerTouchDeltaXRef.current = deltaX;

    if (Math.abs(deltaX) < 6) {
      return;
    }

    const direction: 1 | -1 = deltaX < 0 ? 1 : -1;
    bannerTouchDirectionRef.current = direction;

    const baseVideoId = bannerVideoId || visibleVideos[0]?.id || null;
    if (!baseVideoId) {
      return;
    }

    const nextId = resolveAdjacentBannerId(baseVideoId, direction);
    if (!nextId) {
      return;
    }

    if (pendingBannerVideoId !== nextId) {
      setPendingBannerVideoId(nextId);
    }

    const width = Math.max(1, event.currentTarget.clientWidth || 1);
    const offsetPercent = (deltaX / width) * 100;
    setDragOffsetX(Math.max(-100, Math.min(100, offsetPercent)));
  };

  const handleBannerTouchEnd = () => {
    const wasDragging = isDraggingBanner;
    const deltaX = bannerTouchDeltaXRef.current;
    const direction = bannerTouchDirectionRef.current;

    bannerTouchStartXRef.current = null;
    bannerTouchDeltaXRef.current = 0;
    bannerTouchDirectionRef.current = null;
    setIsDraggingBanner(false);

    if (!wasDragging) {
      return;
    }

    const shouldAdvance = Math.abs(deltaX) >= SWIPE_THRESHOLD_PX;
    if (!shouldAdvance || !direction) {
      setPendingBannerVideoId(null);
      setDragOffsetX(0);
      return;
    }

    setDragOffsetX(0);
  };

  useEffect(() => {
    isDraggingBannerRef.current = isDraggingBanner;
  }, [isDraggingBanner]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const updateViewportMode = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    updateViewportMode();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateViewportMode);
      return () => {
        mediaQuery.removeEventListener('change', updateViewportMode);
      };
    }

    mediaQuery.addListener(updateViewportMode);
    return () => {
      mediaQuery.removeListener(updateViewportMode);
    };
  }, []);

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
      const bannerSrc = getBannerImageSrc(video, isMobileViewport);
      const preload = new Image();
      preload.src = bannerSrc;
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
  }, [isMobileViewport, visibleVideos]);

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

    if (isDraggingBanner) {
      return;
    }

    if (!isPendingBannerLoaded) {
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
    }, bannerSlideMs);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [activeBannerVideo?.id, bannerSlideMs, isDraggingBanner, isPendingBannerLoaded, pendingBannerVideoId, visibleVideos]);

  useEffect(() => {
    if (!isBannerSliding || !pendingBannerVideoId) {
      return;
    }

    // Safety net: if a transition is interrupted unexpectedly, release pending state.
    const watchdog = setTimeout(() => {
      setPendingBannerVideoId(null);
      setIsBannerSliding(false);
      setIsBannerSlideActive(false);
      pendingBannerIdRef.current = null;
    }, bannerSlideMs * 2);

    return () => {
      clearTimeout(watchdog);
    };
  }, [bannerSlideMs, isBannerSliding, pendingBannerVideoId]);

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
        if (isDraggingBannerRef.current || isBannerSliding) {
          return currentPending;
        }

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
  }, [bannerVideoId, isBannerSliding, visibleVideos]);

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
        <div
          className="relative w-full h-full touch-pan-y"
          onTouchStart={handleBannerTouchStart}
          onTouchMove={handleBannerTouchMove}
          onTouchEnd={handleBannerTouchEnd}
          onTouchCancel={handleBannerTouchEnd}
        >
          {activeBannerVideo && (
            <img
              src={activeBannerSrc}
              alt={activeBannerVideo.title}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
              decoding="async"
              style={{
                transform: isDraggingBanner
                  ? `translate3d(${activeDragOffsetPercent}%, 0, 0)`
                  : isBannerSliding
                  ? (isBannerSlideActive
                    ? `translate3d(${bannerSlideDirection * -100}%, 0, 0)`
                    : 'translate3d(0, 0, 0)')
                  : 'translate3d(0, 0, 0)',
                transition: isDraggingBanner
                  ? 'none'
                  : isBannerSliding
                    ? `transform ${bannerSlideMs}ms ${BANNER_SWIPE_EASING}`
                    : 'none',
                willChange: (isBannerSliding || isDraggingBanner) ? 'transform' : 'auto',
              }}
            />
          )}
          {pendingBannerVideo ? (
            <img
              src={pendingBannerSrc}
              alt={pendingBannerVideo.title}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
              decoding="async"
              style={{
                transform: isDraggingBanner
                  ? `translate3d(${pendingDragOffsetPercent}%, 0, 0)`
                  : isBannerSliding
                  ? (isBannerSlideActive
                    ? 'translate3d(0, 0, 0)'
                    : `translate3d(${bannerSlideDirection * 100}%, 0, 0)`)
                  : `translate3d(${bannerSlideDirection * 100}%, 0, 0)`,
                transition: isDraggingBanner
                  ? 'none'
                  : isBannerSliding
                    ? `transform ${bannerSlideMs}ms ${BANNER_SWIPE_EASING}`
                    : 'none',
                willChange: (isBannerSliding || isDraggingBanner) ? 'transform' : 'auto',
                opacity: bannerLoading[pendingBannerVideo.id] ? 0 : 1,
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
              src={activeBannerSrc}
              alt={activeBannerVideo.title}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${(isLibraryLoading || !isBannerVisible || bannerLoading[activeBannerVideo.id]) ? 'opacity-0' : 'opacity-100'}`}
              draggable={false}
              decoding="async"
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
        <div className="h-[25%] flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth overscroll-x-contain scrollbar-none [-webkit-overflow-scrolling:touch]">
          {isLibraryLoading
            ? Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`hero-thumb-skeleton-${index}`}
                className="relative flex-none w-[118px] sm:w-[130px] rounded-lg overflow-hidden border border-white/20 bg-gray-900/55 animate-pulse snap-start"
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
                className={`relative flex-none w-[118px] sm:w-[130px] rounded-lg overflow-hidden cursor-pointer group border-2 transition-all snap-start 
                  ${highlightedVideoId === video.id ? 'border-amber-500' : 'border-transparent'}`}
              >
                {thumbnailLoading[video.id] && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/45 text-white">
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                  </div>
                )}
                <img
                  src={getThumbnailImageSrc(video)}
                  className={`w-full h-full object-cover group-hover:opacity-80 transition-opacity ${thumbnailLoading[video.id] ? 'opacity-0' : 'opacity-100'}`}
                  alt={video.title}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
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