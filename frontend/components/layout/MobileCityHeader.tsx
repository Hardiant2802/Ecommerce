'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useAuth, useCart } from '@/lib/hooks';
import { useEffect, useRef, useState } from 'react';
import { Cable, Gamepad2, Headphones, LogIn, MapPin, Search, ShoppingCart, User, UserPlus } from 'lucide-react';
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
  { name: 'Apple', slug: 'apple', icon: SiApple, href: '/apple', size: 22 },
  { name: 'Samsung', slug: 'samsung', icon: SiSamsung, href: '/samsung', size: 38 },
  { name: 'Xiaomi', slug: 'xiaomi', icon: SiXiaomi, href: '/xiaomi', size: 22 },
  { name: 'Oppo', slug: 'oppo', icon: SiOppo, href: '/oppo', size: 32 },
  { name: 'One Plus', slug: 'oneplus', icon: SiOneplus, href: '/oneplus', size: 24 },
  { name: 'Vivo', slug: 'vivo', icon: SiVivo, href: '/vivo', size: 32 },
  { name: 'Asus', slug: 'asus', icon: SiAsus, href: '/asus', size: 32 },
  { name: 'Red Magic', slug: 'red-magic', icon: Gamepad2, href: '/red-magic', size: 24 },
  { name: 'Tai nghe', slug: 'tai-nghe', icon: Headphones, href: '/tai-nghe', size: 22 },
  { name: 'Phụ kiện', slug: 'phu-kien', icon: Cable, href: '/phu-kien', size: 22 },
];

export default function MobileCityHeader() {
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('Hà Nội');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [newOrderCount, setNewOrderCount] = useState(0);

  // Đếm số đơn hàng mới (chưa xem) để hiện badge trên menu tài khoản
  useEffect(() => {
    if (!isAuthenticated || !user?.email) {
      setNewOrderCount(0);
      return;
    }

    let cancelled = false;

    const loadOrderBadge = async () => {
      try {
        const res = await fetch(
          `/api/orders/internal?paidOnly=0&limit=200&customerEmail=${encodeURIComponent(user.email)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const data = await res.json();
        const orders: Array<{ id: string; status: string }> = Array.isArray(data?.orders) ? data.orders : [];
        const activeOrders = orders.filter((o) => o.status === 'pending' || o.status === 'paid');

        const seenKey = `ahp_seen_orders_${user.email}`;
        let seenIds: string[] = [];
        try {
          seenIds = JSON.parse(localStorage.getItem(seenKey) || '[]');
        } catch {
          seenIds = [];
        }
        const unseen = activeOrders.filter((o) => !seenIds.includes(o.id));
        if (!cancelled) setNewOrderCount(unseen.length);
      } catch {
        /* bỏ qua lỗi badge */
      }
    };

    loadOrderBadge();
    const interval = setInterval(loadOrderBadge, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated, user?.email, pathname]);

  // Khi mở trang đơn hàng, đánh dấu tất cả đơn là đã xem
  const markOrdersSeen = async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(
        `/api/orders/internal?paidOnly=0&limit=200&customerEmail=${encodeURIComponent(user.email)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return;
      const data = await res.json();
      const orders: Array<{ id: string; status: string }> = Array.isArray(data?.orders) ? data.orders : [];
      const ids = orders.map((o) => o.id);
      localStorage.setItem(`ahp_seen_orders_${user.email}`, JSON.stringify(ids));
      setNewOrderCount(0);
    } catch {
      /* bỏ qua */
    }
  };

  const activeBrand = BRANDS.find((brand) => pathname === brand.href)?.slug || (pathname === '/products' ? searchParams.get('brand') : null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const nextSearchQuery = searchQuery.trim();

    if (nextSearchQuery) {
      router.push(`/?search=${encodeURIComponent(nextSearchQuery)}`);
      return;
    }

    router.push('/');
  };

  useEffect(() => {
    setSearchQuery(pathname === '/' ? searchParams.get('search') || '' : '');
  }, [pathname, searchParams]);

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
      <header className="bg-primary-800 text-white shadow-sm">
        <div className="border-b border-white/10 bg-primary-900">
          <div className="container-custom">
            <div className="flex h-10 items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-4 sm:gap-6">
                <Link href="/news" className="text-slate-200 hover:text-white transition-colors">Tin tức</Link>
                <Link href="/warranty" className="text-slate-200 hover:text-white transition-colors">Tra cứu bảo hành</Link>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <MapPin className="h-4 w-4 text-primary-100" />
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm focus:outline-none cursor-pointer"
                >
                  <option value="Hà Nội" className="text-gray-900">Hà Nội</option>
                  <option value="TP. HCM" className="text-gray-900">TP. HCM</option>
                  <option value="Đà Nẵng" className="text-gray-900">Đà Nẵng</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="container-custom py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-6">
            <Link href="/" className="flex-shrink-0 order-1">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-500 text-sm font-black text-white shadow-sm">
                  AH
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold leading-tight uppercase tracking-normal">AH Phone Store</h1>
                  <p className="text-xs text-slate-300">Điện thoại chính hãng</p>
                </div>
              </div>
            </Link>

            <form onSubmit={handleSearch} className="order-3 basis-full sm:order-2 sm:basis-auto flex-1 max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm..."
                  className="h-12 w-full rounded-md border border-white/10 bg-white px-4 pr-12 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-md bg-primary-500 text-white transition-colors hover:bg-primary-400"
                  aria-label="Tìm kiếm"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </form>

            <div className="order-2 sm:order-3 flex items-center gap-1 sm:gap-3 flex-shrink-0">
              {authLoading ? (
                <div className="flex items-center gap-1 sm:gap-3" aria-label="Đang tải tài khoản">
                  <div className="h-10 w-20 rounded-md bg-white/15 animate-pulse" />
                  <div className="h-10 w-20 rounded-md bg-white/15 animate-pulse" />
                </div>
              ) : isAuthenticated && user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((prev) => !prev)}
                    className="relative flex h-10 items-center gap-2 rounded-md bg-white/15 border border-white/30 px-3 text-white hover:bg-white/25 transition-colors backdrop-blur-sm"
                  >
                    <User className="h-5 w-5" />
                    <span className="text-sm font-semibold hidden sm:block">{user.firstname}</span>
                    {newOrderCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-gray-900 shadow">
                        {newOrderCount > 9 ? '9+' : newOrderCount}
                      </span>
                    )}
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-2 z-[60] border border-gray-100">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{`${user.firstname} ${user.lastname}`}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/account/info"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Thông tin người dùng
                      </Link>
                      <Link
                        href="/account/password"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Đổi mật khẩu
                      </Link>
                      <Link
                        href="/account/orders"
                        onClick={() => { setUserMenuOpen(false); void markOrdersSeen(); }}
                        className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span>Đơn hàng của tôi</span>
                        {newOrderCount > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-gray-900">
                            {newOrderCount > 9 ? '9+' : newOrderCount}
                          </span>
                        )}
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link href="/login" className="flex h-10 items-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-primary-950 shadow-sm transition-colors hover:bg-slate-100">
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:block">Đăng nhập</span>
                  </Link>
                  <Link href="/register" className="hidden h-10 items-center gap-2 rounded-md border border-white/15 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:flex">
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:block">Đăng ký</span>
                  </Link>
                </>
              )}

              <Link href="/cart" className="relative flex h-10 items-center gap-2 rounded-md bg-amber-400 px-3 text-sm font-bold text-gray-900 shadow-sm transition-colors hover:bg-amber-300 flex-shrink-0">
                <ShoppingCart className="h-5 w-5" />
                <span className="hidden sm:block">Giỏ hàng</span>
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-white text-primary-600 text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold border-2 border-amber-400">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white/95 border-b border-slate-200 shadow-sm sticky top-0 z-50 backdrop-blur">
        <div className="container-custom">
          <div className="flex items-center gap-2 py-3 overflow-x-auto hide-scrollbar">
            {BRANDS.map((brand) => {
              const Icon = brand.icon;
              const isActive = activeBrand === brand.slug;
              return (
                <Link
                  key={brand.name}
                  href={brand.href}
                  className={`group flex h-10 items-center gap-2 rounded-md px-3 transition-all min-w-fit border ${
                    isActive
                      ? 'bg-primary-800 border-primary-800 text-white shadow-sm'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className={`transition-colors flex w-7 items-center justify-center ${isActive ? 'text-primary-100' : 'text-slate-600 group-hover:text-primary-950'}`}>
                    <Icon size={brand.size || 24} />
                  </span>
                  <span className="text-sm font-semibold transition-colors whitespace-nowrap">
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
