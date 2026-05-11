import { InternalOrder } from '@/types/order';

interface GraphqlResult<T> {
  data?: T;
  errors?: Array<{ message?: string }>;
}

interface MagentoSyncResult {
  success: boolean;
  quoteId?: string;
  orderNumber?: string;
  invoiceId?: string;
  invoiceStatus?: 'created' | 'exists';
  error?: string;
}

interface MagentoRestSearchResult<T> {
  items?: T[];
  total_count?: number;
}

interface MagentoRestOrder {
  entity_id?: number;
  increment_id?: string;
  state?: string;
  status?: string;
  total_due?: number;
}

interface MagentoRestInvoice {
  entity_id?: number;
  order_id?: number;
}

function resolveFallbackSku(): string {
  return (process.env.MAGENTO_SYNC_FALLBACK_SKU || '').trim();
}

function isMissingSkuMessage(message: string): boolean {
  const normalized = (message || '').toLowerCase();
  return normalized.includes('could not find a product with sku') || normalized.includes('no such entity with sku');
}

const DEFAULT_MAGENTO_GRAPHQL_URL = 'https://www.ahphonestore.id.vn/graphql';
const DEFAULT_MAGENTO_API_URL = 'https://www.ahphonestore.id.vn';

let cachedAdminToken: string | null = null;

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

function resolveMagentoApiBaseUrl(): string {
  const fromEnv =
    process.env.MAGENTO_API_UPSTREAM_URL ||
    process.env.MAGENTO_REST_UPSTREAM_URL ||
    process.env.NEXT_PUBLIC_MAGENTO_API_URL ||
    DEFAULT_MAGENTO_API_URL;

  const trimmed = (fromEnv || '').trim();
  if (!trimmed) {
    return DEFAULT_MAGENTO_API_URL;
  }

  if (trimmed.includes('localhost')) {
    return DEFAULT_MAGENTO_API_URL;
  }

  return trimmed.replace(/\/+$/, '');
}

function normalizeToken(raw?: string | null): string {
  return String(raw || '').trim();
}

function resolveStaticAdminToken(): string {
  return (
    process.env.MAGENTO_SYNC_ADMIN_TOKEN ||
    process.env.MAGENTO_ADMIN_TOKEN ||
    ''
  ).trim();
}

function resolveAdminCredentials(): { username: string; password: string } {
  const username = (
    process.env.MAGENTO_SYNC_ADMIN_USERNAME ||
    process.env.MAGENTO_SYNC_ADMIN_USER ||
    process.env.MAGENTO_ADMIN_USERNAME ||
    ''
  ).trim();

  const password = (
    process.env.MAGENTO_SYNC_ADMIN_PASSWORD ||
    process.env.MAGENTO_ADMIN_PASSWORD ||
    ''
  ).trim();

  return { username, password };
}

function canRefreshAdminToken(): boolean {
  const creds = resolveAdminCredentials();
  return Boolean(creds.username && creds.password);
}

async function createAdminTokenFromCredentials(): Promise<string> {
  const creds = resolveAdminCredentials();
  if (!creds.username || !creds.password) {
    throw new Error('MAGENTO_ADMIN_AUTH_NOT_CONFIGURED');
  }

  const endpoint = `${resolveMagentoApiBaseUrl()}/rest/V1/integration/admin/token`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: creds.username,
      password: creds.password,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Failed to create Magento admin token: HTTP ${response.status} ${body}`);
  }

  const payload = (await response.json()) as string;
  const token = normalizeToken(payload);
  if (!token) {
    throw new Error('Magento admin token response is empty');
  }

  cachedAdminToken = token;
  return token;
}

async function getMagentoAdminToken(forceRefresh = false): Promise<string> {
  const staticToken = resolveStaticAdminToken();
  if (staticToken && !forceRefresh) {
    return staticToken;
  }

  if (!forceRefresh && cachedAdminToken) {
    return cachedAdminToken;
  }

  if (canRefreshAdminToken()) {
    return createAdminTokenFromCredentials();
  }

  if (staticToken) {
    return staticToken;
  }

  throw new Error('Magento admin auth is not configured. Set MAGENTO_ADMIN_TOKEN or MAGENTO_ADMIN_USERNAME/MAGENTO_ADMIN_PASSWORD.');
}

async function magentoAdminRest<T>(path: string, init: RequestInit = {}, canRetry = true): Promise<T> {
  const token = await getMagentoAdminToken(false);
  const endpoint = `${resolveMagentoApiBaseUrl()}${path}`;

  const response = await fetch(endpoint, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if ((response.status === 401 || response.status === 403) && canRetry && canRefreshAdminToken()) {
    await getMagentoAdminToken(true);
    return magentoAdminRest<T>(path, init, false);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Magento REST ${response.status}: ${body}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function findMagentoOrderByIncrementId(orderNumber: string): Promise<MagentoRestOrder | null> {
  const params = new URLSearchParams();
  params.set('searchCriteria[pageSize]', '1');
  params.set('searchCriteria[currentPage]', '1');
  params.set('searchCriteria[filterGroups][0][filters][0][field]', 'increment_id');
  params.set('searchCriteria[filterGroups][0][filters][0][value]', orderNumber);
  params.set('searchCriteria[filterGroups][0][filters][0][condition_type]', 'eq');

  const result = await magentoAdminRest<MagentoRestSearchResult<MagentoRestOrder>>(
    `/rest/V1/orders?${params.toString()}`,
    { method: 'GET' }
  );

  const first = (result.items || [])[0];
  return first || null;
}

async function listInvoicesByOrderId(orderId: number): Promise<MagentoRestInvoice[]> {
  const params = new URLSearchParams();
  params.set('searchCriteria[pageSize]', '5');
  params.set('searchCriteria[currentPage]', '1');
  params.set('searchCriteria[filterGroups][0][filters][0][field]', 'order_id');
  params.set('searchCriteria[filterGroups][0][filters][0][value]', String(orderId));
  params.set('searchCriteria[filterGroups][0][filters][0][condition_type]', 'eq');

  const result = await magentoAdminRest<MagentoRestSearchResult<MagentoRestInvoice>>(
    `/rest/V1/invoices?${params.toString()}`,
    { method: 'GET' }
  );

  return result.items || [];
}

async function ensureMagentoOrderInvoiced(orderNumber: string): Promise<{ invoiceId?: string; created: boolean }> {
  const magentoOrder = await findMagentoOrderByIncrementId(orderNumber);
  if (!magentoOrder?.entity_id) {
    throw new Error(`Magento order not found for increment_id ${orderNumber}`);
  }

  const existingInvoices = await listInvoicesByOrderId(magentoOrder.entity_id);
  if (existingInvoices.length > 0) {
    return {
      invoiceId: existingInvoices[0]?.entity_id ? String(existingInvoices[0].entity_id) : undefined,
      created: false,
    };
  }

  const invoicePayload = {
    capture: true,
    notify: false,
    appendComment: false,
    comment: {
      comment: 'Auto invoice after payment confirmation',
      is_visible_on_front: 0,
    },
  };

  try {
    const invoiceIdRaw = await magentoAdminRest<string | number>(
      `/rest/V1/order/${magentoOrder.entity_id}/invoice`,
      {
        method: 'POST',
        body: JSON.stringify(invoicePayload),
      }
    );

    const invoiceId = String(invoiceIdRaw || '').trim();
    return {
      invoiceId: invoiceId || undefined,
      created: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '');
    const normalized = message.toLowerCase();

    if (normalized.includes('does not allow an invoice to be created')) {
      const retryInvoices = await listInvoicesByOrderId(magentoOrder.entity_id);
      if (retryInvoices.length > 0) {
        return {
          invoiceId: retryInvoices[0]?.entity_id ? String(retryInvoices[0].entity_id) : undefined,
          created: false,
        };
      }

      const totalDue = Number(magentoOrder.total_due || 0);
      if (Number.isFinite(totalDue) && totalDue <= 0) {
        return {
          created: false,
        };
      }
    }

    throw error;
  }
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
    if (order.magentoOrderNumber) {
      const invoiceResult = await ensureMagentoOrderInvoiced(order.magentoOrderNumber);
      return {
        success: true,
        orderNumber: order.magentoOrderNumber,
        invoiceId: invoiceResult.invoiceId,
        invoiceStatus: invoiceResult.created ? 'created' : 'exists',
      };
    }

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

    const invoiceResult = await ensureMagentoOrderInvoiced(orderNumber);

    return {
      success: true,
      quoteId: cartId,
      orderNumber,
      invoiceId: invoiceResult.invoiceId,
      invoiceStatus: invoiceResult.created ? 'created' : 'exists',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Magento sync error',
    };
  }
}
