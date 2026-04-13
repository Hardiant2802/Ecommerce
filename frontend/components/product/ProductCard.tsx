'use client';

import Link from 'next/link';
import { formatPrice } from '@/lib/utils/formatters';
import { getPrimaryProductImageUrl } from '@/lib/utils/image';
import Button from '@/components/ui/Button';
import { useCart } from '@/lib/hooks';
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
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const [adding, setAdding] = useState(false);

  const price = product.price_range.minimum_price.final_price || 
    product.price_range.minimum_price.regular_price;
  
  const imageUrl = getPrimaryProductImageUrl(product);
  const productUrl = `/product/${product.sku}`;
  const inStock = product.stock_status !== 'OUT_OF_STOCK';

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!inStock) return;
    
    setAdding(true);
    try {
      await addToCart(product.sku, 1);
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add product to cart');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link href={productUrl} className="group">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative aspect-square bg-gray-100">
          {/* Use regular img tag for external Magento images to avoid SSL/proxy issues */}
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
            onError={(event) => {
              const target = event.currentTarget;
              if (!target.src.endsWith('/images/placeholder.svg')) {
                target.src = '/images/placeholder.svg';
              }
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
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
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
