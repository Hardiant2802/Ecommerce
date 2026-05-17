'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useCart } from '@/lib/hooks';
import CartItem from '@/components/cart/CartItem';
import CartSummary from '@/components/cart/CartSummary';
import Button from '@/components/ui/Button';
import type { InternalOrder } from '@/types/order';

const CART_SYNC_STORAGE_KEY = 'ahphone_checkout_pending_cart_sync';
const PURCHASED_ORDERS_CACHE_KEY_PREFIX = 'ahphone_purchased_orders_v1';

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
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getLocalStorageSafe(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function buildPurchasedOrdersCacheKey(customerEmail: string): string {
  return `${PURCHASED_ORDERS_CACHE_KEY_PREFIX}:${customerEmail.trim().toLowerCase()}`;
}

function readPurchasedOrdersCache(customerEmail: string): InternalOrder[] {
  const storage = getLocalStorageSafe();
  if (!storage) return [];

  const normalizedEmail = customerEmail.trim().toLowerCase();
  if (!normalizedEmail) return [];

  const raw = storage.getItem(buildPurchasedOrdersCacheKey(normalizedEmail));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as { orders?: unknown };
    if (!Array.isArray(parsed.orders)) return [];
    return parsed.orders as InternalOrder[];
  } catch {
    return [];
  }
}

function writePurchasedOrdersCache(customerEmail: string, orders: InternalOrder[]): void {
  const storage = getLocalStorageSafe();
  if (!storage) return;

  const normalizedEmail = customerEmail.trim().toLowerCase();
  if (!normalizedEmail) return;

  storage.setItem(
    buildPurchasedOrdersCacheKey(normalizedEmail),
    JSON.stringify({
      savedAt: Date.now(),
      orders,
    }),
  );
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
    const checkoutMode = parsed.checkoutMode === 'total' ? 'total' : 'single';
    const expectedQuantityBeforePay = Math.max(0, Math.floor(Number(parsed.expectedQuantityBeforePay || 0)));

    if (!orderId || !sku) return null;

    return {
      orderId,
      itemId: String(parsed.itemId || '').trim() || undefined,
      itemUid: String(parsed.itemUid || '').trim() || undefined,
      sku,
      paidUnits,
      checkoutMode,
      expectedQuantityBeforePay,
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
  const { cart, updateQuantity, removeItem, refreshCart, loading: cartLoading } = useCart();
  const router = useRouter();
  const [updatingItemIds, setUpdatingItemIds] = useState<Record<string, number>>({});
  const [repurchasingSku, setRepurchasingSku] = useState<string | null>(null);
  const [repurchaseError, setRepurchaseError] = useState<string | null>(null);
  const [purchasedOrders, setPurchasedOrders] = useState<InternalOrder[]>([]);
  const [loadingPurchased, setLoadingPurchased] = useState(false);
  const pendingCartSyncHandledRef = useRef(false);

  const safeCartItems = useMemo(() => {
    const items = Array.isArray(cart?.items) ? cart.items : [];
    return items.filter((item): item is (typeof items)[number] => {
      return Boolean(item && item.id && item.product && item.product.sku && item.product.name && item.prices?.price);
    });
  }, [cart?.items]);

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
      for (const rawItem of items) {
        if (!rawItem || typeof rawItem !== 'object') continue;

        const sku = String((rawItem as { sku?: string }).sku || '').trim();
        if (!sku) continue;

        const name = String((rawItem as { name?: string }).name || sku);
        const quantity = Math.max(0, Math.floor(Number((rawItem as { quantity?: number }).quantity || 0)));
        const key = sku;
        const previous = map.get(key);

        if (!previous) {
          map.set(key, {
            sku,
            name,
            totalQuantity: quantity,
            lastPaidAt: paidAt,
          });
          continue;
        }

        map.set(key, {
          ...previous,
          totalQuantity: previous.totalQuantity + quantity,
          lastPaidAt: Math.max(previous.lastPaidAt, paidAt),
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.lastPaidAt - a.lastPaidAt);
  }, [purchasedOrders]);

  useEffect(() => {
    const customerEmail = user?.email?.trim();
    if (authLoading || !isAuthenticated || !customerEmail) {
      setPurchasedOrders([]);
      return;
    }

    const cachedOrders = readPurchasedOrdersCache(customerEmail);
    if (cachedOrders.length > 0) {
      setPurchasedOrders(cachedOrders);
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
          if (normalizedOrders.length > 0) {
            setPurchasedOrders(normalizedOrders);
            writePurchasedOrdersCache(customerEmail, normalizedOrders);
          } else {
            setPurchasedOrders(cachedOrders);
          }
        }
      } catch (error) {
        console.error('Không thể tải sản phẩm đã mua:', error);
        if (!cancelled) {
          setPurchasedOrders(cachedOrders);
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
    if (pendingCartSyncHandledRef.current) {
      return;
    }

    if (authLoading || cartLoading || !isAuthenticated || !cart) {
      return;
    }

    const pending = readPendingCartSync();
    if (!pending) {
      pendingCartSyncHandledRef.current = true;
      return;
    }

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

      if (!matchedItem) {
        clearPendingCartSync();
        await refreshCart();
        return;
      }

      const currentQuantity = Math.max(0, Math.floor(matchedItem.quantity));
      const normalizedPaidUnits = pending.checkoutMode === 'single'
        ? 1
        : Math.max(1, Math.floor(pending.paidUnits));

      // Guard against double-sync or stale cart refresh applying one more deduction than intended.
      const expectedBefore = Math.max(0, Math.floor(pending.expectedQuantityBeforePay || 0));
      if (expectedBefore > 0) {
        const expectedRemaining = Math.max(0, expectedBefore - normalizedPaidUnits);
        if (currentQuantity <= expectedRemaining) {
          clearPendingCartSync();
          await refreshCart();
          return;
        }
      }

      const nextQuantity = Math.max(0, currentQuantity - normalizedPaidUnits);
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

  const handleRepurchase = (sku: string) => {
    setRepurchaseError(null);
    setRepurchasingSku(sku);
    router.push(`/checkout?sku=${encodeURIComponent(sku)}&payment=banking&mode=single&buyAgain=1`);
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
        if (currentCount <= 1) {
          delete next[id];
        } else {
          next[id] = currentCount - 1;
        }
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
        if (currentCount <= 1) {
          delete next[id];
        } else {
          next[id] = currentCount - 1;
        }
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

  const originalTotal = safeCartItems.reduce((sum, item) => {
    const rowTotal = Number(item.prices?.row_total?.value);
    if (Number.isFinite(rowTotal) && rowTotal >= 0) {
      return sum + rowTotal;
    }

    const unitPrice = Number(item.prices?.price?.value);
    if (Number.isFinite(unitPrice) && unitPrice >= 0) {
      return sum + (unitPrice * Math.max(1, Math.floor(item.quantity)));
    }

    const fallbackUnitPrice = Number(item.product.price_range?.minimum_price?.regular_price?.value || 0);
    return sum + (fallbackUnitPrice * Math.max(1, Math.floor(item.quantity)));
  }, 0);
  const originalCurrency = safeCartItems[0]?.prices?.price?.currency
    ?? safeCartItems[0]?.product.price_range?.minimum_price?.regular_price?.currency
    ?? 'VND';

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

  const isEmpty = safeCartItems.length === 0;

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
              {safeCartItems.map((item) => {
                const rowKey = item.uid || item.id || item.product.sku;
                return (
                  <CartItem
                    key={rowKey}
                    item={item}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={handleRemove}
                    onCheckout={handleCheckout}
                    updating={(updatingItemIds[item.id] || 0) > 0}
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
              itemCount={safeCartItems.reduce((sum, item) => sum + Math.max(0, Math.floor(item.quantity)), 0)}
            />
          </div>
        </div>

        {purchasedSection}
      </div>
    </div>
  );
}
