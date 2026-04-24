'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useCart } from '@/lib/hooks';
import CartItem from '@/components/cart/CartItem';
import CartSummary from '@/components/cart/CartSummary';
import Button from '@/components/ui/Button';
import type { InternalOrder } from '@/types/order';

const CART_SYNC_STORAGE_KEY = 'ahphone_checkout_pending_cart_sync';

interface PendingCartSync {
  orderId: string;
  itemId?: string;
  itemUid?: string;
  sku: string;
  paidUnits: number;
  savedAt: number;
}

function getSessionStorageSafe(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
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
    const paidUnits = Math.max(1, Math.floor(Number(parsed.paidUnits || 1)));

    if (!orderId || !sku) return null;

    return {
      orderId,
      itemId: String(parsed.itemId || '').trim() || undefined,
      itemUid: String(parsed.itemUid || '').trim() || undefined,
      sku,
      paidUnits,
      savedAt: Number(parsed.savedAt || 0),
    };
  } catch {
    return null;
  }
}

function clearPendingCartSync(): void {
  const storage = getSessionStorageSafe();
  if (!storage) return;
  storage.removeItem(CART_SYNC_STORAGE_KEY);
}

function formatPaidTime(timestamp?: number): string {
  if (!timestamp) return 'Không rõ thời gian';
  try {
    return new Date(timestamp).toLocaleString('vi-VN');
  } catch {
    return 'Không rõ thời gian';
  }
}

function shouldHidePurchasedOrder(order: InternalOrder): boolean {
  const keywords = ['WEBHOOK FALLBACK FINAL TEST', 'TEST-WEBHOOK-FALLBACK'];
  const items = Array.isArray(order.items) ? order.items : [];

  return items.some((item) => {
    const name = String(item.name || '').toUpperCase();
    const sku = String(item.sku || '').toUpperCase();
    return keywords.some((keyword) => name.includes(keyword) || sku.includes(keyword));
  });
}

export default function CartPage() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { cart, updateQuantity, removeItem, addToCart, refreshCart, loading: cartLoading } = useCart();
  const router = useRouter();
  const [updatingItemIds, setUpdatingItemIds] = useState<Record<string, boolean>>({});
  const [repurchasingSku, setRepurchasingSku] = useState<string | null>(null);
  const [repurchaseError, setRepurchaseError] = useState<string | null>(null);
  const [purchasedOrders, setPurchasedOrders] = useState<InternalOrder[]>([]);
  const [loadingPurchased, setLoadingPurchased] = useState(false);

  useEffect(() => {
    const customerEmail = user?.email?.trim();
    if (authLoading || !isAuthenticated || !customerEmail) {
      setPurchasedOrders([]);
      return;
    }

    let cancelled = false;
    const fetchPurchasedOrders = async () => {
      setLoadingPurchased(true);
      try {
        const response = await fetch(
          `/api/orders/internal?limit=200&paidOnly=1&customerEmail=${encodeURIComponent(customerEmail)}`,
          { cache: 'no-store' },
        );

        if (!response.ok) {
          throw new Error(`Không thể tải danh sách đơn đã thanh toán (${response.status})`);
        }

        const data = await response.json();
        const orders = Array.isArray(data?.orders) ? (data.orders as InternalOrder[]) : [];
        const normalizedOrders = [...orders].sort((a, b) => {
          const aTime = a.paidAt || a.updatedAt || a.createdAt || 0;
          const bTime = b.paidAt || b.updatedAt || b.createdAt || 0;
          return bTime - aTime;
        }).filter((order) => !shouldHidePurchasedOrder(order));

        if (!cancelled) {
          setPurchasedOrders(normalizedOrders);
        }
      } catch (error) {
        console.error('Không thể tải sản phẩm đã mua:', error);
        if (!cancelled) {
          setPurchasedOrders([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingPurchased(false);
        }
      }
    };

    fetchPurchasedOrders();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, user?.email]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    // Ensure cart page always pulls freshest cart state after returning from checkout.
    void refreshCart().catch((error) => {
      console.error('Không thể làm mới giỏ hàng:', error);
    });
  }, [authLoading, isAuthenticated, refreshCart]);

  useEffect(() => {
    if (authLoading || cartLoading || !isAuthenticated || !cart) {
      return;
    }

    const pending = readPendingCartSync();
    if (!pending) {
      return;
    }

    let cancelled = false;
    const applyPendingSync = async () => {
      const matchedItem = cart.items.find((item) => {
        if (pending.itemId && item.id === pending.itemId) return true;
        if (pending.itemUid && item.uid === pending.itemUid) return true;
        return item.product.sku === pending.sku;
      });

      if (!matchedItem) {
        clearPendingCartSync();
        await refreshCart();
        return;
      }

      const nextQuantity = Math.max(0, Math.floor(matchedItem.quantity) - pending.paidUnits);
      if (nextQuantity <= 0) {
        await removeItem(matchedItem.id);
      } else {
        await updateQuantity(matchedItem.id, nextQuantity);
      }

      clearPendingCartSync();
      if (!cancelled) {
        await refreshCart();
      }
    };

    void applyPendingSync().catch((error) => {
      console.error('Không thể đồng bộ giỏ hàng từ thanh toán:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, cartLoading, isAuthenticated, cart, refreshCart, removeItem, updateQuantity]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/cart');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleCheckout = (itemId: string, _sku: string) => {
    const item = encodeURIComponent(itemId);
    router.push(`/checkout?itemId=${item}&payment=banking&mode=single&buyAgain=1`);
  };

  const handleRepurchase = async (sku: string) => {
    setRepurchaseError(null);
    setRepurchasingSku(sku);
    try {
      await addToCart(sku, 1);
      router.push(`/checkout?sku=${encodeURIComponent(sku)}&payment=banking&buyAgain=1`);
    } catch (error) {
      console.error('Không thể mua lại sản phẩm:', error);
      setRepurchaseError('Không thể thêm sản phẩm vào giỏ để mua lại. Vui lòng thử lại.');
    } finally {
      setRepurchasingSku(null);
    }
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
    setUpdatingItemIds((prev) => ({ ...prev, [id]: true }));
    try {
      await updateQuantity(id, quantity);
    } catch (error) {
      console.error('Không thể cập nhật số lượng:', error);
    } finally {
      setUpdatingItemIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này không?')) return;

    setUpdatingItemIds((prev) => ({ ...prev, [id]: true }));
    try {
      await removeItem(id);
    } catch (error) {
      console.error('Không thể xóa sản phẩm:', error);
    } finally {
      setUpdatingItemIds((prev) => {
        const next = { ...prev };
        delete next[id];
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

  const purchasedProducts = useMemo(() => {
    const map = new Map<string, {
      sku: string;
      name: string;
      totalQuantity: number;
      lastPaidAt: number;
    }>();

    for (const order of purchasedOrders) {
      const paidAt = order.paidAt || order.updatedAt || order.createdAt || 0;
      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        const key = item.sku;
        const previous = map.get(key);

        if (!previous) {
          map.set(key, {
            sku: item.sku,
            name: item.name,
            totalQuantity: Math.max(0, Math.floor(item.quantity || 0)),
            lastPaidAt: paidAt,
          });
          continue;
        }

        map.set(key, {
          ...previous,
          totalQuantity: previous.totalQuantity + Math.max(0, Math.floor(item.quantity || 0)),
          lastPaidAt: Math.max(previous.lastPaidAt, paidAt),
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.lastPaidAt - a.lastPaidAt);
  }, [purchasedOrders]);

  const purchasedSection = (
    <div className="mt-10">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Sản phẩm đã mua</h2>
          <span className="text-sm text-gray-500">{purchasedProducts.length} sản phẩm đã mua</span>
        </div>

        {loadingPurchased ? (
          <p className="text-gray-600">Đang tải lịch sử mua hàng...</p>
        ) : purchasedProducts.length === 0 ? (
          <p className="text-gray-600">Bạn chưa có đơn hàng nào đã thanh toán.</p>
        ) : (
          <div className="space-y-4">
            {repurchaseError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {repurchaseError}
              </div>
            )}
            {purchasedProducts.map((product) => (
              <div key={product.sku} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-800">{product.name}</p>
                    <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                    <p className="text-sm text-gray-500">SL đã mua: <span className="font-semibold text-gray-700">{product.totalQuantity}</span></p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="text-xs text-gray-500">Mua gần nhất: {formatPaidTime(product.lastPaidAt)}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRepurchase(product.sku)}
                      disabled={repurchasingSku === product.sku}
                    >
                      {repurchasingSku === product.sku ? 'Đang chuẩn bị QR mới...' : 'Mua lại (tạo QR mới)'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng của bạn đang trống</h2>
            <p className="text-gray-600 mb-8">
              Có vẻ bạn chưa thêm sản phẩm nào vào giỏ hàng.
            </p>
            <Link href="/">
              <Button size="lg">Tiếp tục mua sắm</Button>
            </Link>
          </div>

          {purchasedSection}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom">
        <h1 className="text-3xl font-bold mb-8">Giỏ hàng</h1>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {cart.items.map((item) => {
                const rowKey = item.uid || item.id || item.product.sku;
                return (
                  <CartItem
                    key={rowKey}
                    item={item}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={handleRemove}
                    onCheckout={handleCheckout}
                    updating={!!updatingItemIds[item.id]}
                  />
                );
              })}
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

        {purchasedSection}
      </div>
    </div>
  );
}
