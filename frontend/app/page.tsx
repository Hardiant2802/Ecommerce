import Link from 'next/link';
import Image from 'next/image';
import { CATEGORIES } from '@/constants/categories';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import WeatherWidget from '@/components/weather/WeatherWidget';
import ExchangeRates from '@/components/currency/ExchangeRates';
import CurrencyConverter from '@/components/currency/CurrencyConverter';
import NewsGrid from '@/components/news/NewsGrid';

export default function HomePage() {
  return (
    <div>
      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="container-custom py-16 md:py-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Latest Mobile Phones
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              Discover the newest smartphones from top brands at the best prices
            </p>
            <Link
              href="/products"
              className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Shop by Brand
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {CATEGORIES.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="group"
              >
                <div className="card hover:shadow-lg transition-shadow p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                    <span className="text-2xl font-bold text-primary-600">
                      {category.name[0]}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{category.name}</h3>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Info Widgets Section - Weather & Currency */}
      <section className="py-12 md:py-20 bg-white border-t border-gray-200">
        <div className="container-custom">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Weather Widget */}
            <WeatherWidget city="Hanoi" />
            
            {/* Exchange Rates */}
            <ExchangeRates />
            
            {/* Currency Converter */}
            <CurrencyConverter />
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="container-custom">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold">
              Featured Products
            </h2>
            <Link
              href="/products"
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              View All →
            </Link>
          </div>
          <FeaturedProducts />
        </div>
      </section>

      {/* Business News Section */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container-custom">
          <NewsGrid limit={6} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 text-white py-16">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose Us?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div>
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-xl font-semibold mb-2">Fast Delivery</h3>
              <p className="text-gray-300">Free shipping on orders over $500</p>
            </div>
            <div>
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2">Secure Payment</h3>
              <p className="text-gray-300">100% secure payment processing</p>
            </div>
            <div>
              <div className="text-4xl mb-4">✓</div>
              <h3 className="text-xl font-semibold mb-2">Warranty</h3>
              <p className="text-gray-300">1-year warranty on all products</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
