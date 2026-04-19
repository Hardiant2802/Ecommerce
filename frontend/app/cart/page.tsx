'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth, useCart } from '@/lib/hooks';
import CartItem from '@/components/cart/CartItem';
import CartSummary from '@/components/cart/CartSummary';
import Button from '@/components/ui/Button';

export default function CartPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { cart, updateQuantity, removeItem, loading: cartLoading } = useCart();
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      alert('Vui lòng đăng nhập để xem giỏ hàng');
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang chuyển hướng...</p>
        </div>
      </div>
    );
  }

  const handleUpdateQuantity = async (id: string, quantity: number) => {
    setUpdating(true);
    try {
      await updateQuantity(id, quantity);
    } catch (error) {
      console.error('Failed to update quantity:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to remove this item?')) return;
    
    setUpdating(true);
    try {
      await removeItem(id);
    } catch (error) {
      console.error('Failed to remove item:', error);
    } finally {
      setUpdating(false);
    }
  };

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-custom">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8" />
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded" />
                ))}
              </div>
              <div className="h-64 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !cart || !cart.items || cart.items.length === 0;
  const originalTotal = cart?.items?.reduce((sum, item) => {
    const unitPrice = item.product.price_range?.minimum_price?.regular_price?.value ?? item.prices.price.value;
    return sum + unitPrice * item.quantity;
  }, 0) ?? 0;
  const originalCurrency = cart?.items?.[0]?.product.price_range?.minimum_price?.regular_price?.currency
    ?? cart?.items?.[0]?.prices?.price?.currency
    ?? 'VND';

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center py-16">
            <svg
              className="mx-auto h-24 w-24 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">
              Looks like you haven't added any items to your cart yet.
            </p>
            <Link href="/products">
              <Button size="lg">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {cart.items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemove}
                  updating={updating}
                />
              ))}
            </div>
          </div>

          {/* Summary */}
          <div>
            <CartSummary
                subtotal={originalTotal}
                total={originalTotal}
              currency={originalCurrency}
              itemCount={cart.total_quantity}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
