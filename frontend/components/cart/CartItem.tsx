'use client';

import { useEffect, useState } from 'react';
import { getPrimaryProductImageUrl } from '@/lib/utils/image';
import { formatPrice } from '@/lib/utils/formatters';

interface CartItemProps {
  item: {
    id: string;
    uid?: string;
    product: {
      sku: string;
      name: string;
      price_range?: {
        minimum_price?: {
          regular_price?: {
            value: number;
            currency: string;
          };
        };
      };
      updated_at?: string;
      thumbnail?: {
        url: string;
        label: string;
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
    };
    quantity: number;
    prices: {
      price: {
        value: number;
        currency: string;
      };
      row_total: {
        value: number;
        currency: string;
      };
    };
  };
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onCheckout: (id: string, sku: string) => void;
  updating: boolean;
}

export default function CartItem({ item, onUpdateQuantity, onRemove, onCheckout, updating }: CartItemProps) {
  const originalUnitPrice = item.product.price_range?.minimum_price?.regular_price?.value ?? item.prices.price.value;
  const originalCurrency = item.product.price_range?.minimum_price?.regular_price?.currency ?? item.prices.price.currency;
  const normalizedQuantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
  const [displayQuantity, setDisplayQuantity] = useState<number>(normalizedQuantity);
  const originalRowTotal = originalUnitPrice * displayQuantity;
  const imageUrl = getPrimaryProductImageUrl({
    image: item.product.image || item.product.thumbnail,
    media_gallery: item.product.media_gallery,
    updated_at: item.product.updated_at,
  });

  useEffect(() => {
    setDisplayQuantity(normalizedQuantity);
  }, [item.id, normalizedQuantity]);

  const handleDecrease = () => {
    setDisplayQuantity((current) => {
      const next = Math.max(1, current - 1);
      if (next !== current) {
        onUpdateQuantity(item.id, next);
      }
      return next;
    });
  };

  const handleIncrease = () => {
    setDisplayQuantity((current) => {
      const next = current + 1;
      onUpdateQuantity(item.id, next);
      return next;
    });
  };

  return (
    <div className="flex gap-4 py-4 border-b">
      <div className="relative w-24 h-24 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
        <img
          src={imageUrl}
          alt={item.product.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const t = e.currentTarget;
            if (!t.src.endsWith('/images/placeholder.svg')) t.src = '/images/placeholder.svg';
          }}
        />
      </div>

      <div className="flex-grow">
        <h3 className="font-semibold text-gray-900 mb-1">
          {item.product.name}
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          {formatPrice(originalUnitPrice, originalCurrency)}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              onClick={handleDecrease}
              disabled={displayQuantity <= 1}
              className="px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
            >
              -
            </button>
            <span className="px-4 py-1 border-x">{displayQuantity}</span>
            <button
              onClick={handleIncrease}
              className="px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
            >
              +
            </button>
          </div>

          <button
            onClick={() => onRemove(item.id)}
            disabled={updating}
            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Xóa
          </button>

          <button
            onClick={() => onCheckout(item.uid || item.id, item.product.sku)}
            disabled={updating}
            className="text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-3 py-1 rounded-md transition-colors"
          >
            Thanh toán riêng
          </button>
        </div>
      </div>

      <div className="text-right">
        <p className="font-bold text-lg">
          {formatPrice(originalRowTotal, originalCurrency)}
        </p>
      </div>
    </div>
  );
}
