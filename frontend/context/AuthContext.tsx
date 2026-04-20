'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, RegisterInput } from '@/types/user';
import { storage } from '@/lib/utils/storage';
import { graphqlClient } from '@/lib/graphql/client';
import { GENERATE_CUSTOMER_TOKEN, GET_CUSTOMER, CREATE_CUSTOMER } from '@/lib/graphql/queries/auth';
import { CREATE_EMPTY_CART, GET_CUSTOMER_CART, MERGE_CARTS } from '@/lib/graphql/queries/cart';

function setAuthCookie(token: string | null) {
  if (typeof document !== 'undefined') {
    const maxAge = token ? 60 * 60 * 24 * 7 : 0; // 7 days or 0 (delete)
    document.cookie = `auth_token=${token || ''}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
}

function isAuthTokenInvalidError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('401') ||
    message.includes('unauthorized') ||
    message.includes("current customer isn't authorized") ||
    message.includes('customer token')
  );
}

async function getOrCreateCustomerCartId(token: string): Promise<string | null> {
  try {
    const data = await graphqlClient<{ customerCart: { id: string } }>({
      query: GET_CUSTOMER_CART,
      token,
      cache: 'no-store',
    });

    if (data.customerCart?.id) {
      return data.customerCart.id;
    }
  } catch {
    // Fall through to create cart.
  }

  try {
    const newCart = await graphqlClient<{ createEmptyCart: string }>({
      query: CREATE_EMPTY_CART,
      token,
    });
    return newCart.createEmptyCart;
  } catch {
    return null;
  }
}

// Helper function to merge guest cart with customer cart without replacing existing customer cart
async function mergeGuestCartToCustomer(token: string): Promise<string | null> {
  const guestCartId = storage.getCartId();
  const customerCartId = await getOrCreateCustomerCartId(token);

  if (!customerCartId) {
    return null;
  }

  if (!guestCartId || guestCartId === customerCartId) {
    storage.setCartId(customerCartId);
    return customerCartId;
  }

  try {
    await graphqlClient({
      query: MERGE_CARTS,
      variables: {
        sourceCartId: guestCartId,
        destinationCartId: customerCartId,
      },
      token,
    });
  } catch (error) {
    // Keep customer cart as source of truth even if guest merge fails.
    console.error('Failed to merge guest cart into customer cart:', error);
  }

  storage.setCartId(customerCartId);
  return customerCartId;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load token and user on mount
  useEffect(() => {
    const loadUser = async () => {
      // Skip auth if no backend
      if (process.env.NEXT_PUBLIC_MAGENTO_GRAPHQL_URL === 'http://localhost/graphql') {
        console.log('Demo mode: No authentication backend');
        setLoading(false);
        return;
      }

      const storedToken = storage.getAuthToken();
      if (storedToken) {
        setToken(storedToken);
        setAuthCookie(storedToken);
        try {
          const data = await graphqlClient<{ customer: User }>({
            query: GET_CUSTOMER,
            token: storedToken,
          });
          setUser(data.customer);
        } catch (error) {
          console.error('Failed to load user:', error);
          if (isAuthTokenInvalidError(error)) {
            storage.removeAuthToken();
            setAuthCookie(null);
            setToken(null);
          }
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const data = await graphqlClient<{ generateCustomerToken: { token: string } }>({
        query: GENERATE_CUSTOMER_TOKEN,
        variables: credentials,
      });

      const newToken = data.generateCustomerToken.token;
      setToken(newToken);
      storage.setAuthToken(newToken);
      setAuthCookie(newToken);

      // Fetch user data
      const userData = await graphqlClient<{ customer: User }>({
        query: GET_CUSTOMER,
        token: newToken,
      });
      setUser(userData.customer);

      // Merge guest cart to customer cart after successful login
      await mergeGuestCartToCustomer(newToken);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (input: RegisterInput) => {
    try {
      await graphqlClient<{ createCustomerV2: { customer: User } }>({
        query: CREATE_CUSTOMER,
        variables: { input },
      });

      // Auto-login after registration
      await login({ email: input.email, password: input.password });
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    storage.removeAuthToken();
    setAuthCookie(null);
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
