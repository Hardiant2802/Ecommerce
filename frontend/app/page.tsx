export const runtime = 'nodejs';

import FeaturedProducts from '@/components/home/FeaturedProducts';
import WeatherWidget from '@/components/weather/WeatherWidget';
import ExchangeRates from '@/components/currency/ExchangeRates';
import CurrencyConverter from '@/components/currency/CurrencyConverter';
import NewsGrid from '@/components/news/NewsGrid';
import HeroVideo from '@/components/home/HeroVideo';
import { BadgeCheck, Headphones, Newspaper, RefreshCcw, ShieldCheck, Smartphone, Truck } from 'lucide-react';

interface HomePageProps {
  searchParams?: Promise<{
    search?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const searchQuery = resolvedSearchParams?.search?.trim() || '';
  const storeHighlights = [
    {
      icon: Smartphone,
      title: 'Sản phẩm chọn lọc',
      description: 'Danh mục tập trung vào điện thoại, phụ kiện và các thiết bị đang được quan tâm.',
    },
    {
      icon: ShieldCheck,
      title: 'Nguồn hàng minh bạch',
      description: 'Thông tin sản phẩm, tình trạng hàng và giá bán được trình bày rõ để dễ so sánh.',
    },
    {
      icon: Truck,
      title: 'Giao nhận linh hoạt',
      description: 'Hỗ trợ đặt hàng online, theo dõi đơn và chọn phương thức thanh toán phù hợp.',
    },
    {
      icon: RefreshCcw,
      title: 'Hậu mãi dễ tiếp cận',
      description: 'Chính sách bảo hành, đổi trả và hỗ trợ sau mua được đặt ở các luồng cần thiết.',
    },
  ];

  return (
    <div className="space-y-0 bg-slate-50">
      <section className="bg-white py-6 md:py-8">
        <div className="container-custom">
          <HeroVideo />
        </div>
      </section>

      <section className="py-10 md:py-16 bg-slate-50">
        <div className="container-custom">
          <FeaturedProducts searchQuery={searchQuery} />
        </div>
      </section>

      <section className="bg-white py-10 md:py-16">
        <div className="container-custom">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Về cửa hàng</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">
                Mua sắm điện thoại rõ thông tin, nhanh thao tác, dễ quay lại khi cần hỗ trợ.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">
                Mobile Store được xây như một quầy tư vấn trực tuyến gọn gàng: sản phẩm dễ quét mắt,
                giá hiển thị rõ, hình ảnh ưu tiên phần cần xem và luồng đặt hàng không làm bạn phải
                đi vòng. Chúng tôi tập trung vào trải nghiệm mua điện thoại thực tế: chọn đúng máy,
                hiểu đúng chi phí và có chỗ để kiểm tra lại mọi thông tin trước khi thanh toán.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-slate-700">
                <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <BadgeCheck className="h-4 w-4 text-primary-700" />
                  Tư vấn theo nhu cầu
                </span>
                <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <Headphones className="h-4 w-4 text-primary-700" />
                  Hỗ trợ sau mua
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {storeHighlights.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-50 text-primary-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-bold text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-10 md:py-16">
        <div className="container-custom">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Thông tin tham khảo</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950 md:text-3xl">Theo dõi thị trường trước khi mua</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Tỉ giá, thời tiết giao nhận và tin kinh doanh được đặt ở cuối trang để hỗ trợ quyết định,
                không chen vào luồng xem sản phẩm chính.
              </p>
            </div>
          </div>
          <div className="grid gap-6 xl:grid-cols-12">
            <div className="grid gap-6 lg:grid-cols-2 xl:col-span-7">
              <WeatherWidget city="Hanoi" />
              <CurrencyConverter />
              <ExchangeRates className="lg:col-span-2" />
            </div>
            <div className="xl:col-span-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                  <Newspaper className="h-5 w-5 text-primary-700" />
                  Tin tức mới nhất
                </h3>
                <a
                  href="https://vnexpress.net/kinh-doanh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-primary-700 hover:text-primary-900"
                >
                  Xem tất cả
                </a>
              </div>
              <NewsGrid limit={4} showHeader={false} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
