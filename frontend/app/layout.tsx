import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import MobileCityHeader from '@/components/layout/MobileCityHeader';
import Footer from '@/components/layout/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Mobile City - Điện thoại, Laptop, Tablet chính hãng',
  description: 'Mua điện thoại, laptop, tablet, phụ kiện chính hãng, giá tốt nhất. iPhone, Samsung, Xiaomi, OPPO, Vivo. Giao hàng nhanh toàn quốc.',
  keywords: ['điện thoại', 'mobile', 'smartphone', 'iPhone', 'Samsung', 'Xiaomi', 'laptop', 'tablet'],
  openGraph: {
    title: 'Mobile City - Điện thoại chính hãng',
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
            <div className="flex flex-col min-h-screen">
              <MobileCityHeader />
              <main className="flex-grow bg-gray-50">
                {children}
              </main>
              <Footer />
            </div>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
