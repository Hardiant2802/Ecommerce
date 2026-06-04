// User & Authentication Types
export interface CustomerOrderItem {
  product_name: string;
  product_sku: string;
  quantity_ordered: number;
  product_sale_price: { value: number; currency: string };
}

export interface CustomerOrder {
  id: string;
  number: string;
  order_date: string;
  status: string;
  total: {
    grand_total: { value: number; currency: string };
  };
  items: CustomerOrderItem[];
}

export interface User {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  date_of_birth?: string | null;
  gender?: number | null;
  is_subscribed?: boolean;
  created_at?: string | null;
  orders?: {
    items: CustomerOrder[];
  };
}

export interface AuthResponse {
  generateCustomerToken: {
    token: string;
  };
}

export interface CustomerResponse {
  customer: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterInput {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  otpVerificationToken: string;
}
