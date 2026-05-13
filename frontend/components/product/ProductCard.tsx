'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils/formatters';
import { getPrimaryProductImageUrl } from '@/lib/utils/image';
import { buildProductPath } from '@/lib/utils/productRouting';
import Button from '@/components/ui/Button';
import { useCart, useAuth } from '@/lib/hooks';
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
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [adding, setAdding] = useState(false);

  // Always show original price (no discount)
  const price = product.price_range.minimum_price.regular_price;
  
  const imageUrl = getPrimaryProductImageUrl(product);
  const productUrl = buildProductPath(product);
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
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (message.includes('auth_required') || message.includes('unauthorized') || message.includes('customer token')) {
        router.push(`/login?redirect=${encodeURIComponent(productUrl)}`);
        return;
      }
      console.error('Error adding to cart:', error);
      alert('Không thể thêm sản phẩm vào giỏ hàng');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link href={productUrl} className="group h-full">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
        <div className="relative aspect-square bg-gray-100 flex-shrink-0">
          {/* Use regular img tag for external Magento images to avoid SSL/proxy issues */}
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.visibility = 'hidden';
            }}
          />
          {!inStock && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="bg-white px-4 py-2 rounded-md font-semibold text-gray-900">
                Hết hàng
              </span>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors flex-1">
            {product.name}
          </h3>
          <p className="text-xl font-bold text-primary-600 mb-3">
            {formatPrice(price.value, price.currency)}
          </p>
          <Button
            fullWidth
            onClick={handleAddToCart}
            disabled={!inStock}
            loading={adding}
          >
            {inStock ? 'Mua' : 'Hết hàng'}
          </Button>
        </div>
      </div>
    </Link>
  );
}
