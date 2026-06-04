import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import MobileCityHeader from '@/components/layout/MobileCityHeader';
import Footer from '@/components/layout/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'AH Phone Store - Điện thoại chính hãng',
  description: 'Mua bán điện thoại chính hãng, giá tốt nhất. Iphone, Samsung, Xiaomi, OPPO, Vivo, Asus, Red Magic. Giao hàng nhanh toàn quốc.',
  keywords: ['điện thoại', 'mobile', 'smartphone', 'Iphone', 'Samsung', 'Xiaomi', 'Oppo', 'Vivo', 'Asus', 'Red Magic'],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'AH Phone Store - Điện thoại chính hãng',
    description: 'Mua điện thoại chính hãng giá tốt nhất',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.variable}>
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
            <div className="flex flex-col min-h-screen">
              <Suspense fallback={null}>
                <MobileCityHeader />
              </Suspense>
              <main className="flex-grow bg-slate-50">
                {children}
              </main>
              <Footer />
            </div>
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
