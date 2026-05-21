// Cart Types
export interface CartCustomizableOptionValue {
  value: string;
  label?: string;
  customizable_option_value_uid?: string;
}

export interface CartCustomizableOption {
  label: string;
  customizable_option_uid?: string;
  values: CartCustomizableOptionValue[];
}

export interface CartItem {
  id: string;
  uid?: string;
  product: {
    sku: string;
    name: string;
    price_range?: {
      minimum_price?: {
        regular_price?: {
          value: number;
          currency: string;
        };
      };
    };
    thumbnail: {
      url: string;
      label: string;
    };
  };
  quantity: number;
  prices: {
    price: {
      value: number;
      currency: string;
    };
    row_total: {
      value: number;
      currency: string;
    };
  };
  customizable_options?: CartCustomizableOption[];
}

export interface Cart {
  id: string;
  email?: string;
  items: CartItem[];
  prices: {
    grand_total: {
      value: number;
      currency: string;
    };
    subtotal_excluding_tax: {
      value: number;
      currency: string;
    };
  };
  total_quantity: number;
}

export interface AddToCartInput {
  cartId: string;
  sku: string;
  quantity: number;
  selectedOptions?: string[];
}

export interface UpdateCartItemInput {
  cartId: string;
  cartItemId: string;
  quantity: number;
}

export interface RemoveItemInput {
  cartId: string;
  cartItemId: string;
}
