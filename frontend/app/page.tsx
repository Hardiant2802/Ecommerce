import FeaturedProducts from '@/components/home/FeaturedProducts';
import WeatherWidget from '@/components/weather/WeatherWidget';
import ExchangeRates from '@/components/currency/ExchangeRates';
import CurrencyConverter from '@/components/currency/CurrencyConverter';
import NewsGrid from '@/components/news/NewsGrid';
import HeroVideo from '@/components/home/HeroVideo';

export default function HomePage() {
  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="bg-white py-6">
        <div className="container-custom">
          <HeroVideo />
        </div>
      </section>

      {/* All Products */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="container-custom">
          <FeaturedProducts />
        </div>
      </section>

      {/* Widgets Section */}
      <section className="py-12 md:py-20 bg-white border-t border-gray-200">
        <div className="container-custom">
          <div className="grid md:grid-cols-3 gap-6">
            <WeatherWidget city="Hanoi" />
            <ExchangeRates />
            <CurrencyConverter />
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-12 md:py-20 bg-white border-t border-gray-100">
        <div className="container-custom">
          <h2 className="text-3xl font-bold mb-8">Latest News</h2>
          <NewsGrid limit={6} />
        </div>
      </section>

    </div>
  );
}