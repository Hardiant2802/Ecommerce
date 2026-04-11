'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, RegisterInput } from '@/types/user';
import { storage } from '@/lib/utils/storage';
import { graphqlClient } from '@/lib/graphql/client';
import { GENERATE_CUSTOMER_TOKEN, GET_CUSTOMER, CREATE_CUSTOMER } from '@/lib/graphql/queries/auth';

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

      // Fetch user data
      const userData = await graphqlClient<{ customer: User }>({
        query: GET_CUSTOMER,
        token: newToken,
      });
      setUser(userData.customer);
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
