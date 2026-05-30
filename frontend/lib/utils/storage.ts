// Storage utilities for browser localStorage

const CART_ID_KEY = 'magento_cart_id';
const AUTH_TOKEN_KEY = 'magento_auth_token';
const AUTH_USER_KEY = 'magento_auth_user';

function getLocalStorageSafe(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const storage = {
  // Cart ID
  getCartId: (): string | null => {
    const local = getLocalStorageSafe();
    if (!local) return null;
    return local.getItem(CART_ID_KEY);
  },

  setCartId: (cartId: string): void => {
    const local = getLocalStorageSafe();
    if (!local) return;
    local.setItem(CART_ID_KEY, cartId);
  },

  removeCartId: (): void => {
    const local = getLocalStorageSafe();
    if (!local) return;
    local.removeItem(CART_ID_KEY);
  },

  // Auth Token
  getAuthToken: (): string | null => {
    const local = getLocalStorageSafe();
    if (!local) return null;
    return local.getItem(AUTH_TOKEN_KEY);
  },

  setAuthToken: (token: string): void => {
    const local = getLocalStorageSafe();
    if (!local) return;
    local.setItem(AUTH_TOKEN_KEY, token);
  },

  removeAuthToken: (): void => {
    const local = getLocalStorageSafe();
    if (!local) return;
    local.removeItem(AUTH_TOKEN_KEY);
  },

  // Auth User Snapshot
  getAuthUser: <T = unknown>(): T | null => {
    const local = getLocalStorageSafe();
    if (!local) return null;

    const raw = local.getItem(AUTH_USER_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  setAuthUser: (user: unknown): void => {
    const local = getLocalStorageSafe();
    if (!local) return;

    try {
      local.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } catch {
      // Ignore quota/security errors.
    }
  },

  removeAuthUser: (): void => {
    const local = getLocalStorageSafe();
    if (!local) return;
    local.removeItem(AUTH_USER_KEY);
  },

  // Clear all
  clearAll: (): void => {
    const local = getLocalStorageSafe();
    if (!local) return;
    local.removeItem(CART_ID_KEY);
    local.removeItem(AUTH_TOKEN_KEY);
    local.removeItem(AUTH_USER_KEY);
  },
};
