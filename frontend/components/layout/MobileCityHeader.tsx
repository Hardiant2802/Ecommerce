'use client';

import Link from 'next/link';
import { useAuth, useCart } from '@/lib/hooks';
import { useState } from 'react';

const CATEGORIES = [
  { name: 'Điện thoại', icon: '📱', href: '/products' },
  { name: 'Máy tính bảng', icon: '💻', href: '/products?category=tablet' },
  { name: 'Laptop', icon: '💻', href: '/products?category=laptop' },
  { name: 'Tivi', icon: '📺', href: '/products?category=tv' },
  { name: 'Phụ kiện', icon: '🔌', href: '/products?category=accessory' },
  { name: 'Đồng hồ thông minh', icon: '⌚', href: '/products?category=smartwatch' },
  { name: 'Tai nghe', icon: '🎧', href: '/products?category=headphone' },
  { name: 'Sửa chữa', icon: '🔧', href: '/repair' },
];

export default function MobileCityHeader() {
  const { user, logout, isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('Hà Nội');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header className="bg-gold sticky top-0 z-50 shadow-md">
      {/* Top Header */}
      <div className="bg-gold-dark text-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-12 text-sm">
            <div className="flex items-center space-x-6">
              <Link href="/news" className="hover:underline">TIN TỨC</Link>
              <span className="text-gold-light">|</span>
              <Link href="/events" className="hover:underline">EVENTS</Link>
              <span className="text-gold-light">|</span>
              <Link href="/warranty" className="hover:underline">TRA CỨU BH</Link>
            </div>
            <div className="flex items-center space-x-4">
              <select 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-transparent text-white text-sm focus:outline-none cursor-pointer"
              >
                <option value="Hà Nội">Hà Nội</option>
                <option value="TP. HCM">TP. HCM</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center text-white">
                  <div className="text-2xl font-bold leading-none">|||</div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white leading-tight">MOBILE CITY</h1>
                </div>
              </div>
            </div>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full px-4 py-3 pr-12 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                type="submit"
                className="absolute right-0 top-0 h-full px-4 text-gold hover:text-gold-dark"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Auth & Cart */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="relative group">
                <button className="flex flex-col items-center text-white hover:opacity-80">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-xs mt-1">{user.firstname}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 hidden group-hover:block">
                  <button
                    onClick={logout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Link href="/login" className="bg-white text-gold px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 flex flex-col items-center text-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Đăng nhập
                </Link>
                <Link href="/register" className="bg-white text-gold px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 flex flex-col items-center text-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Đăng ký
                </Link>
              </>
            )}

            <Link href="/cart" className="relative flex flex-col items-center text-white hover:opacity-80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs mt-1">Giỏ hàng</span>
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="bg-white border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3 overflow-x-auto">
            {CATEGORIES.map((category) => (
              <Link
                key={category.name}
                href={category.href}
                className="flex flex-col items-center px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors min-w-fit"
              >
                <span className="text-2xl mb-1">{category.icon}</span>
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
