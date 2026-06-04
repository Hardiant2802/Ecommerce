'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth, useCart } from '@/lib/hooks';
import { useEffect, useRef, useState } from 'react';
import { Cable, Gamepad2, Headphones } from 'lucide-react';
import {
  SiApple,
  SiSamsung,
  SiXiaomi,
  SiOppo,
  SiVivo,
  SiAsus,
  SiOneplus,
} from 'react-icons/si';

// Cấu hình các hãng với kích thước logo đã được cân chỉnh
const BRANDS = [
  { name: 'Apple', slug: 'apple', icon: SiApple, href: '/apple', size: 24 },
  { name: 'Samsung', slug: 'samsung', icon: SiSamsung, href: '/samsung', size: 56 },
  { name: 'Xiaomi', slug: 'xiaomi', icon: SiXiaomi, href: '/xiaomi', size: 24 },
  { name: 'Oppo', slug: 'oppo', icon: SiOppo, href: '/oppo', size: 40 },
  { name: 'One Plus', slug: 'oneplus', icon: SiOneplus, href: '/oneplus', size: 28 },
  { name: 'Vivo', slug: 'vivo', icon: SiVivo, href: '/vivo', size: 40 },
  { name: 'Asus', slug: 'asus', icon: SiAsus, href: '/asus', size: 40 },
  { name: 'Red Magic', slug: 'red-magic', icon: Gamepad2, href: '/red-magic', size: 24 },
  { name: 'Tai nghe', slug: 'tai-nghe', icon: Headphones, href: '/tai-nghe', size: 22 },
  { name: 'Phụ kiện', slug: 'phu-kien', icon: Cable, href: '/phu-kien', size: 22 },
];

export default function MobileCityHeader() {
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('Hà Nội');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const activeBrand = BRANDS.find((brand) => pathname === brand.href)?.slug || (pathname === '/products' ? searchParams.get('brand') : null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
  };

  return (
    <>
      {/* PHẦN 1: HEADER CHÍNH (Sẽ cuộn đi khi lướt xuống) */}
      <header className="bg-gold shadow-md">
        {/* Top Header: Tin tức, Event, Thành phố */}
        <div className="bg-gold-dark text-white">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-12 text-sm">
              <div className="flex items-center space-x-6">
                <Link href="/news" className="hover:underline">TIN TỨC</Link>
                <span className="text-gold-light">|</span>
                <Link href="/warranty" className="hover:underline">TRA CỨU BH</Link>
              </div>
              <div className="flex items-center space-x-4">
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-transparent text-white text-sm focus:outline-none cursor-pointer"
                >
                  <option value="Hà Nội" className="text-gray-900">Hà Nội</option>
                  <option value="TP. HCM" className="text-gray-900">TP. HCM</option>
                  <option value="Đà Nẵng" className="text-gray-900">Đà Nẵng</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Header: Logo, Thanh tìm kiếm, Đăng nhập, Giỏ hàng */}
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-6">
            {/* Logo AH PHONE STORE */}
            <Link href="/" className="flex-shrink-0 order-1">
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center text-white">
                  <div className="text-2xl font-bold leading-none">|||</div>
                </div>
                <h1 className="text-2xl font-bold text-white leading-tight uppercase tracking-tight hidden sm:block">
                  AH Phone Store
                </h1>
              </div>
            </Link>

            {/* Thanh tìm kiếm */}
            <form onSubmit={handleSearch} className="order-3 basis-full sm:order-2 sm:basis-auto flex-1 max-w-2xl">
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
                  className="absolute right-0 top-0 h-full px-4 text-gold hover:text-gold-dark transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Tài khoản & Giỏ hàng */}
            <div className="order-2 sm:order-3 flex items-center gap-1 sm:gap-3 flex-shrink-0">
              {authLoading ? (
                <div className="flex items-center gap-1 sm:gap-3" aria-label="Đang tải tài khoản">
                  <div className="h-11 w-20 sm:w-24 rounded-lg bg-white/70 animate-pulse" />
                  <div className="h-11 w-20 sm:w-24 rounded-lg bg-white/70 animate-pulse" />
                </div>
              ) : isAuthenticated && user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((prev) => !prev)}
                    className="flex flex-col items-center text-white hover:opacity-80"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-xs mt-1 font-medium hidden sm:block">{user.firstname}</span>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-2 z-[60] border border-gray-100">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{`${user.firstname} ${user.lastname}`}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link href="/login" className="bg-white text-gold px-2 sm:px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 flex flex-col items-center text-sm transition-all shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span className="hidden sm:block">Đăng nhập</span>
                  </Link>
                  <Link href="/register" className="bg-white text-gold px-2 sm:px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 flex flex-col items-center text-sm transition-all shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span className="hidden sm:block">Đăng ký</span>
                  </Link>
                </>
              )}

              <Link href="/cart" className="relative flex flex-col items-center text-white hover:opacity-80 transition-opacity flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63-.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-xs mt-1 font-medium hidden sm:block">Giỏ hàng</span>
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-gold animate-pulse">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* PHẦN 2: BRAND NAVIGATION (Thanh này sẽ dính cứng ở top-0) */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3 overflow-x-auto hide-scrollbar">
            {BRANDS.map((brand) => {
              const Icon = brand.icon;
              const isActive = activeBrand === brand.slug;
              return (
                <Link
                  key={brand.name}
                  href={brand.href}
                  className={`group flex items-center gap-2 px-4 py-2 rounded-lg transition-all min-w-fit border ${
                    isActive
                      ? 'bg-amber-50 border-amber-200 shadow-sm'
                      : 'border-transparent hover:border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <span className={`transition-colors flex items-center justify-center ${isActive ? 'text-gold' : 'text-gray-600 group-hover:text-gold'}`}>
                    <Icon size={brand.size || 24} />
                  </span>
                  <span className={`text-base font-semibold transition-colors whitespace-nowrap ${isActive ? 'text-gold' : 'text-gray-700 group-hover:text-gold'}`}>
                    {brand.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
