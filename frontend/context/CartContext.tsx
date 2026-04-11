'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Cart, CartItem } from '@/types/cart';
import { storage } from '@/lib/utils/storage';
import { graphqlClient } from '@/lib/graphql/client';
import {
  CREATE_EMPTY_CART,
  GET_CART,
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

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize cart on mount
  useEffect(() => {
    const initCart = async () => {
      // Skip cart initialization if no backend
      if (!process.env.NEXT_PUBLIC_MAGENTO_GRAPHQL_URL?.includes('localhost')) {
        setLoading(false);
        return;
      }

      let storedCartId = storage.getCartId();

      if (!storedCartId) {
        // Create new cart
        try {
          const data = await graphqlClient<{ createEmptyCart: string }>({
            query: CREATE_EMPTY_CART,
          });
          storedCartId = data.createEmptyCart;
          storage.setCartId(storedCartId);
        } catch (error) {
          console.error('Failed to create cart:', error);
          setLoading(false);
          return;
        }
      }

      setCartId(storedCartId);
      await loadCart(storedCartId);
      setLoading(false);
    };

    // For demo mode without backend
    if (process.env.NEXT_PUBLIC_MAGENTO_GRAPHQL_URL === 'http://localhost/graphql') {
      console.log('Demo mode: No Magento backend connected');
      setLoading(false);
      return;
    }

    initCart();
  }, []);

  const loadCart = async (id: string) => {
    try {
      const data = await graphqlClient<{ cart: Cart }>({
        query: GET_CART,
        variables: { cartId: id },
        cache: 'no-store',
      });
      setCart(data.cart);
    } catch (error) {
      console.error('Failed to load cart:', error);
      // Cart might be expired, create new one
      storage.removeCartId();
      setCartId(null);
      setCart(null);
    }
  };

  const refreshCart = async () => {
    if (cartId) {
      await loadCart(cartId);
    }
  };

  const addToCart = async (sku: string, quantity: number = 1) => {
    if (!cartId) {
      throw new Error('Cart not initialized');
    }

    try {
      const data = await graphqlClient<{
        addProductsToCart: {
          cart: Cart;
          user_errors: Array<{ message: string }>;
        };
      }>({
        query: ADD_TO_CART,
        variables: {
          cartId,
          cartItems: [{ sku, quantity }],
        },
      });

      if (data.addProductsToCart.user_errors?.length > 0) {
        throw new Error(data.addProductsToCart.user_errors[0].message);
      }

      await refreshCart();
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (!cartId) return;

    try {
      await graphqlClient({
        query: UPDATE_CART_ITEMS,
        variables: {
          cartId,
          cartItems: [{ cart_item_id: cartItemId, quantity }],
        },
      });

      await refreshCart();
    } catch (error) {
      console.error('Failed to update quantity:', error);
      throw error;
    }
  };

  const removeItem = async (cartItemId: string) => {
    if (!cartId) return;

    try {
      await graphqlClient({
        query: REMOVE_ITEM_FROM_CART,
        variables: {
          cartId,
          cartItemId: parseInt(cartItemId),
        },
      });

      await refreshCart();
    } catch (error) {
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
