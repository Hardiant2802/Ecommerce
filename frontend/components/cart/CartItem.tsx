'use client';

import Image from 'next/image';
import { formatPrice } from '@/lib/utils/formatters';
import Button from '@/components/ui/Button';

interface CartItemProps {
  item: {
    id: string;
    product: {
      sku: string;
      name: string;
      thumbnail: {
        url: string;
        label: string;
      };
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
  updating: boolean;
}

export default function CartItem({ item, onUpdateQuantity, onRemove, updating }: CartItemProps) {
  return (
    <div className="flex gap-4 py-4 border-b">
      <div className="relative w-24 h-24 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
        <Image
          src={item.product.thumbnail.url}
          alt={item.product.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="flex-grow">
        <h3 className="font-semibold text-gray-900 mb-1">
          {item.product.name}
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          {formatPrice(item.prices.price.value, item.prices.price.currency)}
        </p>

        <div className="flex items-center gap-3">
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
            Remove
          </button>
        </div>
      </div>

      <div className="text-right">
        <p className="font-bold text-lg">
          {formatPrice(item.prices.row_total.value, item.prices.row_total.currency)}
        </p>
      </div>
    </div>
  );
}
