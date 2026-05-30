'use client';

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
    customizable_options?: Array<{
      label: string;
      values: Array<{
        value: string;
        label?: string;
      }>;
    }>;
  };
  onUpdateQuantity: (id: string, quantity: number) => Promise<void>;
  onRemove: (id: string) => void;
  onCheckout: (id: string, sku: string) => void;
  updating: boolean;
}

export default function CartItem({ item, onUpdateQuantity, onRemove, onCheckout, updating }: CartItemProps) {
  const normalizedQuantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
  const fallbackUnitPrice = item.product.price_range?.minimum_price?.regular_price?.value ?? 0;
  const fallbackCurrency = item.product.price_range?.minimum_price?.regular_price?.currency || 'VND';
  const cartUnitPrice = Number(item.prices?.price?.value);
  const cartRowTotal = Number(item.prices?.row_total?.value);
  const displayUnitPrice = Number.isFinite(cartUnitPrice) ? cartUnitPrice : fallbackUnitPrice;
  const displayRowTotal = Number.isFinite(cartRowTotal) ? cartRowTotal : (displayUnitPrice * normalizedQuantity);
  const displayCurrency = item.prices?.price?.currency || fallbackCurrency;
  const selectedOptionLines = (item.customizable_options || [])
    .map((option) => {
      const values = (option.values || [])
        .map((value) => String(value.label || value.value || '').trim())
        .filter(Boolean);

      if (!option?.label || values.length === 0) {
        return '';
      }

      return `${option.label}: ${values.join(', ')}`;
    })
    .filter(Boolean);
  const imageUrl = getPrimaryProductImageUrl({
    image: item.product.image || item.product.thumbnail,
    media_gallery: item.product.media_gallery,
    updated_at: item.product.updated_at,
  });

  const handleDecrease = () => {
    if (updating || normalizedQuantity <= 1) {
      return;
    }

    const next = Math.max(1, normalizedQuantity - 1);
    void onUpdateQuantity(item.id, next).catch((error) => {
      console.error('Không thể cập nhật số lượng tại CartItem:', error);
    });
  };

  const handleIncrease = () => {
    if (updating) {
      return;
    }

    const next = normalizedQuantity + 1;
    void onUpdateQuantity(item.id, next).catch((error) => {
      console.error('Không thể cập nhật số lượng tại CartItem:', error);
    });
  };

  return (
    <div className="flex gap-3 py-4 border-b">
      {/* Ảnh sản phẩm */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
        <img
          src={imageUrl}
          alt={item.product.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden';
          }}
        />
      </div>

      {/* Thông tin sản phẩm */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
            {item.product.name}
          </h3>
          {/* Giá tổng — hiện bên phải trên mobile */}
          <p className="font-bold text-base sm:text-lg flex-shrink-0 text-gray-900">
            {formatPrice(displayRowTotal, displayCurrency)}
          </p>
        </div>

        {selectedOptionLines.map((line) => (
          <p key={line} className="text-xs text-gray-500 mt-0.5">
            {line}
          </p>
        ))}
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Đơn giá: {formatPrice(displayUnitPrice, displayCurrency)}
        </p>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              onClick={handleDecrease}
              disabled={normalizedQuantity <= 1 || updating}
              className="px-2.5 py-1 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              -
            </button>
            <span className="px-3 py-1 border-x text-sm">{normalizedQuantity}</span>
            <button
              onClick={handleIncrease}
              disabled={updating}
              className="px-2.5 py-1 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>

          <button
            onClick={() => onRemove(item.id)}
            disabled={updating}
            className="text-xs sm:text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Xóa
          </button>

          <button
            onClick={() => onCheckout(item.uid || item.id, item.product.sku)}
            disabled={updating}
            className="text-xs sm:text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors"
          >
            Mua riêng
          </button>
        </div>
      </div>
    </div>
  );
}
