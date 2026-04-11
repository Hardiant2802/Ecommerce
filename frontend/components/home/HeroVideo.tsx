'use client';

import { useState } from 'react';

export default function HeroVideo() {
  // Dùng các video công khai để tránh lỗi "Video không có sẵn" khi nhúng.
  const [activeVideo, setActiveVideo] = useState('vGRbugSOdmw');

  const videoList = [
    { id: 'vGRbugSOdmw', title: 'Xiaomi 17 Ultra' },
    { id: 'VoBBKzE1O1s', title: 'iPhone 17 Pro Max' },
    { id: 'y2bqmnB75Rk', title: 'Samsung Galaxy S26 Ultra' },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[400px]">
      {/* Cột Trái: Banner */}
      <div className="w-full lg:w-[65%] h-[200px] sm:h-[300px] lg:h-full rounded-xl overflow-hidden shadow-sm bg-gray-100">
        <img 
          src="/images/xiaomi17-pro.jpg" 
          alt="Banner" 
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
        />
      </div>

      {/* Cột Phải: Video Area */}
      <div className="w-full lg:w-[35%] flex flex-col gap-2 h-[400px] lg:h-full">
        <div className="flex-1 rounded-xl overflow-hidden relative shadow-sm bg-black border border-gray-100">
          <iframe 
            key={activeVideo} // Thêm key để React ép load lại iframe khi đổi ID
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${activeVideo}?rel=0&modestbranding=1`} 
            title="YouTube video player" 
            frameBorder="0" 
            allowFullScreen
          ></iframe>
        </div>

        {/* Thumbnails */}
        <div className="h-[25%] flex gap-2">
          {videoList.map((video) => (
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
                // Nếu ảnh YouTube vẫn lỗi 404, dùng ảnh placeholder để web không bị xấu
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150x100?text=Video';
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}