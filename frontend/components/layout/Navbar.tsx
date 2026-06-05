'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useCart } from '@/lib/hooks';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleCartClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      alert('Vui lòng đăng nhập để xem giỏ hàng');
      router.push('/login');
    }
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/" className="flex min-w-0 items-center space-x-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-600">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="hidden truncate text-lg font-bold text-gray-900 sm:block lg:text-xl">
              Cửa hàng điện thoại
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              Sản phẩm
            </Link>
            <Link
              href="/news"
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              Tin Tức
            </Link>
            <Link
              href="/iphone"
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              iPhone
            </Link>
            <Link
              href="/samsung"
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              Samsung
            </Link>
            <Link
              href="/xiaomi"
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              Xiaomi
            </Link>
            <Link
              href="/tai-nghe"
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              Tai nghe
            </Link>
            <Link
              href="/phu-kien"
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              Phụ kiện
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
            {/* Cart */}
            <Link
              href="/cart"
              onClick={handleCartClick}
              className="relative p-2 text-gray-700 hover:text-primary-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {isAuthenticated && user ? (
              <div className="relative group">
                <button className="flex items-center space-x-2 text-gray-700 hover:text-primary-600">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span className="hidden max-w-28 truncate md:block">{user.firstname}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 hidden group-hover:block">
                  <Link
                    href="/account"
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Thông tin người dùng
                  </Link>
                  <button
                    onClick={logout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-gray-700 hover:text-primary-600 transition-colors hidden md:block"
              >
                Đăng nhập
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t py-4 md:hidden">
            <div className="flex flex-col space-y-1">
              <Link
                href="/"
                className="rounded-md px-2 py-2 text-gray-700 hover:bg-slate-50 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sản phẩm
              </Link>
              <Link
                href="/news"
                className="rounded-md px-2 py-2 text-gray-700 hover:bg-slate-50 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Tin Tức
              </Link>
              <Link
                href="/iphone"
                className="rounded-md px-2 py-2 text-gray-700 hover:bg-slate-50 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                iPhone
              </Link>
              <Link
                href="/samsung"
                className="rounded-md px-2 py-2 text-gray-700 hover:bg-slate-50 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Samsung
              </Link>
              <Link
                href="/xiaomi"
                className="rounded-md px-2 py-2 text-gray-700 hover:bg-slate-50 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Xiaomi
              </Link>
              <Link
                href="/tai-nghe"
                className="rounded-md px-2 py-2 text-gray-700 hover:bg-slate-50 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Tai nghe
              </Link>
              <Link
                href="/phu-kien"
                className="rounded-md px-2 py-2 text-gray-700 hover:bg-slate-50 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Phụ kiện
              </Link>
              {!isAuthenticated && (
                <Link
                  href="/login"
                  className="rounded-md px-2 py-2 text-gray-700 hover:bg-slate-50 hover:text-primary-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Đăng nhập
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
