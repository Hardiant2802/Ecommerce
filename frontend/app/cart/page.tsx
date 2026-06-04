'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useCart } from '@/lib/hooks';
import CartItem from '@/components/cart/CartItem';
import CartSummary from '@/components/cart/CartSummary';
import Button from '@/components/ui/Button';

const CART_SYNC_STORAGE_KEY = 'ahphone_checkout_pending_cart_sync';

interface PendingCartSync {
  orderId: string;
  itemId?: string;
  itemUid?: string;
  sku: string;
  paidUnits: number;
  checkoutMode?: 'single' | 'total';
  expectedQuantityBeforePay?: number;
  savedAt: number;
}

function getSessionStorageSafe(): Storage | null {
  if (typeof window === 'undefined') return null;
  try { return window.sessionStorage; } catch { return null; }
}

function readPendingCartSync(): PendingCartSync | null {
  const storage = getSessionStorageSafe();
  if (!storage) return null;
  const raw = storage.getItem(CART_SYNC_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingCartSync>;
    const orderId = String(parsed.orderId || '').trim();
    const sku = String(parsed.sku || '').trim();
    if (!orderId || !sku) return null;
    return {
      orderId,
      itemId: String(parsed.itemId || '').trim() || undefined,
      itemUid: String(parsed.itemUid || '').trim() || undefined,
      sku,
      paidUnits: Math.max(1, Math.floor(Number(parsed.paidUnits || 1))),
      checkoutMode: parsed.checkoutMode === 'total' ? 'total' : 'single',
      expectedQuantityBeforePay: Math.max(0, Math.floor(Number(parsed.expectedQuantityBeforePay || 0))),
      savedAt: Number(parsed.savedAt || 0),
    };
  } catch { return null; }
}

function clearPendingCartSync(): void {
  const storage = getSessionStorageSafe();
  if (!storage) return;
  storage.removeItem(CART_SYNC_STORAGE_KEY);
}

export default function CartPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { cart, updateQuantity, removeItem, refreshCart, loading: cartLoading } = useCart();
  const router = useRouter();
  const [updatingItemIds, setUpdatingItemIds] = useState<Record<string, number>>({});
  const pendingCartSyncHandledRef = useRef(false);

  const safeCartItems = useMemo(() => {
    const items = Array.isArray(cart?.items) ? cart.items : [];
    return items.filter((item): item is (typeof items)[number] => {
      return Boolean(item && item.id && item.product && item.product.sku && item.product.name && item.prices?.price);
    });
  }, [cart?.items]);

  /* Refresh cart khi vào trang */
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    void refreshCart().catch((error) => {
      console.error('Không thể làm mới giỏ hàng:', error);
    });
  }, [authLoading, isAuthenticated, refreshCart]);

  /* Áp dụng pending cart sync sau khi thanh toán */
  useEffect(() => {
    if (pendingCartSyncHandledRef.current) return;
    if (authLoading || cartLoading || !isAuthenticated || !cart) return;

    const pending = readPendingCartSync();
    if (!pending) { pendingCartSyncHandledRef.current = true; return; }

    const pendingAgeMs = Date.now() - Math.max(0, pending.savedAt || 0);
    if (pendingAgeMs > 15 * 60 * 1000) {
      clearPendingCartSync();
      pendingCartSyncHandledRef.current = true;
      return;
    }

    pendingCartSyncHandledRef.current = true;
    let cancelled = false;

    const applyPendingSync = async () => {
      const matchedItem = cart.items.find((item) => {
        if (pending.itemId && item.id === pending.itemId) return true;
        if (pending.itemUid && item.uid === pending.itemUid) return true;
        return item.product.sku === pending.sku;
      });

      if (!matchedItem) { clearPendingCartSync(); await refreshCart(); return; }

      const currentQuantity = Math.max(0, Math.floor(matchedItem.quantity));
      const normalizedPaidUnits = pending.checkoutMode === 'single'
        ? 1 : Math.max(1, Math.floor(pending.paidUnits));

      const expectedBefore = Math.max(0, Math.floor(pending.expectedQuantityBeforePay || 0));
      if (expectedBefore > 0) {
        const expectedRemaining = Math.max(0, expectedBefore - normalizedPaidUnits);
        if (currentQuantity <= expectedRemaining) {
          clearPendingCartSync(); await refreshCart(); return;
        }
      }

      const nextQuantity = Math.max(0, currentQuantity - normalizedPaidUnits);
      if (nextQuantity <= 0) { await removeItem(matchedItem.id); }
      else { await updateQuantity(matchedItem.id, nextQuantity); }

      clearPendingCartSync();
      if (!cancelled) await refreshCart();
    };

    void applyPendingSync().catch((error) => {
      console.error('Không thể đồng bộ giỏ hàng từ thanh toán:', error);
    });

    return () => { cancelled = true; };
  }, [authLoading, cartLoading, isAuthenticated, cart, refreshCart, removeItem, updateQuantity]);

  /* Redirect nếu chưa đăng nhập */
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login?redirect=/cart');
  }, [authLoading, isAuthenticated, router]);

  const handleCheckout = (itemId: string, _sku: string) => {
    const item = encodeURIComponent(itemId);
    router.push(`/checkout?itemId=${item}&payment=banking&mode=single&buyAgain=1`);
  };

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
    setUpdatingItemIds((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    try {
      await updateQuantity(id, quantity);
    } catch (error) {
      console.error('Không thể cập nhật số lượng:', error);
      throw error;
    } finally {
      setUpdatingItemIds((prev) => {
        const next = { ...prev };
        const currentCount = next[id] || 0;
        if (currentCount <= 1) { delete next[id]; } else { next[id] = currentCount - 1; }
        return next;
      });
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này không?')) return;
    setUpdatingItemIds((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    try {
      await removeItem(id);
    } catch (error) {
      console.error('Không thể xóa sản phẩm:', error);
    } finally {
      setUpdatingItemIds((prev) => {
        const next = { ...prev };
        const currentCount = next[id] || 0;
        if (currentCount <= 1) { delete next[id]; } else { next[id] = currentCount - 1; }
        return next;
      });
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
                {[1, 2, 3].map((i) => (<div key={i} className="h-24 bg-gray-200 rounded" />))}
              </div>
              <div className="h-64 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const originalTotal = safeCartItems.reduce((sum, item) => {
    const rowTotal = Number(item.prices?.row_total?.value);
    if (Number.isFinite(rowTotal) && rowTotal >= 0) return sum + rowTotal;
    const unitPrice = Number(item.prices?.price?.value);
    if (Number.isFinite(unitPrice) && unitPrice >= 0) return sum + (unitPrice * Math.max(1, Math.floor(item.quantity)));
    const fallbackUnitPrice = Number(item.product.price_range?.minimum_price?.regular_price?.value || 0);
    return sum + (fallbackUnitPrice * Math.max(1, Math.floor(item.quantity)));
  }, 0);

  const originalCurrency = safeCartItems[0]?.prices?.price?.currency
    ?? safeCartItems[0]?.product.price_range?.minimum_price?.regular_price?.currency
    ?? 'VND';

  const isEmpty = safeCartItems.length === 0;

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center py-16">
            <svg className="mx-auto h-24 w-24 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng của bạn đang trống</h2>
            <p className="text-gray-600 mb-4">Có vẻ bạn chưa thêm sản phẩm nào vào giỏ hàng.</p>
            <p className="text-sm text-gray-500 mb-8">
              Xem{' '}
              <Link href="/account" className="text-primary-600 hover:underline font-medium">
                lịch sử đơn hàng
              </Link>{' '}
              tại trang tài khoản.
            </p>
            <Link href="/"><Button size="lg">Tiếp tục mua sắm</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Giỏ hàng</h1>
        <div className="grid md:grid-cols-3 gap-4 md:gap-8">
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
              {safeCartItems.map((item) => {
                const rowKey = item.uid || item.id || item.product.sku;
                return (
                  <CartItem key={rowKey} item={item}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={handleRemove}
                    onCheckout={handleCheckout}
                    updating={(updatingItemIds[item.id] || 0) > 0} />
                );
              })}
            </div>
          </div>
          <div>
            <CartSummary subtotal={originalTotal} total={originalTotal} currency={originalCurrency}
              itemCount={safeCartItems.reduce((sum, item) => sum + Math.max(0, Math.floor(item.quantity)), 0)} />
          </div>
        </div>
      </div>
    </div>
  );
}
