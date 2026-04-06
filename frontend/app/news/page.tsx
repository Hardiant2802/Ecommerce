import NewsGrid from '@/components/news/NewsGrid';

export const metadata = {
  title: 'Tin Tức Kinh Doanh | Mobile Phone Store',
  description: 'Cập nhật tin tức kinh doanh mới nhất từ VnExpress',
};

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tin Tức Kinh Doanh
          </h1>
          <p className="text-gray-600">
            Cập nhật tin tức kinh doanh mới nhất từ VnExpress
          </p>
        </div>

        <NewsGrid limit={20} />
      </div>
    </main>
  );
}
