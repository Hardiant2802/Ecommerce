import Link from 'next/link';
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

      {/* Featured Products */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="container-custom">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Featured Products</h2>
            <Link href="/products" className="text-amber-600 hover:text-amber-700 font-semibold">
              View All →
            </Link>
          </div>
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

      {/* Trust Section */}
      <section className="bg-gray-900 text-white py-16">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold mb-12">Why Choose Us?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-xl font-semibold mb-2">Fast Delivery</h3>
              <p className="text-gray-400 text-sm">Free shipping on orders over $500</p>
            </div>
            <div>
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2">Secure Payment</h3>
              <p className="text-gray-400 text-sm">100% secure payment processing</p>
            </div>
            <div>
              <div className="text-4xl mb-4">✓</div>
              <h3 className="text-xl font-semibold mb-2">Warranty</h3>
              <p className="text-gray-400 text-sm">1-year warranty on all products</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}