'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Cart } from '@/types/cart';
import { storage } from '@/lib/utils/storage';
import { graphqlClient } from '@/lib/graphql/client';
import { useAuth } from '@/context/AuthContext';
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

function isCartNotFoundError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    msg.includes('no such entity') ||
    msg.includes('could not find a cart') ||
    msg.includes('cart_not_found') ||
    msg.includes('the cart isn') ||
    msg.includes("wasn't found")
  );
}

function isCartAccessDeniedError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    msg.includes('cannot perform operations on cart') ||
    msg.includes('current user cannot') ||
    msg.includes('not authorized') ||
    msg.includes('permission')
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

export function CartProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const updateLocksRef = useRef<Set<number>>(new Set());

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

  const loadCustomerCart = async (authToken: string): Promise<string | null> => {
    try {
      const data = await graphqlClient<{ customerCart: Cart }>({
        query: GET_CUSTOMER_CART,
        token: authToken,
        cache: 'no-store',
      });

      const customerCart = data.customerCart;
      if (!customerCart?.id) {
        return null;
      }

      setCart(customerCart);
      setCartId(customerCart.id);
      storage.setCartId(customerCart.id);
      return customerCart.id;
    } catch (error) {
      // Keep current cart state on transient errors.
      console.error('Failed to load customer cart:', error);
      return null;
    }
  };

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
        storage.removeCartId();
        setCartId(null);
        setCart(null);

        const newId = await createGuestCart();
        if (newId) {
          setCartId(newId);
          await loadGuestCart(newId);
        }
        return;
      }

      console.error('Failed to load guest cart (keeping current state):', error);
    }
  };

  // Sync cart source with auth state to avoid empty cart flash after login.
  useEffect(() => {
    let cancelled = false;

    const syncCartByAuth = async () => {
      if (authLoading) {
        return;
      }

      setLoading(true);

      if (isAuthenticated && token) {
        await loadCustomerCart(token);
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      let storedCartId = storage.getCartId();
      if (!storedCartId) {
        storedCartId = await createGuestCart();
      }

      if (cancelled) {
        return;
      }

      if (storedCartId) {
        setCartId(storedCartId);
        await loadGuestCart(storedCartId);
      } else {
        setCartId(null);
        setCart(null);
      }

      if (!cancelled) {
        setLoading(false);
      }
    };

    void syncCartByAuth();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, token]);

  const refreshCart = async () => {
    const activeToken = token || storage.getAuthToken();
    if (activeToken) {
      await loadCustomerCart(activeToken);
      return;
    }

    const activeGuestCartId = cartId || storage.getCartId();
    if (activeGuestCartId) {
      await loadGuestCart(activeGuestCartId);
    }
  };

  const addToCart = async (sku: string, quantity: number = 1) => {
    const activeToken = token || storage.getAuthToken();
    let activeCartId = cart?.id || cartId || storage.getCartId();

    if (!activeCartId) {
      if (activeToken) {
        activeCartId = await loadCustomerCart(activeToken);
      }

      if (!activeCartId && !activeToken) {
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
        token: activeToken || undefined,
      });

      if (data.addProductsToCart.user_errors?.length > 0) {
        throw new Error(data.addProductsToCart.user_errors[0].message);
      }
    };

    try {
      await executeAdd(activeCartId);
      await refreshCart();
    } catch (error) {
      if (activeToken && isAuthTokenInvalidError(error)) {
        storage.removeAuthToken();
        throw new Error('AUTH_REQUIRED');
      }

      if (activeToken && (isCartNotFoundError(error) || isCartAccessDeniedError(error))) {
        const recoveredCustomerCartId = await loadCustomerCart(activeToken);
        if (recoveredCustomerCartId) {
          setCartId(recoveredCustomerCartId);
          await executeAdd(recoveredCustomerCartId);
          await refreshCart();
          return;
        }
      }

      if (!activeToken && isCartNotFoundError(error)) {
        storage.removeCartId();
        setCartId(null);
        setCart(null);

        const recoveredCartId = await createGuestCart();
        if (recoveredCartId) {
          setCartId(recoveredCartId);
          await executeAdd(recoveredCartId);
          await refreshCart();
          return;
        }
      }

      console.error('Failed to add to cart:', error);
      throw error;
    }
  };

  const applyOptimisticQuantity = (sourceCart: Cart, parsedItemId: number, parsedQuantity: number): Cart => {
    let oldQuantity = 0;
    let unitPrice = 0;

    const items = sourceCart.items.map((item) => {
      if (Number(item.id) !== parsedItemId) {
        return item;
      }

      oldQuantity = item.quantity;
      unitPrice = item.product.price_range?.minimum_price?.regular_price?.value ?? item.prices.price.value;
      return {
        ...item,
        quantity: parsedQuantity,
        prices: {
          ...item.prices,
          row_total: {
            ...item.prices.row_total,
            value: unitPrice * parsedQuantity,
          },
        },
      };
    });

    const quantityDelta = parsedQuantity - oldQuantity;
    const rowDelta = unitPrice * quantityDelta;

    return {
      ...sourceCart,
      items,
      total_quantity: Math.max(0, sourceCart.total_quantity + quantityDelta),
      prices: {
        ...sourceCart.prices,
        grand_total: {
          ...sourceCart.prices.grand_total,
          value: sourceCart.prices.grand_total.value + rowDelta,
        },
        subtotal_excluding_tax: {
          ...sourceCart.prices.subtotal_excluding_tax,
          value: sourceCart.prices.subtotal_excluding_tax.value + rowDelta,
        },
      },
    };
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    let activeCartId = cart?.id || cartId || storage.getCartId();
    if (!activeCartId) return;

    const activeToken = token || storage.getAuthToken();
    const parsedItemId = Number(cartItemId);
    const parsedQuantity = Math.max(1, Math.floor(quantity));

    if (!Number.isInteger(parsedItemId) || parsedItemId <= 0) {
      throw new Error('Invalid cart item id');
    }

    if (updateLocksRef.current.has(parsedItemId)) {
      return;
    }
    updateLocksRef.current.add(parsedItemId);

    const previousCartSnapshot = cart;

    setCart((current) => {
      if (!current) {
        return current;
      }
      return applyOptimisticQuantity(current, parsedItemId, parsedQuantity);
    });

    const executeUpdate = async (targetCartId: string): Promise<Cart> => {
      const data = await graphqlClient<{ updateCartItems: { cart: Cart } }>({
        query: UPDATE_CART_ITEMS,
        variables: {
          cartId: targetCartId,
          cartItems: [{ cart_item_id: parsedItemId, quantity: parsedQuantity }],
        },
        token: activeToken || undefined,
      });
      return data.updateCartItems.cart;
    };

    try {
      const updatedCart = await executeUpdate(activeCartId);
      setCart(updatedCart);
      setCartId(updatedCart.id);
      storage.setCartId(updatedCart.id);
    } catch (error) {
      if (activeToken && isAuthTokenInvalidError(error)) {
        setCart(previousCartSnapshot);
        storage.removeAuthToken();
        throw new Error('AUTH_REQUIRED');
      }

      if (activeToken && (isCartNotFoundError(error) || isCartAccessDeniedError(error))) {
        const recoveredCustomerCartId = await loadCustomerCart(activeToken);
        if (recoveredCustomerCartId) {
          activeCartId = recoveredCustomerCartId;
          setCartId(recoveredCustomerCartId);
          const updatedCart = await executeUpdate(activeCartId);
          setCart(updatedCart);
          setCartId(updatedCart.id);
          storage.setCartId(updatedCart.id);
          return;
        }
      }

      setCart(previousCartSnapshot);
      console.error('Failed to update quantity:', error);
      throw error;
    } finally {
      updateLocksRef.current.delete(parsedItemId);
    }
  };

  const applyOptimisticRemove = (sourceCart: Cart, parsedItemId: number): Cart => {
    const target = sourceCart.items.find((item) => Number(item.id) === parsedItemId);
    if (!target) {
      return sourceCart;
    }

    const removedRowTotal = target.prices.row_total.value;
    const removedQuantity = target.quantity;

    return {
      ...sourceCart,
      items: sourceCart.items.filter((item) => Number(item.id) !== parsedItemId),
      total_quantity: Math.max(0, sourceCart.total_quantity - removedQuantity),
      prices: {
        ...sourceCart.prices,
        grand_total: {
          ...sourceCart.prices.grand_total,
          value: sourceCart.prices.grand_total.value - removedRowTotal,
        },
        subtotal_excluding_tax: {
          ...sourceCart.prices.subtotal_excluding_tax,
          value: sourceCart.prices.subtotal_excluding_tax.value - removedRowTotal,
        },
      },
    };
  };

  const removeItem = async (cartItemId: string) => {
    let activeCartId = cart?.id || cartId || storage.getCartId();
    if (!activeCartId) return;

    const activeToken = token || storage.getAuthToken();
    const parsedItemId = Number(cartItemId);

    if (!Number.isInteger(parsedItemId) || parsedItemId <= 0) {
      throw new Error('Invalid cart item id');
    }

    const previousCartSnapshot = cart;

    setCart((current) => {
      if (!current) {
        return current;
      }
      return applyOptimisticRemove(current, parsedItemId);
    });

    const executeRemove = async (targetCartId: string): Promise<Cart> => {
      const data = await graphqlClient<{ removeItemFromCart: { cart: Cart } }>({
        query: REMOVE_ITEM_FROM_CART,
        variables: {
          cartId: targetCartId,
          cartItemId: parsedItemId,
        },
        token: activeToken || undefined,
      });
      return data.removeItemFromCart.cart;
    };

    try {
      const updatedCart = await executeRemove(activeCartId);
      setCart(updatedCart);
      setCartId(updatedCart.id);
      storage.setCartId(updatedCart.id);
    } catch (error) {
      if (activeToken && isAuthTokenInvalidError(error)) {
        setCart(previousCartSnapshot);
        storage.removeAuthToken();
        throw new Error('AUTH_REQUIRED');
      }

      if (activeToken && (isCartNotFoundError(error) || isCartAccessDeniedError(error))) {
        const recoveredCustomerCartId = await loadCustomerCart(activeToken);
        if (recoveredCustomerCartId) {
          activeCartId = recoveredCustomerCartId;
          setCartId(recoveredCustomerCartId);
          const updatedCart = await executeRemove(activeCartId);
          setCart(updatedCart);
          setCartId(updatedCart.id);
          storage.setCartId(updatedCart.id);
          return;
        }
      }

      setCart(previousCartSnapshot);
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
