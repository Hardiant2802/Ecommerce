// Cart Types
export interface CartItem {
  id: string;
  product: {
    sku: string;
    name: string;
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
