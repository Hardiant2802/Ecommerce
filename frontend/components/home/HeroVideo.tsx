'use client';

import { useEffect, useMemo, useState } from 'react';

interface VideoItem {
  id: string;
  title: string;
  banner: string;
}

const VIDEO_LIBRARY: VideoItem[] = [
  { id: 'VoBBKzE1O1s', title: 'iPhone 17 Pro Max', banner: 'https://img.youtube.com/vi/VoBBKzE1O1s/maxresdefault.jpg' },
  { id: 'y2bqmnB75Rk', title: 'Samsung Galaxy S26 Ultra', banner: 'https://img.youtube.com/vi/y2bqmnB75Rk/maxresdefault.jpg' },
  { id: 'vGRbugSOdmw', title: 'Xiaomi 17 Ultra', banner: 'https://img.youtube.com/vi/vGRbugSOdmw/maxresdefault.jpg' },
  { id: 'JkRXhe3KaPE', title: 'OnePlus 13 Review', banner: 'https://img.youtube.com/vi/JkRXhe3KaPE/maxresdefault.jpg' },
];

function getDaySeed(date: Date = new Date()): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

function getDailyMedia() {
  const seed = getDaySeed();
  const start = seed % VIDEO_LIBRARY.length;

  const videos = [
    VIDEO_LIBRARY[start],
    VIDEO_LIBRARY[(start + 1) % VIDEO_LIBRARY.length],
    VIDEO_LIBRARY[(start + 2) % VIDEO_LIBRARY.length],
  ];

  return {
    videos,
    banner: videos[0]?.banner || '/images/xiaomi17-pro.jpg',
  };
}

export default function HeroVideo() {
  const initialDaily = useMemo(() => getDailyMedia(), []);
  const [dailyMedia, setDailyMedia] = useState(initialDaily);
  const [activeVideo, setActiveVideo] = useState(initialDaily.videos[0].id);

  useEffect(() => {
    setActiveVideo(dailyMedia.videos[0].id);
  }, [dailyMedia]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const scheduleNextRefresh = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      const msUntilNextDay = Math.max(next.getTime() - now.getTime(), 1000);

      timer = setTimeout(() => {
        setDailyMedia(getDailyMedia());
        scheduleNextRefresh();
      }, msUntilNextDay);
    };

    scheduleNextRefresh();

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[400px]">
      {/* Cột Trái: Banner */}
      <div className="w-full lg:w-[65%] h-[200px] sm:h-[300px] lg:h-full rounded-xl overflow-hidden shadow-sm bg-gray-100">
        <img
          src={dailyMedia.banner}
          alt={dailyMedia.videos[0].title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/xiaomi17-pro.jpg';
          }}
        />
      </div>

      {/* Cột Phải: Video Area */}
      <div className="w-full lg:w-[35%] flex flex-col gap-2 h-[400px] lg:h-full">
        <div className="flex-1 rounded-xl overflow-hidden relative shadow-sm bg-black border border-gray-100">
          <iframe 
            key={activeVideo} // Thêm key để React ép load lại iframe khi đổi ID
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${activeVideo}?rel=0&modestbranding=1`} 
            title="Trình phát video YouTube" 
            frameBorder="0" 
            allowFullScreen
          ></iframe>
        </div>

        {/* Thumbnails */}
        <div className="h-[25%] flex gap-2">
          {dailyMedia.videos.map((video) => (
            <div
              key={video.id}
              onClick={() => setActiveVideo(video.id)}
              className={`flex-1 relative rounded-lg overflow-hidden cursor-pointer group border-2 transition-all 
                ${activeVideo === video.id ? 'border-amber-500' : 'border-transparent'}`}
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