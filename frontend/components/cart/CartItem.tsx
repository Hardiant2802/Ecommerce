'use client';

import { getPrimaryProductImageUrl } from '@/lib/utils/image';
import { formatPrice } from '@/lib/utils/formatters';

interface CartItemProps {
  item: {
    id: string;
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
  onCheckout: (id: string) => void;
  updating: boolean;
}

export default function CartItem({ item, onUpdateQuantity, onRemove, onCheckout, updating }: CartItemProps) {
  const originalUnitPrice = item.product.price_range?.minimum_price?.regular_price?.value ?? item.prices.price.value;
  const originalCurrency = item.product.price_range?.minimum_price?.regular_price?.currency ?? item.prices.price.currency;
  const originalRowTotal = originalUnitPrice * item.quantity;
  const imageUrl = getPrimaryProductImageUrl({
    image: item.product.image || item.product.thumbnail,
    media_gallery: item.product.media_gallery,
    updated_at: item.product.updated_at,
  });

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
        <h3 className="font-semibold text-gray-900 mb-1">{item.product.name}</h3>
        <p className="text-sm text-gray-600 mb-2">{formatPrice(originalUnitPrice, originalCurrency)}</p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
              disabled={updating || item.quantity <= 1}
              className="px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
            >
              -
            </button>
            <span className="px-4 py-1 border-x">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              disabled={updating}
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
            onClick={() => onCheckout(item.id)}
            disabled={updating}
            className="text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-3 py-1 rounded-md transition-colors"
          >
            Thanh toán riêng
          </button>
        </div>
      </div>

      <div className="text-right">
        <p className="font-bold text-lg">{formatPrice(originalRowTotal, originalCurrency)}</p>
      </div>
    </div>
  );
}
