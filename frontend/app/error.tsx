'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Lỗi:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Rất tiếc! Đã xảy ra lỗi
        </h1>
        <p className="text-gray-600 mb-8">
          Xin lỗi, đã có sự cố ngoài mong đợi. Vui lòng thử lại.
        </p>
        <div className="space-x-4">
          <button
            onClick={reset}
            className="inline-block bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 transition-colors"
          >
            Thử lại
          </button>
          <a
            href="/"
            className="inline-block bg-gray-200 text-gray-900 px-6 py-3 rounded-md hover:bg-gray-300 transition-colors"
          >
            Về trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}
