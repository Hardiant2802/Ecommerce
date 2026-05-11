'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Cart, CartItem } from '@/types/cart';
import { storage } from '@/lib/utils/storage';
import { useAuth } from '@/context/AuthContext';
import { graphqlClient } from '@/lib/graphql/client';
import {
  CREATE_EMPTY_CART,
  GET_CART,
  GET_CUSTOMER_CART,
  ADD_TO_CART,
  UPDATE_CART_ITEMS,
  REMOVE_ITEM_FROM_CART,
} from '@/lib/graphql/queries/cart';

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  addToCart: (sku: string, quantity: number) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/** Kiểm tra lỗi có phải "cart không tồn tại" không (khác với lỗi mạng) */
function isCartNotFoundError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    msg.includes('no such entity') ||
    msg.includes('could not find a cart') ||
    msg.includes('could not find cart') ||
    msg.includes('cart_not_found') ||
    msg.includes('the cart isn') ||
    msg.includes("wasn't found") ||
    msg.includes('cart id')
  );
}

function isCartAccessDeniedError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    msg.includes('cannot perform operations on cart') ||
    msg.includes('current user cannot') ||
    msg.includes('not authorized') ||
    msg.includes('permission') ||
    msg.includes('cannot assign customer to the given cart') ||
    msg.includes('cart does not belong to this customer')
  );
}

function isAuthTokenInvalidError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    msg.includes('401') ||
    msg.includes('unauthorized') ||
    msg.includes("current customer isn't authorized") ||
    msg.includes('customer token')
  );
}

function isTransientCartError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('abort') ||
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('503') ||
    msg.includes('504')
  );
}

function getUnitPrice(item: CartItem): number {
  return item.product.price_range?.minimum_price?.regular_price?.value ?? item.prices.price.value;
}

function applyOptimisticQuantity(cart: Cart, cartItemId: number, nextQuantity: number): Cart {
  const targetIndex = cart.items.findIndex((item) => Number(item.id) === cartItemId);
  if (targetIndex === -1) {
    return cart;
  }

  const targetItem = cart.items[targetIndex];
  const currentQuantity = Math.max(1, Math.floor(targetItem.quantity));
  const quantityDiff = nextQuantity - currentQuantity;

  if (quantityDiff === 0) {
    return cart;
  }

  const unitPrice = getUnitPrice(targetItem);
  const nextItems = cart.items.map((item, index) => {
    if (index !== targetIndex) {
      return item;
    }

    return {
      ...item,
      quantity: nextQuantity,
      prices: {
        ...item.prices,
        row_total: {
          ...item.prices.row_total,
          value: unitPrice * nextQuantity,
        },
      },
    };
  });

  const nextSubtotal = Math.max(0, cart.prices.subtotal_excluding_tax.value + unitPrice * quantityDiff);
  const nextGrandTotal = Math.max(0, cart.prices.grand_total.value + unitPrice * quantityDiff);

  return {
    ...cart,
    items: nextItems,
    total_quantity: Math.max(0, cart.total_quantity + quantityDiff),
    prices: {
      ...cart.prices,
      subtotal_excluding_tax: {
        ...cart.prices.subtotal_excluding_tax,
        value: nextSubtotal,
      },
      grand_total: {
        ...cart.prices.grand_total,
        value: nextGrandTotal,
      },
    },
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { token: authToken, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const updateLocksRef = useRef<Set<number>>(new Set());
  const queuedQuantitiesRef = useRef<Map<number, number>>(new Map());

  // Keep cart in sync with auth state changes (login/logout) without requiring page reload.
  useEffect(() => {
    const initCart = async () => {
      if (authLoading) {
        return;
      }

      setLoading(true);

      // Nếu đã đăng nhập -> dùng customerCart (gắn với tài khoản, không cần cart ID)
      if (authToken) {
        await loadCustomerCart(authToken);
        setLoading(false);
        return;
      }

      // Khách vãng lai -> dùng guest cart ID từ localStorage
      let storedCartId = storage.getCartId();

      if (!storedCartId) {
        storedCartId = await createGuestCart();
        if (!storedCartId) {
          setLoading(false);
          return;
        }
      }

      setCartId(storedCartId);
      await loadGuestCart(storedCartId);
      setLoading(false);
    };

    initCart();
  }, [authLoading, authToken]);

  /** Tạo cart mới cho khách vãng lai */
  const createGuestCart = async (): Promise<string | null> => {
    try {
      const data = await graphqlClient<{ createEmptyCart: string }>({
        query: CREATE_EMPTY_CART,
      });
      const newId = data.createEmptyCart;
      storage.setCartId(newId);
      return newId;
    } catch {
      return null;
    }
  };

  /** Load cart của khách hàng đã đăng nhập (không cần cart ID) */
  const loadCustomerCart = async (token: string): Promise<string | null> => {
    try {
      const data = await graphqlClient<{ customerCart: Cart }>({
        query: GET_CUSTOMER_CART,
        token,
        cache: 'no-store',
      });
      const customerCart = data.customerCart;
      setCart(customerCart);
      setCartId(customerCart.id);
      // Sync cart ID vào localStorage để dùng cho các mutation
      storage.setCartId(customerCart.id);
      return customerCart.id;
    } catch (error) {
      console.error('Failed to load customer cart:', error);
      // Lỗi xác thực token -> không xóa cart, chỉ để cart null
      return null;
    }
  };

  /** Load cart khách vãng lai theo cart ID */
  const loadGuestCart = async (id: string) => {
    try {
      const data = await graphqlClient<{ cart: Cart }>({
        query: GET_CART,
        variables: { cartId: id },
        cache: 'no-store',
      });
      setCart(data.cart);
    } catch (error) {
      if (isCartNotFoundError(error)) {
        // Cart thực sự không tồn tại trong Magento -> tạo cart mới
        console.warn('Guest cart expired, creating new cart');
        storage.removeCartId();
        setCartId(null);
        setCart(null);
        const newId = await createGuestCart();
        if (newId) setCartId(newId);
      } else {
        // Lỗi mạng hoặc thoáng qua (khi deploy, timeout...) -> KHÔNG xóa cart ID
        console.error('Failed to load cart (transient error, keeping cart ID):', error);
      }
    }
  };

  const refreshCart = async () => {
    if (authToken) {
      await loadCustomerCart(authToken);
    } else if (cartId) {
      await loadGuestCart(cartId);
    }
  };

  const addToCart = async (sku: string, quantity: number = 1) => {
    const authToken = storage.getAuthToken();
    let activeCartId = cart?.id || cartId || storage.getCartId();

    // For logged-in users, always prefer customerCart ID to avoid stale guest cart IDs.
    if (authToken) {
      const customerCartId = await loadCustomerCart(authToken);
      if (customerCartId) {
        activeCartId = customerCartId;
        setCartId(customerCartId);
      }
    }

    // Tự phục hồi cart ID nếu thiếu (giúp tránh lỗi khi init thất bại do mạng thoáng qua)
    if (!activeCartId) {
      if (authToken) {
        activeCartId = await loadCustomerCart(authToken);
      }

      if (!activeCartId && !authToken) {
        activeCartId = await createGuestCart();
      }

      if (!activeCartId) {
        throw new Error('Cart not initialized');
      }

      setCartId(activeCartId);
    }

    const executeAdd = async (targetCartId: string) => {
      const data = await graphqlClient<{
        addProductsToCart: {
          cart: Cart;
          user_errors: Array<{ message: string }>;
        };
      }>({
        query: ADD_TO_CART,
        variables: {
          cartId: targetCartId,
          cartItems: [{ sku, quantity }],
        },
        token: authToken || undefined,
      });

      if (data.addProductsToCart.user_errors?.length > 0) {
        throw new Error(data.addProductsToCart.user_errors[0].message);
      }
    };

    try {
      await executeAdd(activeCartId);

      await refreshCart();
    } catch (error) {
      if (authToken && isAuthTokenInvalidError(error)) {
        storage.removeAuthToken();
        storage.removeAuthUser();
        throw new Error('AUTH_REQUIRED');
      }

      if (authToken && (isCartNotFoundError(error) || isCartAccessDeniedError(error))) {
        const recoveredCustomerCartId = await loadCustomerCart(authToken);
        if (recoveredCustomerCartId) {
          setCartId(recoveredCustomerCartId);
          try {
            await executeAdd(recoveredCustomerCartId);
            await refreshCart();
            return;
          } catch (retryError) {
            console.error('Retry add to customer cart failed:', retryError);
            throw retryError;
          }
        }
      }

      // Guest cart có thể đã hết hạn ở Magento, thử tạo cart mới và add lại 1 lần
      if (!authToken && isCartNotFoundError(error)) {
        storage.removeCartId();
        setCartId(null);
        setCart(null);

        const recoveredCartId = await createGuestCart();
        if (!recoveredCartId) {
          console.error('Failed to re-create guest cart after expiration:', error);
          throw error;
        }

        setCartId(recoveredCartId);

        try {
          await executeAdd(recoveredCartId);
          await refreshCart();
          return;
        } catch (retryError) {
          console.error('Retry add to cart failed:', retryError);
          throw retryError;
        }
      }

      // Timeout/network glitches from GraphQL proxy happen intermittently during deploy or upstream spikes.
      // Retry one time with a freshly resolved cart to prevent user-facing add-to-cart failures.
      if (isTransientCartError(error)) {
        try {
          let recoveredCartId: string | null = null;

          if (authToken) {
            recoveredCartId = await loadCustomerCart(authToken);
          } else {
            recoveredCartId = storage.getCartId() || cart?.id || cartId;
            if (!recoveredCartId) {
              recoveredCartId = await createGuestCart();
            }
          }

          if (recoveredCartId) {
            setCartId(recoveredCartId);
            await executeAdd(recoveredCartId);
            await refreshCart();
            return;
          }
        } catch (retryError) {
          console.error('Retry add after transient error failed:', retryError);
          throw retryError;
        }
      }

      console.error('Failed to add to cart:', error);
      throw error;
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    let activeCartId = cart?.id || cartId || storage.getCartId();
    if (!activeCartId) return;

    const previousCartSnapshot = cart;
    const authToken = storage.getAuthToken();
    const parsedItemId = Number(cartItemId);
    const parsedQuantity = Math.max(1, Math.floor(quantity));

    if (!Number.isInteger(parsedItemId) || parsedItemId <= 0) {
      throw new Error('Invalid cart item id');
    }

    // Prevent duplicate/racing updates on the same item when user taps +/- quickly.
    if (updateLocksRef.current.has(parsedItemId)) {
      queuedQuantitiesRef.current.set(parsedItemId, parsedQuantity);
      setCart((prev) => (prev ? applyOptimisticQuantity(prev, parsedItemId, parsedQuantity) : prev));
      return;
    }
    updateLocksRef.current.add(parsedItemId);

    // Update UI immediately so +/- feels instant, then reconcile with server response.
    setCart((prev) => (prev ? applyOptimisticQuantity(prev, parsedItemId, parsedQuantity) : prev));

    const executeUpdate = async (targetCartId: string) => {
      await graphqlClient({
        query: UPDATE_CART_ITEMS,
        variables: {
          cartId: targetCartId,
          cartItems: [{ cart_item_id: parsedItemId, quantity: parsedQuantity }],
        },
        token: authToken || undefined,
      });
    };

    try {
      await executeUpdate(activeCartId);
      void refreshCart().catch((refreshError) => {
        console.error('Background cart refresh failed:', refreshError);
      });
    } catch (error) {
      if (authToken && isAuthTokenInvalidError(error)) {
        storage.removeAuthToken();
        storage.removeAuthUser();
        if (previousCartSnapshot) {
          setCart(previousCartSnapshot);
        }
        throw new Error('AUTH_REQUIRED');
      }

      if (authToken && (isCartNotFoundError(error) || isCartAccessDeniedError(error))) {
        const recoveredCustomerCartId = await loadCustomerCart(authToken);
        if (recoveredCustomerCartId) {
          activeCartId = recoveredCustomerCartId;
          setCartId(recoveredCustomerCartId);
          await executeUpdate(activeCartId);
          void refreshCart().catch((refreshError) => {
            console.error('Background cart refresh failed:', refreshError);
          });
          return;
        }
      }

      if (previousCartSnapshot) {
        setCart(previousCartSnapshot);
      }
      console.error('Failed to update quantity:', error);
      throw error;
    } finally {
      updateLocksRef.current.delete(parsedItemId);

      const queuedQuantity = queuedQuantitiesRef.current.get(parsedItemId);
      if (typeof queuedQuantity === 'number' && queuedQuantity !== parsedQuantity) {
        queuedQuantitiesRef.current.delete(parsedItemId);
        void updateQuantity(cartItemId, queuedQuantity);
        return;
      }

      queuedQuantitiesRef.current.delete(parsedItemId);
    }
  };

  const removeItem = async (cartItemId: string) => {
    let activeCartId = cart?.id || cartId || storage.getCartId();
    if (!activeCartId) return;

    const authToken = storage.getAuthToken();
    const parsedItemId = Number(cartItemId);

    if (!Number.isInteger(parsedItemId) || parsedItemId <= 0) {
      throw new Error('Invalid cart item id');
    }

    const executeRemove = async (targetCartId: string) => {
      await graphqlClient({
        query: REMOVE_ITEM_FROM_CART,
        variables: {
          cartId: targetCartId,
          cartItemId: parsedItemId,
        },
        token: authToken || undefined,
      });
    };

    try {
      await executeRemove(activeCartId);

      await refreshCart();
    } catch (error) {
      if (authToken && isAuthTokenInvalidError(error)) {
        storage.removeAuthToken();
        storage.removeAuthUser();
        throw new Error('AUTH_REQUIRED');
      }

      if (authToken && (isCartNotFoundError(error) || isCartAccessDeniedError(error))) {
        const recoveredCustomerCartId = await loadCustomerCart(authToken);
        if (recoveredCustomerCartId) {
          activeCartId = recoveredCustomerCartId;
          setCartId(recoveredCustomerCartId);
          await executeRemove(activeCartId);
          await refreshCart();
          return;
        }
      }

      console.error('Failed to remove item:', error);
      throw error;
    }
  };

  const itemCount = cart?.total_quantity || 0;

  const value: CartContextType = {
    cart,
    loading,
    addToCart,
    updateQuantity,
    removeItem,
    refreshCart,
    itemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
