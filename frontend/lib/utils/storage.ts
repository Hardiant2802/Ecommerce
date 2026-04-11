// Storage utilities for browser localStorage

const CART_ID_KEY = 'magento_cart_id';
const AUTH_TOKEN_KEY = 'magento_auth_token';

export const storage = {
  // Cart ID
  getCartId: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(CART_ID_KEY);
  },

  setCartId: (cartId: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CART_ID_KEY, cartId);
  },

  removeCartId: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CART_ID_KEY);
  },

  // Auth Token
  getAuthToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  setAuthToken: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  removeAuthToken: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },

  // Clear all
  clearAll: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CART_ID_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },
};
