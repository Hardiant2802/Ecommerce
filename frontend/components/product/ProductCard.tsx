'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils/formatters';
import { getPrimaryProductImageUrl } from '@/lib/utils/image';
import { buildProductPath } from '@/lib/utils/productRouting';
import Button from '@/components/ui/Button';
import { useCart, useAuth } from '@/lib/hooks';
import { useToast } from '@/context/ToastContext';
import { useState } from 'react';

interface ProductCardProps {
  product: {
    id: string;
    sku: string;
    name: string;
    url_key?: string;
    price_range: {
      minimum_price: {
        regular_price: {
          value: number;
          currency: string;
        };
        final_price?: {
          value: number;
          currency: string;
        };
      };
    };
    image?: {
      url: string;
      label: string;
    };
    media_gallery?: Array<{
      url: string;
      label: string;
      position: number;
      disabled?: boolean;
    }>;
    updated_at?: string;
    stock_status?: string;
    categories?: Array<{
      name?: string;
      url_key?: string;
      url_path?: string;
    }>;
  };
  currentBrand?: string;
}

export default function ProductCard({ product, currentBrand }: ProductCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);

  const price =
    product.price_range.minimum_price.final_price ||
    product.price_range.minimum_price.regular_price;
  
  const imageUrl = getPrimaryProductImageUrl(product);
  const productUrl = buildProductPath(product, currentBrand);
  const inStock = product.stock_status !== 'OUT_OF_STOCK';

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!inStock) return;

    // Require login before purchasing
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(productUrl)}`);
      return;
    }

    setAdding(true);
    try {
      await addToCart(product.sku, 1);
      showToast(`Đã thêm "${product.name}" vào giỏ hàng`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (message.includes('auth_required') || message.includes('unauthorized') || message.includes('customer token')) {
        router.push(`/login?redirect=${encodeURIComponent(productUrl)}`);
        return;
      }

      if (message.includes('required option') || message.includes("weren't entered")) {
        router.push(productUrl);
        return;
      }

      console.error('Error adding to cart:', error);
      showToast('Không thể thêm sản phẩm vào giỏ hàng', 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link href={productUrl} className="group h-full">
      <div className="h-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg flex flex-col">
        <div className="relative aspect-square flex-shrink-0 bg-slate-50 p-3 sm:p-4">
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.visibility = 'hidden';
            }}
          />
          {!inStock && (
            <div className="absolute inset-0 bg-primary-800/55 flex items-center justify-center">
              <span className="bg-white px-4 py-2 rounded-md font-semibold text-slate-900 shadow-sm">
                Hết hàng
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <h3 className="mb-2 min-h-[2.75rem] text-sm font-semibold leading-snug text-slate-900 line-clamp-2 transition-colors group-hover:text-primary-700 sm:min-h-[3rem] sm:text-base">
            {product.name}
          </h3>
          <p className="mb-3 break-words text-base font-bold text-rose-600 sm:text-lg">
            {formatPrice(price.value, price.currency)}
          </p>
          <Button
            fullWidth
            size="sm"
            onClick={handleAddToCart}
            disabled={!inStock}
            loading={adding}
            className="mt-auto"
          >
            {inStock ? 'Mua' : 'Hết hàng'}
          </Button>
        </div>
      </div>
    </Link>
  );
}
