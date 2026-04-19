'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, RegisterInput } from '@/types/user';
import { storage } from '@/lib/utils/storage';
import { graphqlClient } from '@/lib/graphql/client';
import { GENERATE_CUSTOMER_TOKEN, GET_CUSTOMER, CREATE_CUSTOMER } from '@/lib/graphql/queries/auth';
import { CREATE_EMPTY_CART, MERGE_CARTS } from '@/lib/graphql/queries/cart';

function setAuthCookie(token: string | null) {
  if (typeof document !== 'undefined') {
    const maxAge = token ? 60 * 60 * 24 * 7 : 0; // 7 days or 0 (delete)
    document.cookie = `auth_token=${token || ''}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
}

// Helper function to merge guest cart with customer cart
async function mergeGuestCartToCustomer(token: string): Promise<string | null> {
  const guestCartId = storage.getCartId();

  if (!guestCartId) {
    return null;
  }

  try {
    // Create a new cart for the logged-in customer
    const newCart = await graphqlClient<{ createEmptyCart: string }>({
      query: CREATE_EMPTY_CART,
      token: token,
    });

    const customerCartId = newCart.createEmptyCart;

    // Merge guest cart into customer cart
    await graphqlClient({
      query: MERGE_CARTS,
      variables: {
        sourceCartId: guestCartId,
        destinationCartId: customerCartId,
      },
      token: token,
    });

    // Update localStorage with new cart ID
    storage.setCartId(customerCartId);

    return customerCartId;
  } catch (error) {
    console.error('Failed to merge cart:', error);
    return null;
  }
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
          storage.removeAuthToken();
          setToken(null);
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
    isAuthenticated: !!user && !!token,
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
