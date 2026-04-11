// User & Authentication Types
export interface User {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
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
}
