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

  const formatGraphqlError = (error: unknown): string => {
    if (!(error instanceof Error)) {
      return 'Unexpected error. Please try again.';
    }

    const message = error.message.toLowerCase();

    if (message.includes('graphql error occurred')) {
      return 'Request failed. Please try again.';
    }
    if (message.includes('invalid login or password')) {
      return 'Invalid email or password.';
    }
    if (message.includes('already exists')) {
      return 'An account with this email already exists.';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Cannot connect to Magento. Check backend and try again.';
    }
    if (message.includes('http error 5')) {
      return 'Magento service is unavailable. Please try again later.';
    }

    return error.message;
  };

  const loadCustomer = async (customerToken: string): Promise<User> => {
    const data = await graphqlClient<{ customer: User }>({
      query: GET_CUSTOMER,
      token: customerToken,
    });

    return data.customer;
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      const storedToken = storage.getAuthToken();

      if (!storedToken) {
        setLoading(false);
        return;
      }

      setToken(storedToken);
      try {
        const customer = await loadCustomer(storedToken);
        setUser(customer);
      } catch {
        storage.removeAuthToken();
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const data = await graphqlClient<{ generateCustomerToken: { token: string } }>({
        query: GENERATE_CUSTOMER_TOKEN,
        variables: {
          email: credentials.email.trim(),
          password: credentials.password,
        },
      });

      const newToken = data.generateCustomerToken.token;
      if (!newToken) {
        throw new Error('Login failed. Missing customer token.');
      }

      setToken(newToken);
      storage.setAuthToken(newToken);

      const customer = await loadCustomer(newToken);
      setUser(customer);
    } catch (error) {
      throw new Error(formatGraphqlError(error));
    }
  };

  const register = async (input: RegisterInput) => {
    try {
      await graphqlClient<{ createCustomerV2: { customer: User } }>({
        query: CREATE_CUSTOMER,
        variables: {
          input: {
            firstname: input.firstname.trim(),
            lastname: input.lastname.trim(),
            email: input.email.trim(),
            password: input.password,
          },
        },
      });

      await login({ email: input.email, password: input.password });
    } catch (error) {
      throw new Error(formatGraphqlError(error));
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
    isAuthenticated: Boolean(user && token),
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
