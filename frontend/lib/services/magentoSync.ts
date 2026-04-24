import { InternalOrder } from '@/types/order';

interface GraphqlResult<T> {
  data?: T;
  errors?: Array<{ message?: string }>;
}

interface MagentoSyncResult {
  success: boolean;
  quoteId?: string;
  orderNumber?: string;
  error?: string;
}

function resolveFallbackSku(): string {
  return (process.env.MAGENTO_SYNC_FALLBACK_SKU || '').trim();
}

function isMissingSkuMessage(message: string): boolean {
  const normalized = (message || '').toLowerCase();
  return normalized.includes('could not find a product with sku') || normalized.includes('no such entity with sku');
}

const DEFAULT_MAGENTO_GRAPHQL_URL = 'https://www.ahphonestore.id.vn/graphql';

const CREATE_EMPTY_CART_MUTATION = `
  mutation CreateEmptyCart {
    createEmptyCart
  }
`;

const ADD_PRODUCTS_TO_CART_MUTATION = `
  mutation AddProductsToCart($cartId: String!, $cartItems: [CartItemInput!]!) {
    addProductsToCart(cartId: $cartId, cartItems: $cartItems) {
      cart {
        id
      }
      user_errors {
        message
      }
    }
  }
`;

const SET_GUEST_EMAIL_ON_CART_MUTATION = `
  mutation SetGuestEmailOnCart($cartId: String!, $email: String!) {
    setGuestEmailOnCart(input: { cart_id: $cartId, email: $email }) {
      cart {
        id
        email
      }
    }
  }
`;

const SET_SHIPPING_ADDRESSES_ON_CART_MUTATION = `
  mutation SetShippingAddressesOnCart($cartId: String!, $shippingAddresses: [ShippingAddressInput!]!) {
    setShippingAddressesOnCart(
      input: {
        cart_id: $cartId
        shipping_addresses: $shippingAddresses
      }
    ) {
      cart {
        id
      }
    }
  }
`;

const SET_BILLING_ADDRESS_ON_CART_MUTATION = `
  mutation SetBillingAddressOnCart($cartId: String!, $billingAddress: BillingAddressInput!) {
    setBillingAddressOnCart(
      input: {
        cart_id: $cartId
        billing_address: $billingAddress
      }
    ) {
      cart {
        id
      }
    }
  }
`;

const SET_SHIPPING_METHODS_ON_CART_MUTATION = `
  mutation SetShippingMethodsOnCart($cartId: String!, $shippingMethods: [ShippingMethodInput!]!) {
    setShippingMethodsOnCart(
      input: {
        cart_id: $cartId
        shipping_methods: $shippingMethods
      }
    ) {
      cart {
        id
      }
    }
  }
`;

const SET_PAYMENT_METHOD_ON_CART_MUTATION = `
  mutation SetPaymentMethodOnCart($cartId: String!, $code: String!) {
    setPaymentMethodOnCart(
      input: {
        cart_id: $cartId
        payment_method: {
          code: $code
        }
      }
    ) {
      cart {
        id
      }
    }
  }
`;

const PLACE_ORDER_MUTATION = `
  mutation PlaceOrder($cartId: String!) {
    placeOrder(input: { cart_id: $cartId }) {
      order {
        order_number
      }
      orderV2: order {
        order_number
      }
    }
  }
`;

function resolveMagentoGraphqlUrl(): string {
  const fromEnv =
    process.env.MAGENTO_GRAPHQL_UPSTREAM_URL ||
    process.env.NEXT_PUBLIC_MAGENTO_GRAPHQL_URL ||
    DEFAULT_MAGENTO_GRAPHQL_URL;

  const trimmed = (fromEnv || '').trim();
  if (!trimmed) {
    return DEFAULT_MAGENTO_GRAPHQL_URL;
  }

  if (trimmed.includes('localhost')) {
    return DEFAULT_MAGENTO_GRAPHQL_URL;
  }

  return trimmed;
}

async function magentoGraphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const endpoint = resolveMagentoGraphqlUrl();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Store: process.env.NEXT_PUBLIC_MAGENTO_STORE_CODE || 'default',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Magento HTTP ${response.status}: ${body}`);
  }

  const payload = (await response.json()) as GraphqlResult<T>;
  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors.map((item) => item.message || 'Unknown GraphQL error').join('; '));
  }

  if (!payload.data) {
    throw new Error('Magento GraphQL returned empty data');
  }

  return payload.data;
}

function resolveCustomerInfo(order: InternalOrder) {
  const fullName = (process.env.MAGENTO_SYNC_FULLNAME || 'Anh Huy').trim();
  const split = fullName.split(/\s+/).filter(Boolean);
  const fallbackFirst = split[0] || 'Anh';
  const fallbackLast = split.slice(1).join(' ') || 'Huy';

  return {
    email: order.customerEmail || process.env.MAGENTO_SYNC_EMAIL_FALLBACK || 'guest@ahphonestore.id.vn',
    firstname: process.env.MAGENTO_SYNC_FIRSTNAME || fallbackFirst,
    lastname: process.env.MAGENTO_SYNC_LASTNAME || fallbackLast,
    telephone: process.env.MAGENTO_SYNC_TELEPHONE || '0900000000',
  };
}

function resolveAddress() {
  return {
    street: [process.env.MAGENTO_SYNC_STREET || 'Ha Noi'],
    city: process.env.MAGENTO_SYNC_CITY || 'Ha Noi',
    region: process.env.MAGENTO_SYNC_REGION || 'Ha Noi',
    postcode: process.env.MAGENTO_SYNC_POSTCODE || '100000',
    country_code: process.env.MAGENTO_SYNC_COUNTRY || 'VN',
  };
}

function resolveShippingMethod() {
  return {
    carrier_code: process.env.MAGENTO_SYNC_SHIPPING_CARRIER || 'flatrate',
    method_code: process.env.MAGENTO_SYNC_SHIPPING_METHOD || 'flatrate',
  };
}

function resolvePaymentMethodCode(): string {
  return process.env.MAGENTO_SYNC_PAYMENT_CODE || 'checkmo';
}

export async function syncInternalOrderToMagento(order: InternalOrder): Promise<MagentoSyncResult> {
  try {
    const createCartData = await magentoGraphql<{ createEmptyCart: string }>(CREATE_EMPTY_CART_MUTATION);
    const cartId = createCartData.createEmptyCart;

    const cartItems = order.items.map((item) => ({
      sku: item.sku,
      quantity: item.quantity,
    }));

    let addProductsData = await magentoGraphql<{
      addProductsToCart: {
        user_errors: Array<{ message: string }>;
      };
    }>(ADD_PRODUCTS_TO_CART_MUTATION, {
      cartId,
      cartItems,
    });

    if (addProductsData.addProductsToCart.user_errors.length > 0) {
      const firstError = addProductsData.addProductsToCart.user_errors[0].message || 'Cannot add products to cart';
      const fallbackSku = resolveFallbackSku();

      if (fallbackSku && isMissingSkuMessage(firstError)) {
        const totalQuantity = Math.max(
          1,
          order.items.reduce((sum, item) => sum + Math.max(1, Math.floor(item.quantity || 0)), 0)
        );

        addProductsData = await magentoGraphql<{
          addProductsToCart: {
            user_errors: Array<{ message: string }>;
          };
        }>(ADD_PRODUCTS_TO_CART_MUTATION, {
          cartId,
          cartItems: [
            {
              sku: fallbackSku,
              quantity: totalQuantity,
            },
          ],
        });

        if (addProductsData.addProductsToCart.user_errors.length > 0) {
          throw new Error(addProductsData.addProductsToCart.user_errors[0].message || 'Cannot add fallback product to cart');
        }
      } else {
        throw new Error(firstError);
      }
    }

    const customer = resolveCustomerInfo(order);
    const address = resolveAddress();

    await magentoGraphql(SET_GUEST_EMAIL_ON_CART_MUTATION, {
      cartId,
      email: customer.email,
    });

    await magentoGraphql(SET_SHIPPING_ADDRESSES_ON_CART_MUTATION, {
      cartId,
      shippingAddresses: [
        {
          address: {
            firstname: customer.firstname,
            lastname: customer.lastname,
            street: address.street,
            city: address.city,
            region: address.region,
            postcode: address.postcode,
            country_code: address.country_code,
            telephone: customer.telephone,
          },
        },
      ],
    });

    await magentoGraphql(SET_BILLING_ADDRESS_ON_CART_MUTATION, {
      cartId,
      billingAddress: {
        same_as_shipping: true,
      },
    });

    await magentoGraphql(SET_SHIPPING_METHODS_ON_CART_MUTATION, {
      cartId,
      shippingMethods: [resolveShippingMethod()],
    });

    await magentoGraphql(SET_PAYMENT_METHOD_ON_CART_MUTATION, {
      cartId,
      code: resolvePaymentMethodCode(),
    });

    const placeOrderData = await magentoGraphql<{
      placeOrder: {
        order?: { order_number?: string };
        order_number?: string;
      };
    }>(PLACE_ORDER_MUTATION, { cartId });

    const orderNumber =
      placeOrderData.placeOrder.order?.order_number ||
      placeOrderData.placeOrder.order_number ||
      '';

    if (!orderNumber) {
      throw new Error('Magento did not return order number');
    }

    return {
      success: true,
      quoteId: cartId,
      orderNumber,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Magento sync error',
    };
  }
}
