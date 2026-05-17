'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart, useAuth } from '@/lib/hooks';
import { formatPrice } from '@/lib/utils/formatters';
import QRCode from 'react-qr-code';

type PaymentMethod = 'cod' | 'banking' | 'momo';
type SingleCheckoutMode = 'single' | 'total';
type ShippingCarrier = 'ghn' | 'vtp';

interface GHNProvince { ProvinceID: number; ProvinceName: string; }
interface GHNDistrict { DistrictID: number; DistrictName: string; }
interface GHNWard { WardCode: string; WardName: string; }

interface VTPProvince { PROVINCE_ID: number; PROVINCE_NAME: string; }
interface VTPDistrict { DISTRICT_ID: number; DISTRICT_NAME: string; }
interface VTPWard { WARDS_ID: number; WARDS_NAME: string; }

interface InternalOrderItemPayload {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  rowTotal: number;
}

interface InternalOrderSummary {
  id: string;
  paymentCode: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  createdAt?: number;
  updatedAt?: number;
  sepayTransactionId?: string;
  lastPaymentAmountReceived?: number;
  lastPaymentCheckedAt?: number;
  paymentStatusMessage?: string;
  qrUrl?: string;
  bankName?: string;
  bankBin?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  magentoSyncStatus?: 'not_started' | 'queued' | 'success' | 'failed';
}

const BANKING_ORDER_STORAGE_KEY = 'ahphone_checkout_banking_order_id';
const CART_SYNC_STORAGE_KEY = 'ahphone_checkout_pending_cart_sync';
const QR_EXPIRE_MS = 10 * 60 * 1000;

interface StoredBankingOrder {
  orderId: string;
  checkoutFingerprint: string;
  savedAt: number;
}

interface PendingCartSync {
  orderId: string;
  itemId?: string;
  itemUid?: string;
  sku: string;
  paidUnits: number;
  checkoutMode?: SingleCheckoutMode;
  expectedQuantityBeforePay?: number;
  savedAt: number;
}

interface CheckoutItemPriceSource {
  prices?: {
    price?: {
      value?: number;
    };
  };
  product?: {
    price_range?: {
      minimum_price?: {
        final_price?: {
          value?: number;
        };
        regular_price?: {
          value?: number;
        };
      };
    };
  };
}

interface CheckoutSelectedOptionValueSource {
  value?: string;
  label?: string;
}

interface CheckoutSelectedOptionSource {
  label?: string;
  values?: CheckoutSelectedOptionValueSource[];
}

interface CheckoutSelectedOptionItemSource {
  customizable_options?: CheckoutSelectedOptionSource[];
}

function resolveCheckoutUnitPrice(item: CheckoutItemPriceSource): number {
  const fromCartPrice = Number(item?.prices?.price?.value);
  if (Number.isFinite(fromCartPrice) && fromCartPrice >= 0) {
    return fromCartPrice;
  }

  const fromFinalPrice = Number(item?.product?.price_range?.minimum_price?.final_price?.value);
  if (Number.isFinite(fromFinalPrice) && fromFinalPrice >= 0) {
    return fromFinalPrice;
  }

  const fromRegularPrice = Number(item?.product?.price_range?.minimum_price?.regular_price?.value);
  if (Number.isFinite(fromRegularPrice) && fromRegularPrice >= 0) {
    return fromRegularPrice;
  }

  return 0;
}

function resolveCheckoutSelectedOptionLines(item: CheckoutSelectedOptionItemSource): string[] {
  const options = Array.isArray(item.customizable_options) ? item.customizable_options : [];

  return options
    .map((option) => {
      const optionLabel = String(option?.label || '').trim();
      const values = Array.isArray(option?.values)
        ? option.values
            .map((value) => String(value?.label || value?.value || '').trim())
            .filter(Boolean)
        : [];

      if (!optionLabel || values.length === 0) {
        return '';
      }

      return `${optionLabel}: ${values.join(', ')}`;
    })
    .filter(Boolean);
}

function getSessionStorageSafe(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readStoredBankingOrder(): StoredBankingOrder | null {
  const storage = getSessionStorageSafe();
  if (!storage) return null;

  const raw = storage.getItem(BANKING_ORDER_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredBankingOrder>;
    const orderId = String(parsed.orderId || '').trim();
    if (!orderId) return null;

    return {
      orderId,
      checkoutFingerprint: String(parsed.checkoutFingerprint || '').trim(),
      savedAt: Number(parsed.savedAt || 0),
    };
  } catch {
    const legacyOrderId = raw.trim();
    if (!legacyOrderId) return null;
    return {
      orderId: legacyOrderId,
      checkoutFingerprint: '',
      savedAt: 0,
    };
  }
}

function writeStoredBankingOrder(orderId: string, checkoutFingerprint: string): void {
  const storage = getSessionStorageSafe();
  if (!storage) return;

  const payload: StoredBankingOrder = {
    orderId,
    checkoutFingerprint,
    savedAt: Date.now(),
  };

  storage.setItem(BANKING_ORDER_STORAGE_KEY, JSON.stringify(payload));
}

function clearStoredBankingOrder(): void {
  const storage = getSessionStorageSafe();
  if (!storage) return;
  storage.removeItem(BANKING_ORDER_STORAGE_KEY);
}

function writePendingCartSync(payload: PendingCartSync): void {
  const storage = getSessionStorageSafe();
  if (!storage) return;
  storage.setItem(CART_SYNC_STORAGE_KEY, JSON.stringify(payload));
}

function readPendingCartSync(): PendingCartSync | null {
  const storage = getSessionStorageSafe();
  if (!storage) return null;

  const raw = storage.getItem(CART_SYNC_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingCartSync>;
    const orderId = String(parsed.orderId || '').trim();
    const sku = String(parsed.sku || '').trim();
    if (!orderId || !sku) return null;

    return {
      orderId,
      itemId: String(parsed.itemId || '').trim() || undefined,
      itemUid: String(parsed.itemUid || '').trim() || undefined,
      sku,
      paidUnits: Math.max(1, Math.floor(Number(parsed.paidUnits || 1))),
      checkoutMode: parsed.checkoutMode === 'total' ? 'total' : 'single',
      expectedQuantityBeforePay: Math.max(0, Math.floor(Number(parsed.expectedQuantityBeforePay || 0))),
      savedAt: Number(parsed.savedAt || 0),
    };
  } catch {
    return null;
  }
}

function clearPendingCartSync(): void {
  const storage = getSessionStorageSafe();
  if (!storage) return;
  storage.removeItem(CART_SYNC_STORAGE_KEY);
}

function formatCountdown(ms: number): string {
  const safeSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractGhnFee(data: unknown): number | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const payload = data as {
    data?: {
      total?: unknown;
      service_fee?: unknown;
      total_fee?: unknown;
    };
  };

  return (
    toFiniteNumber(payload.data?.total) ??
    toFiniteNumber(payload.data?.service_fee) ??
    toFiniteNumber(payload.data?.total_fee)
  );
}

function extractVtpFee(data: unknown): number | null {
  const list = Array.isArray(data)
    ? data
    : (data as { data?: unknown[] })?.data;

  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }

  const preferred = list.find((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    return String((item as { MA_DV_CHINH?: unknown }).MA_DV_CHINH || '').toUpperCase() === 'VCN';
  }) || list[0];

  if (!preferred || typeof preferred !== 'object') {
    return null;
  }

  return toFiniteNumber((preferred as { GIA_CUOC?: unknown }).GIA_CUOC);
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get('itemId');
  const sku = (searchParams.get('sku') || '').trim();
  const isSingleProductCheckout = Boolean(itemId || sku);
  const requestedModeRaw = (searchParams.get('mode') || '').trim().toLowerCase();
  const singleCheckoutMode: SingleCheckoutMode = requestedModeRaw === 'total' ? 'total' : 'single';
  const paymentFromQuery = (searchParams.get('payment') || '').trim().toLowerCase();
  const forceNewOrder = ['1', 'true', 'yes', 'on'].includes((searchParams.get('buyAgain') || '').trim().toLowerCase());
  const { cart, loading, addToCart, updateQuantity, removeItem, refreshCart } = useCart();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [orderNote, setOrderNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('banking');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [previewOrderId] = useState(() => `ORD-${Date.now().toString(36).toUpperCase()}`);
  const orderId = previewOrderId;
  const [momoQR, setMomoQR] = useState<string | null>(null);
  const [momoLoading, setMomoLoading] = useState(false);
  const [momoError, setMomoError] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [shippingOrderCode, setShippingOrderCode] = useState<string | null>(null);
  const [internalOrder, setInternalOrder] = useState<InternalOrderSummary | null>(null);
  const [creatingBankingOrder, setCreatingBankingOrder] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [showPaidNotice, setShowPaidNotice] = useState(false);
  const [copiedField, setCopiedField] = useState<'account' | 'content' | null>(null);
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const [switchingCheckoutMode, setSwitchingCheckoutMode] = useState(false);
  const [ensuringSkuItem, setEnsuringSkuItem] = useState(false);
  const creatingBankingOrderRef = useRef(false);
  const createOrderAbortRef = useRef<AbortController | null>(null);
  const ensureSkuAttemptRef = useRef<string>('');
  const checkoutScopeRef = useRef<{ fingerprint: string; nonce: number }>({
    fingerprint: '',
    nonce: 0,
  });
  const internalOrderScopeRef = useRef<string>('');
  const cartSyncedPaidOrderRef = useRef<string>('');
  const paymentCheckRequestSeqRef = useRef(0);

  // Địa chỉ
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Carrier
  const [shippingCarrier, setShippingCarrier] = useState<ShippingCarrier>('ghn');

  // GHN address
  const [ghnProvinces, setGhnProvinces] = useState<GHNProvince[]>([]);
  const [ghnDistricts, setGhnDistricts] = useState<GHNDistrict[]>([]);
  const [ghnWards, setGhnWards] = useState<GHNWard[]>([]);
  const [ghnProvince, setGhnProvince] = useState<GHNProvince | null>(null);
  const [ghnDistrict, setGhnDistrict] = useState<GHNDistrict | null>(null);
  const [ghnWard, setGhnWard] = useState<GHNWard | null>(null);

  // VTP address
  const [vtpProvinces, setVtpProvinces] = useState<VTPProvince[]>([]);
  const [vtpDistricts, setVtpDistricts] = useState<VTPDistrict[]>([]);
  const [vtpWards, setVtpWards] = useState<VTPWard[]>([]);
  const [vtpProvince, setVtpProvince] = useState<VTPProvince | null>(null);
  const [vtpDistrict, setVtpDistrict] = useState<VTPDistrict | null>(null);
  const [vtpWard, setVtpWard] = useState<VTPWard | null>(null);

  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);

  const paymentMethodLabel: Record<PaymentMethod, string> = {
    cod: 'Thanh toán khi nhận hàng (COD)',
    banking: 'Chuyển khoản ngân hàng',
    momo: 'Ví MoMo',
  };

  const paymentMethodDescription: Record<PaymentMethod, string> = {
    cod: 'Bạn thanh toán bằng tiền mặt khi shipper giao hàng đến tay.',
    banking: 'Quét QR và chuyển khoản đúng nội dung để hệ thống đối soát tự động.',
    momo: 'Thanh toán qua ví MoMo bằng mã QR.',
  };

  const cartItems = cart?.items || [];
  const isEmpty = cartItems.length === 0;
  const checkoutItemsById = itemId
    ? cartItems.filter((item) => item.id === itemId || item.uid === itemId)
    : [];
  const checkoutItems = itemId
    ? (checkoutItemsById.length > 0
      ? checkoutItemsById
      : sku
        ? cartItems.filter((item) => item.product.sku === sku)
        : [])
    : sku
      ? cartItems.filter((item) => item.product.sku === sku)
      : cartItems;
  const singleCheckoutTargetItem = isSingleProductCheckout && checkoutItems.length > 0 ? checkoutItems[0] : null;
  const allowTotalForSingleItem = Boolean(singleCheckoutTargetItem && singleCheckoutTargetItem.quantity > 1);

  const resolveCheckoutItemQuantity = useCallback((quantity: number): number => {
    if (!isSingleProductCheckout) {
      return quantity;
    }

    if (allowTotalForSingleItem && singleCheckoutMode === 'total') {
      return Math.max(1, Math.floor(quantity));
    }

    return 1;
  }, [allowTotalForSingleItem, isSingleProductCheckout, singleCheckoutMode]);

  const currency = cart?.prices?.subtotal_excluding_tax?.currency || 'VND';
  const orderTotal = checkoutItems.reduce((sum, item) => {
    const quantity = resolveCheckoutItemQuantity(item.quantity);
    const unitPrice = resolveCheckoutUnitPrice(item);
    return sum + unitPrice * quantity;
  }, 0);
  const requiresShippingInfo = paymentMethod === 'cod';
  const shippingAmount = requiresShippingInfo ? (shippingFee || 0) : 0;
  const grandTotal = orderTotal + shippingAmount;
  const formattedTotal = formatPrice(orderTotal, currency);
  const formattedGrandTotal = formatPrice(grandTotal, currency);
  const checkoutFingerprint = [
    itemId || 'all',
    sku || 'any-sku',
    currency,
    Math.round(grandTotal),
    requiresShippingInfo ? shippingCarrier : 'no-shipping',
    checkoutItems
      .map((item) => {
        const quantity = resolveCheckoutItemQuantity(item.quantity);
        const unitPrice = resolveCheckoutUnitPrice(item);
        const optionSignature = resolveCheckoutSelectedOptionLines(item).join('|');
        return `${item.id}:${quantity}:${Math.round(unitPrice)}:${item.product.sku}:${optionSignature}`;
      })
      .join('|'),
    singleCheckoutMode,
  ].join('::');
  const bankName = process.env.NEXT_PUBLIC_BANK_NAME?.trim() || '';
  const bankAccountNo = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NO || '';
  const bankAccountName = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME?.trim() || 'NGUYEN ANH HUY';
  const activeOrderId = internalOrder?.id || previewOrderId;
  const transferContent = (internalOrder?.paymentCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const qrAmount = Math.max(0, Math.round(internalOrder?.amount ?? grandTotal));
  const resolvedBankName = internalOrder?.bankName?.trim() || bankName;
  const resolvedBankAccountNo = internalOrder?.bankAccountNo?.trim() || bankAccountNo;
  const resolvedBankAccountName = bankAccountName;
  const sepayBankCode = (process.env.NEXT_PUBLIC_SEPAY_BANK_CODE || internalOrder?.bankBin || '').trim();
  const bankingQrUrl =
    (internalOrder?.qrUrl || (
      internalOrder && resolvedBankAccountNo && sepayBankCode
        ? `https://qr.sepay.vn/img?acc=${encodeURIComponent(resolvedBankAccountNo)}&bank=${encodeURIComponent(sepayBankCode)}&amount=${qrAmount}&des=${encodeURIComponent(transferContent)}`
        : ''
    ));
  const qrCreatedAt = internalOrder?.createdAt || 0;
  const qrExpireAt = qrCreatedAt > 0 ? qrCreatedAt + QR_EXPIRE_MS : 0;
  const qrRemainingMs = qrExpireAt > 0 ? Math.max(0, qrExpireAt - countdownNow) : QR_EXPIRE_MS;
  const qrIsExpired = Boolean(internalOrder && internalOrder.status !== 'paid' && qrExpireAt > 0 && qrRemainingMs <= 0);
  const qrCountdownText = formatCountdown(qrRemainingMs);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/checkout');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (paymentFromQuery === 'cod') {
      setPaymentMethod('cod');
      return;
    }

    if (paymentFromQuery === 'momo') {
      setPaymentMethod('momo');
      return;
    }

    setPaymentMethod('banking');
  }, [paymentFromQuery]);

  useEffect(() => {
    setMomoQR(null);
    setMomoError(null);
    setOrderError(null);
  }, [paymentMethod]);

  useEffect(() => {
    if (
      authLoading ||
      loading ||
      !isAuthenticated ||
      !isSingleProductCheckout ||
      !sku ||
      itemId ||
      checkoutItems.length > 0
    ) {
      return;
    }

    if (ensureSkuAttemptRef.current === sku) {
      return;
    }
    ensureSkuAttemptRef.current = sku;

    let cancelled = false;
    const ensureSkuInCart = async () => {
      setEnsuringSkuItem(true);
      try {
        await addToCart(sku, 1);
        if (!cancelled) {
          await refreshCart();
        }
      } catch (error) {
        console.error('Unable to auto-add checkout SKU to cart:', error);
        if (!cancelled) {
          setOrderError('Không thể chuẩn bị sản phẩm để thanh toán. Vui lòng thử lại.');
        }
      } finally {
        if (!cancelled) {
          setEnsuringSkuItem(false);
        }
      }
    };

    void ensureSkuInCart();
    return () => {
      cancelled = true;
    };
  }, [
    addToCart,
    authLoading,
    checkoutItems.length,
    isAuthenticated,
    isSingleProductCheckout,
    itemId,
    loading,
    refreshCart,
    sku,
  ]);

  const isScopeStale = useCallback((expectedFingerprint: string, expectedNonce: number): boolean => {
    return checkoutScopeRef.current.fingerprint !== expectedFingerprint || checkoutScopeRef.current.nonce !== expectedNonce;
  }, []);

  useEffect(() => {
    checkoutScopeRef.current = {
      fingerprint: checkoutFingerprint,
      nonce: checkoutScopeRef.current.nonce + 1,
    };
  }, [checkoutFingerprint]);

  // Reset fee khi đổi carrier
  useEffect(() => {
    setShippingFee(null);
  }, [shippingCarrier]);

  // Load GHN provinces
  useEffect(() => {
    fetch('/api/shipping/ghn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-province', payload: {} }),
    }).then(r => r.json()).then(data => {
      if (data.code === 200 && data.data) setGhnProvinces(data.data);
    }).catch(() => {});
  }, []);

  // Load VTP provinces
  useEffect(() => {
    fetch('/api/shipping/viettelpost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-province', payload: {} }),
    }).then(r => r.json()).then(data => {
      if (data.status === 200 && data.data) setVtpProvinces(data.data);
    }).catch(() => {});
  }, []);

  // GHN: load district
  useEffect(() => {
    if (!ghnProvince) { setGhnDistricts([]); setGhnDistrict(null); setGhnWards([]); setGhnWard(null); return; }
    fetch('/api/shipping/ghn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-district', payload: { province_id: ghnProvince.ProvinceID } }),
    }).then(r => r.json()).then(data => {
      if (data.code === 200 && data.data) setGhnDistricts(data.data);
      else setGhnDistricts([]);
      setGhnDistrict(null); setGhnWards([]); setGhnWard(null); setShippingFee(null);
    }).catch(() => setGhnDistricts([]));
  }, [ghnProvince]);

  // GHN: load ward
  useEffect(() => {
    if (!ghnDistrict) { setGhnWards([]); setGhnWard(null); return; }
    fetch('/api/shipping/ghn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-ward', payload: { district_id: ghnDistrict.DistrictID } }),
    }).then(r => r.json()).then(data => {
      if (data.code === 200 && data.data) setGhnWards(data.data);
      else setGhnWards([]);
      setGhnWard(null); setShippingFee(null);
    }).catch(() => setGhnWards([]));
  }, [ghnDistrict]);

  // VTP: load district
  useEffect(() => {
    if (!vtpProvince) { setVtpDistricts([]); setVtpDistrict(null); setVtpWards([]); setVtpWard(null); return; }
    fetch('/api/shipping/viettelpost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-district', payload: { provinceId: vtpProvince.PROVINCE_ID } }),
    }).then(r => r.json()).then(data => {
      if (data.status === 200 && data.data) setVtpDistricts(data.data);
      else setVtpDistricts([]);
      setVtpDistrict(null); setVtpWards([]); setVtpWard(null); setShippingFee(null);
    }).catch(() => setVtpDistricts([]));
  }, [vtpProvince]);

  // VTP: load ward
  useEffect(() => {
    if (!vtpDistrict) { setVtpWards([]); setVtpWard(null); return; }
    fetch('/api/shipping/viettelpost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-ward', payload: { districtId: vtpDistrict.DISTRICT_ID } }),
    }).then(r => r.json()).then(data => {
      if (data.status === 200 && data.data) setVtpWards(data.data);
      else setVtpWards([]);
      setVtpWard(null); setShippingFee(null);
    }).catch(() => setVtpWards([]));
  }, [vtpDistrict]);

  useEffect(() => {
    if (!switchingCheckoutMode) {
      return;
    }

    setSwitchingCheckoutMode(false);
  }, [checkoutFingerprint, switchingCheckoutMode]);

  // Tính phí GHN
  useEffect(() => {
    if (shippingCarrier !== 'ghn' || !ghnDistrict || !ghnWard) return;
    setShippingLoading(true);
    fetch('/api/shipping/ghn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'calculate-fee',
        payload: {
          service_type_id: 2,
          to_district_id: ghnDistrict.DistrictID,
          to_ward_code: ghnWard.WardCode,
          weight: 500,
          insurance_value: Math.round(orderTotal || 0),
        },
      }),
    }).then(r => r.json()).then(data => {
      setShippingFee(extractGhnFee(data));
    }).catch(() => setShippingFee(null)).finally(() => setShippingLoading(false));
  }, [ghnDistrict, ghnWard, shippingCarrier]);

  // Tính phí VTP
  useEffect(() => {
    if (shippingCarrier !== 'vtp' || !vtpProvince || !vtpDistrict) return;
    setShippingLoading(true);
    fetch('/api/shipping/viettelpost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'calculate-fee',
        payload: {
          PRODUCT_WEIGHT: 500,
          PRODUCT_PRICE: Math.round(orderTotal || 0),
          ORDER_SERVICE_ADD: '',
          ORDER_SERVICE: 'VCN',
          SENDER_PROVINCE: 1,
          SENDER_DISTRICT: 22,
          RECEIVER_PROVINCE: vtpProvince.PROVINCE_ID,
          RECEIVER_DISTRICT: vtpDistrict.DISTRICT_ID,
          PRODUCT_TYPE: 'HH',
          NATIONAL_TYPE: 1,
        },
      }),
    }).then(r => r.json()).then(data => {
      setShippingFee(extractVtpFee(data));
    }).catch(() => setShippingFee(null)).finally(() => setShippingLoading(false));
  }, [vtpProvince, vtpDistrict, shippingCarrier]);

  const createGHNOrder = async () => {
    if (!ghnDistrict || !ghnWard) return null;
    try {
      const items = checkoutItems.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: Math.round(item.product.price_range?.minimum_price?.regular_price?.value ?? item.prices.price.value),
      }));
      const response = await fetch('/api/shipping/ghn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-order',
          payload: {
            payment_type_id: paymentMethod === 'cod' ? 2 : 1,
            note: orderNote || '',
            required_note: 'KHONGCHOXEMHANG',
            to_name: fullName,
            to_phone: phone,
            to_address: address,
            to_ward_code: ghnWard.WardCode,
            to_district_id: ghnDistrict.DistrictID,
            cod_amount: paymentMethod === 'cod' ? Math.round(orderTotal + (shippingFee || 0)) : 0,
            weight: 500, length: 20, width: 15, height: 10,
            insurance_value: Math.round(orderTotal),
            service_type_id: 2,
            items,
          },
        }),
      });
      const data = await response.json();
      if (data.code === 200 && data.data?.order_code) return data.data.order_code;
      return null;
    } catch { return null; }
  };

  const createVTPOrder = async () => {
    if (!vtpProvince || !vtpDistrict || !vtpWard) return null;
    try {
      const response = await fetch('/api/shipping/viettelpost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-order',
          payload: {
            ORDER_NUMBER: orderId,
            GROUPADDRESS_ID: 0,
            CUS_ID: 0,
            DELIVERY_DATE: new Date().toISOString(),
            SENDER_FULLNAME: 'AH Phone Store',
            SENDER_ADDRESS: '144 Xuân Thủy, Cầu Giấy',
            SENDER_PHONE: '0912345678',
            SENDER_EMAIL: '',
            SENDER_WARD: 0,
            SENDER_DISTRICT: 22,
            SENDER_PROVINCE: 1,
            SENDER_LATITUDE: 0,
            SENDER_LONGITUDE: 0,
            RECEIVER_FULLNAME: fullName,
            RECEIVER_ADDRESS: address,
            RECEIVER_PHONE: phone,
            RECEIVER_EMAIL: '',
            RECEIVER_WARD: vtpWard.WARDS_ID,
            RECEIVER_DISTRICT: vtpDistrict.DISTRICT_ID,
            RECEIVER_PROVINCE: vtpProvince.PROVINCE_ID,
            RECEIVER_LATITUDE: 0,
            RECEIVER_LONGITUDE: 0,
            PRODUCT_NAME: checkoutItems.map(i => i.product.name).join(', '),
            PRODUCT_DESCRIPTION: orderNote || '',
            PRODUCT_QUANTITY: checkoutItems.reduce((s, i) => s + i.quantity, 0),
            PRODUCT_PRICE: Math.round(orderTotal),
            PRODUCT_WEIGHT: 500,
            PRODUCT_LENGTH: 20,
            PRODUCT_WIDTH: 15,
            PRODUCT_HEIGHT: 10,
            PRODUCT_TYPE: 'HH',
            ORDER_PAYMENT: paymentMethod === 'cod' ? 3 : 1,
            ORDER_SERVICE: 'VCN',
            ORDER_SERVICE_ADD: '',
            ORDER_VOUCHER: '',
            ORDER_NOTE: orderNote || '',
            MONEY_COLLECTION: paymentMethod === 'cod' ? Math.round(orderTotal + (shippingFee || 0)) : 0,
            MONEY_TOTALFEE: shippingFee || 0,
            MONEY_FEECOD: 0,
            MONEY_FEEVAS: 0,
            MONEY_FEEINSUR: 0,
            MONEY_FEE: shippingFee || 0,
            MONEY_FEEOTHER: 0,
            MONEY_TOTALVAT: 0,
            MONEY_TOTAL: Math.round(orderTotal),
            LIST_ITEM: checkoutItems.map(item => ({
              PRODUCT_NAME: item.product.name,
              PRODUCT_PRICE: Math.round(item.product.price_range?.minimum_price?.regular_price?.value ?? item.prices.price.value),
              PRODUCT_WEIGHT: 500,
              PRODUCT_QUANTITY: item.quantity,
              PRODUCT_CODE: item.product.sku || '',
            })),
          },
        }),
      });
      const data = await response.json();
      if (data.status === 200 && data.data?.ORDER_NUMBER) return data.data.ORDER_NUMBER;
      return null;
    } catch { return null; }
  };

  const handleMomoPayment = async () => {
    setMomoLoading(true);
    setMomoError(null);
    try {
      const response = await fetch('/api/momo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(grandTotal || 0),
          orderId,
          orderInfo: `Thanh toán đơn hàng ${orderId}`,
        }),
      });
      const data = await response.json();
      if (data.payUrl) setMomoQR(data.payUrl);
      else setMomoError('Không thể tạo QR MoMo. Vui lòng thử lại.');
    } catch { setMomoError('Lỗi kết nối. Vui lòng thử lại.'); }
    finally { setMomoLoading(false); }
  };

  const copyText = async (value: string, field: 'account' | 'content') => {
    if (!value) return;
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        return;
      }
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField((current) => (current === field ? null : current));
      }, 1600);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const buildSingleCheckoutUrl = useCallback((mode: SingleCheckoutMode): string => {
    const params = new URLSearchParams();
    if (itemId) {
      params.set('itemId', itemId);
    }

    if (!itemId && sku) {
      params.set('sku', sku);
    }

    params.set('payment', paymentMethod);
    params.set('mode', mode);
    return `/checkout?${params.toString()}`;
  }, [itemId, paymentMethod, sku]);

  const handleSwitchSingleCheckoutMode = (mode: SingleCheckoutMode) => {
    if (!isSingleProductCheckout) {
      return;
    }

    if (mode === singleCheckoutMode) {
      return;
    }

    createOrderAbortRef.current?.abort();
    createOrderAbortRef.current = null;
    creatingBankingOrderRef.current = false;
    checkoutScopeRef.current = {
      fingerprint: checkoutScopeRef.current.fingerprint,
      nonce: checkoutScopeRef.current.nonce + 1,
    };

    setSwitchingCheckoutMode(true);
    setOrderPlaced(false);
    setOrderError(null);
    setCreatingBankingOrder(false);
    setInternalOrder(null);
    setShowPaidNotice(false);
    clearStoredBankingOrder();
    router.push(buildSingleCheckoutUrl(mode));
  };

  const buildItemsPayload = useCallback((): InternalOrderItemPayload[] => {
    return checkoutItems.map((item) => {
      const quantity = resolveCheckoutItemQuantity(item.quantity);
      const unitPrice = resolveCheckoutUnitPrice(item);
      const selectedOptionLines = resolveCheckoutSelectedOptionLines(item);
      const displayName = selectedOptionLines.length > 0
        ? `${item.product.name} (${selectedOptionLines.join(' | ')})`
        : item.product.name;

      return {
        sku: item.product.sku,
        name: displayName,
        quantity,
        unitPrice,
        rowTotal: unitPrice * quantity,
      };
    });
  }, [checkoutItems, resolveCheckoutItemQuantity]);

  const refreshOrderStatus = useCallback(async (orderIdToFetch: string): Promise<InternalOrderSummary | null> => {
    const expectedFingerprint = checkoutFingerprint;
    const expectedNonce = checkoutScopeRef.current.nonce;

    try {
      const response = await fetch(`/api/orders/internal/${encodeURIComponent(orderIdToFetch)}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) return null;
      const data = (await response.json()) as { order?: InternalOrderSummary };
      if (isScopeStale(expectedFingerprint, expectedNonce)) {
        return null;
      }

      if (data.order) {
        setInternalOrder((previous) => {
          if (!previous) return data.order as InternalOrderSummary;
          if (previous.status === 'paid' && data.order?.status !== 'paid') {
            return previous;
          }

          const previousUpdatedAt = Number(previous.updatedAt || 0);
          const nextUpdatedAt = Number(data.order?.updatedAt || 0);
          if (
            previousUpdatedAt > 0 &&
            nextUpdatedAt > 0 &&
            nextUpdatedAt < previousUpdatedAt &&
            data.order?.status !== 'paid'
          ) {
            return previous;
          }

          return data.order as InternalOrderSummary;
        });
        internalOrderScopeRef.current = checkoutFingerprint;
        writeStoredBankingOrder(data.order.id, checkoutFingerprint);
        return data.order;
      }
      return null;
    } catch (error) {
      console.error('Refresh order status failed:', error);
      return null;
    }
  }, [checkoutFingerprint, isScopeStale]);

  const createBankingOrder = useCallback(async (): Promise<InternalOrderSummary | null> => {
    if (internalOrder) return internalOrder;
    if (creatingBankingOrderRef.current) return null;

    creatingBankingOrderRef.current = true;
    setCreatingBankingOrder(true);
    setOrderError(null);

    const expectedFingerprint = checkoutFingerprint;
    const expectedNonce = checkoutScopeRef.current.nonce;
    const abortController = new AbortController();
    createOrderAbortRef.current = abortController;

    try {
      const response = await fetch('/api/orders/internal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
        body: JSON.stringify({
          paymentMethod: 'banking',
          amount: Math.round(grandTotal),
          currency,
          note: orderNote,
          customerEmail: user?.email,
          items: buildItemsPayload(),
        }),
      });

      const data = (await response.json()) as { order?: InternalOrderSummary; error?: string };

      if (isScopeStale(expectedFingerprint, expectedNonce)) {
        return null;
      }

      if (!response.ok || !data.order) {
        throw new Error(data.error || 'Không thể tạo mã thanh toán.');
      }

      setInternalOrder(data.order);
      internalOrderScopeRef.current = checkoutFingerprint;
      writeStoredBankingOrder(data.order.id, checkoutFingerprint);
      return data.order;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }

      if (isScopeStale(expectedFingerprint, expectedNonce)) {
        return null;
      }

      console.error('Create banking order failed:', error);
      setOrderError(error instanceof Error ? error.message : 'Không thể tạo mã thanh toán.');
      return null;
    } finally {
      if (createOrderAbortRef.current === abortController) {
        createOrderAbortRef.current = null;
      }
      creatingBankingOrderRef.current = false;
      setCreatingBankingOrder(false);
    }
  }, [buildItemsPayload, checkoutFingerprint, currency, grandTotal, internalOrder, isScopeStale, orderNote, user?.email]);

  const createCodOrder = useCallback(async (): Promise<InternalOrderSummary | null> => {
    try {
      setOrderError(null);
      const response = await fetch('/api/orders/internal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethod: 'cod',
          amount: Math.round(grandTotal),
          currency,
          note: orderNote,
          customerEmail: user?.email,
          items: buildItemsPayload(),
        }),
      });

      const data = (await response.json()) as { order?: InternalOrderSummary; error?: string };
      if (!response.ok || !data.order) {
        throw new Error(data.error || 'Không thể tạo đơn hàng COD.');
      }

      setInternalOrder(data.order);
      return data.order;
    } catch (error) {
      console.error('Create COD order failed:', error);
      setOrderError(error instanceof Error ? error.message : 'Không thể tạo đơn hàng COD.');
      return null;
    }
  }, [buildItemsPayload, currency, grandTotal, orderNote, user?.email]);

  const checkPaymentStatus = useCallback(async (
    orderIdToCheck: string,
    options?: { silent?: boolean }
  ): Promise<InternalOrderSummary | null> => {
    const expectedFingerprint = checkoutFingerprint;
    const expectedNonce = checkoutScopeRef.current.nonce;
    const requestSeq = paymentCheckRequestSeqRef.current + 1;
    paymentCheckRequestSeqRef.current = requestSeq;
    const isSilent = Boolean(options?.silent);

    if (!isSilent) {
      setCheckingPayment(true);
    }
    try {
      const response = await fetch(`/api/orders/internal/${encodeURIComponent(orderIdToCheck)}/check-payment`, {
        method: 'POST',
        cache: 'no-store',
      });

      if (!response.ok) {
        return refreshOrderStatus(orderIdToCheck);
      }

      const data = (await response.json()) as { order?: InternalOrderSummary };

      if (isScopeStale(expectedFingerprint, expectedNonce)) {
        return null;
      }

      if (requestSeq !== paymentCheckRequestSeqRef.current) {
        return null;
      }

      if (data.order) {
        setInternalOrder((previous) => {
          if (!previous) return data.order as InternalOrderSummary;
          if (previous.status === 'paid' && data.order?.status !== 'paid') {
            return previous;
          }

          const previousUpdatedAt = Number(previous.updatedAt || 0);
          const nextUpdatedAt = Number(data.order?.updatedAt || 0);
          if (
            previousUpdatedAt > 0 &&
            nextUpdatedAt > 0 &&
            nextUpdatedAt < previousUpdatedAt &&
            data.order?.status !== 'paid'
          ) {
            return previous;
          }

          return data.order as InternalOrderSummary;
        });
        return data.order;
      }

      return refreshOrderStatus(orderIdToCheck);
    } catch (error) {
      console.error('Proactive payment check failed:', error);
      return refreshOrderStatus(orderIdToCheck);
    } finally {
      if (!isSilent) {
        setCheckingPayment(false);
      }
    }
  }, [checkoutFingerprint, isScopeStale, refreshOrderStatus]);

  const applyPaidCartSync = useCallback(async (): Promise<void> => {
    if (paymentMethod !== 'banking' || internalOrder?.status !== 'paid' || !isSingleProductCheckout) {
      return;
    }

    const paidOrderId = internalOrder?.id || '';
    if (!paidOrderId) {
      return;
    }

    const selectedItem = checkoutItems[0];
    const pendingPayload = readPendingCartSync();

    const sourceQuantity = selectedItem
      ? Math.max(1, Math.floor(selectedItem.quantity))
      : Math.max(1, Math.floor(Number(pendingPayload?.expectedQuantityBeforePay || 1)));
    const paidUnits = pendingPayload
      ? Math.max(1, Math.floor(pendingPayload.paidUnits || 1))
      : (singleCheckoutMode === 'total' ? resolveCheckoutItemQuantity(sourceQuantity) : 1);

    const currentItems = Array.isArray(cart?.items) ? cart.items : [];
    const matchedItem = currentItems.find((item) => {
      if (pendingPayload?.itemId && item.id === pendingPayload.itemId) return true;
      if (pendingPayload?.itemUid && item.uid === pendingPayload.itemUid) return true;
      if (selectedItem?.id && item.id === selectedItem.id) return true;
      if (selectedItem?.uid && item.uid === selectedItem.uid) return true;

      const targetSku = pendingPayload?.sku || selectedItem?.product.sku || '';
      return Boolean(targetSku) && item.product.sku === targetSku;
    });

    if (!matchedItem) {
      clearPendingCartSync();
      await refreshCart();
      return;
    }

    const currentQuantity = Math.max(0, Math.floor(matchedItem.quantity));
    const nextQuantity = Math.max(0, currentQuantity - paidUnits);

    if (nextQuantity <= 0) {
      await removeItem(matchedItem.id);
    } else {
      await updateQuantity(matchedItem.id, nextQuantity);
    }

    clearPendingCartSync();
    await refreshCart();
  }, [
    cart?.items,
    checkoutItems,
    internalOrder?.id,
    internalOrder?.status,
    isSingleProductCheckout,
    paymentMethod,
    refreshCart,
    removeItem,
    resolveCheckoutItemQuantity,
    singleCheckoutMode,
    updateQuantity,
  ]);

  const handleContinueShopping = useCallback(async () => {
    try {
      await applyPaidCartSync();
    } catch (error) {
      console.error('Continue shopping sync failed:', error);
    } finally {
      router.push('/');
    }
  }, [applyPaidCartSync, router]);

  useEffect(() => {
    if (
      authLoading ||
      loading ||
      isEmpty ||
      checkoutItems.length === 0 ||
      paymentMethod !== 'banking' ||
      internalOrder ||
      switchingCheckoutMode
    ) {
      return;
    }

    let cancelled = false;

    const prepareBankingOrder = async () => {
      if (forceNewOrder) {
        clearStoredBankingOrder();
      }

      const stored = readStoredBankingOrder();
      if (stored?.orderId) {
        if (stored.checkoutFingerprint && stored.checkoutFingerprint !== checkoutFingerprint) {
          clearStoredBankingOrder();
        } else {
          const restored = await refreshOrderStatus(stored.orderId);
          if (restored) {
            if (restored.status === 'pending') {
              return;
            }

            setInternalOrder(null);
            setOrderPlaced(false);
            clearStoredBankingOrder();
          } else {
            clearStoredBankingOrder();
          }
        }
      }

      if (cancelled) return;
      await createBankingOrder();
    };

    void prepareBankingOrder();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    loading,
    isEmpty,
    checkoutItems.length,
    checkoutFingerprint,
    createBankingOrder,
    forceNewOrder,
    internalOrder,
    paymentMethod,
    refreshOrderStatus,
    switchingCheckoutMode,
  ]);

  useEffect(() => {
    if (paymentMethod !== 'banking' || internalOrder?.status !== 'paid') {
      return;
    }

    clearStoredBankingOrder();
  }, [paymentMethod, internalOrder?.id, internalOrder?.status]);

  useEffect(() => {
    if (!internalOrder) {
      internalOrderScopeRef.current = '';
      return;
    }

    if (internalOrder.status === 'paid') {
      return;
    }

    const scopedFingerprint = internalOrderScopeRef.current;
    if (!scopedFingerprint || scopedFingerprint === checkoutFingerprint) {
      return;
    }

    setInternalOrder(null);
    setOrderPlaced(false);
    setOrderError(null);
    clearStoredBankingOrder();
  }, [checkoutFingerprint, internalOrder]);

  useEffect(() => {
    if (paymentMethod !== 'banking' || !internalOrder || internalOrder.status === 'paid') {
      return;
    }

    const timer = setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentMethod, internalOrder?.id, internalOrder?.status]);

  useEffect(() => {
    if (paymentMethod !== 'banking' || internalOrder?.status !== 'paid') {
      return;
    }

    setShowPaidNotice(true);
    setOrderPlaced(true);
  }, [paymentMethod, internalOrder?.status, internalOrder?.sepayTransactionId]);

  useEffect(() => {
    if (paymentMethod !== 'banking' || internalOrder?.status !== 'paid') {
      return;
    }

    if (!isSingleProductCheckout) {
      return;
    }

    const paidOrderId = internalOrder?.id || '';
    if (!paidOrderId || cartSyncedPaidOrderRef.current === paidOrderId) {
      return;
    }

    const selectedItem = checkoutItems[0];
    if (!selectedItem) {
      return;
    }

    cartSyncedPaidOrderRef.current = paidOrderId;

    const sourceQuantity = Math.max(1, Math.floor(selectedItem.quantity));
    const paidUnits = singleCheckoutMode === 'total' ? resolveCheckoutItemQuantity(sourceQuantity) : 1;
    const pendingPayload: PendingCartSync = {
      orderId: paidOrderId,
      itemId: selectedItem.id,
      itemUid: selectedItem.uid,
      sku: selectedItem.product.sku,
      paidUnits,
      checkoutMode: singleCheckoutMode,
      expectedQuantityBeforePay: sourceQuantity,
      savedAt: Date.now(),
    };

    writePendingCartSync(pendingPayload);

    let cancelled = false;
    const syncCartImmediately = async () => {
      const currentItems = Array.isArray(cart?.items) ? cart.items : [];
      const matchedItem = currentItems.find((item) => {
        if (pendingPayload.itemId && item.id === pendingPayload.itemId) return true;
        if (pendingPayload.itemUid && item.uid === pendingPayload.itemUid) return true;
        return item.product.sku === pendingPayload.sku;
      });

      if (!matchedItem) {
        clearPendingCartSync();
        await refreshCart();
        return;
      }

      const currentQuantity = Math.max(0, Math.floor(matchedItem.quantity));
      const nextQuantity = Math.max(0, currentQuantity - pendingPayload.paidUnits);

      if (nextQuantity <= 0) {
        await removeItem(matchedItem.id);
      } else {
        await updateQuantity(matchedItem.id, nextQuantity);
      }

      clearPendingCartSync();
      if (!cancelled) {
        await refreshCart();
      }
    };

    void syncCartImmediately().catch((error) => {
      console.error('Immediate paid cart sync failed:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [
    paymentMethod,
    internalOrder?.id,
    internalOrder?.status,
    isSingleProductCheckout,
    checkoutItems,
    resolveCheckoutItemQuantity,
    singleCheckoutMode,
    cart?.items,
    refreshCart,
    removeItem,
    updateQuantity,
  ]);

  useEffect(() => {
    if (paymentMethod !== 'banking' || !internalOrder?.id || internalOrder.status !== 'pending') {
      return;
    }

    let cancelled = false;
    const poll = async () => {
      const next = await checkPaymentStatus(internalOrder.id, { silent: true });
      if (cancelled || !next) return;
    };

    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [checkPaymentStatus, paymentMethod, internalOrder?.id, internalOrder?.status]);

  const isAddressComplete = Boolean(
    !requiresShippingInfo || (
      fullName.trim() &&
      phone.trim() &&
      address.trim() &&
      (shippingCarrier === 'ghn'
        ? (ghnProvince && ghnDistrict && ghnWard)
        : (vtpProvince && vtpDistrict && vtpWard))
    )
  );
  const hasShippingFee = !requiresShippingInfo || (shippingFee !== null && Number.isFinite(shippingFee) && shippingFee >= 0);

  const selectedProvinceName = shippingCarrier === 'ghn' ? ghnProvince?.ProvinceName : vtpProvince?.PROVINCE_NAME;
  const selectedDistrictName = shippingCarrier === 'ghn' ? ghnDistrict?.DistrictName : vtpDistrict?.DISTRICT_NAME;
  const selectedWardName = shippingCarrier === 'ghn' ? ghnWard?.WardName : vtpWard?.WARDS_NAME;

  const doCreateShippingOrder = async () => {
    if (!requiresShippingInfo) {
      return null;
    }

    if (shippingCarrier === 'ghn') return await createGHNOrder();
    return await createVTPOrder();
  };

  const handleConfirmOrder = async () => {
    setOrderError(null);
    if (switchingCheckoutMode) {
      setOrderError('Đang đồng bộ chế độ thanh toán. Vui lòng đợi trong giây lát.');
      return;
    }
    if (!isAddressComplete) { alert('Vui lòng điền đầy đủ thông tin địa chỉ giao hàng!'); return; }
    if (requiresShippingInfo && shippingLoading) { alert('Hệ thống đang tính phí vận chuyển, vui lòng chờ một chút.'); return; }
    if (!hasShippingFee) { alert('Chưa tính được phí vận chuyển. Vui lòng kiểm tra lại địa chỉ giao hàng.'); return; }
    if (paymentMethod === 'momo') { await handleMomoPayment(); return; }
    setPlacingOrder(true);
    setConfirmLoading(true);
    try {
      if (requiresShippingInfo) {
        const code = await doCreateShippingOrder();
        if (!code) {
          alert('Không thể tạo vận đơn giao hàng. Vui lòng thử lại.');
          return;
        }

        setShippingOrderCode(code);
      } else {
        setShippingOrderCode(null);
      }

      if (paymentMethod === 'banking') {
        const bankingOrder = internalOrder || (await createBankingOrder());
        if (!bankingOrder) throw new Error('Không thể tạo mã thanh toán.');
        setOrderPlaced(true);
        return;
      }

      if (paymentMethod === 'cod') {
        const codOrder = await createCodOrder();
        if (!codOrder) {
          throw new Error('Không thể đồng bộ đơn COD vào Magento.');
        }
        setOrderPlaced(true);
        return;
      }

      setOrderPlaced(true);
    } catch (error) {
      console.error('Place order failed:', error);
      setOrderError(error instanceof Error ? error.message : 'Không thể tạo đơn hàng thanh toán.');
    } finally {
      setConfirmLoading(false);
      setPlacingOrder(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-custom">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!orderPlaced && !internalOrder && (isEmpty || checkoutItems.length === 0)) {
    if (ensuringSkuItem) {
      return (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="container-custom text-center py-20">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            <p className="text-gray-600">Đang chuẩn bị sản phẩm để thanh toán...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-custom text-center py-20">
          <p className="text-gray-600 mb-4">Giỏ hàng của bạn đang trống.</p>
          <Link href="/" className="text-primary-600 underline">Tiếp tục mua sắm</Link>
        </div>
      </div>
    );
  }

  const receivedAmount = internalOrder?.lastPaymentAmountReceived || 0;
  const isBankingPaid = paymentMethod === 'banking' && internalOrder?.status === 'paid';
  const isBankingUnderpaid = paymentMethod === 'banking' && !isBankingPaid && receivedAmount > 0 && receivedAmount < qrAmount;
  const remainingAmount = isBankingUnderpaid ? qrAmount - receivedAmount : 0;

  const paidNoticeNode = showPaidNotice && paymentMethod === 'banking' && internalOrder?.status === 'paid' ? (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl">
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 shadow-lg px-4 py-3 text-emerald-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Đã xác nhận thanh toán</p>
            <p className="text-xs mt-1">{internalOrder?.paymentStatusMessage || 'Hệ thống đã nhận giao dịch thanh toán của bạn.'}</p>
            {internalOrder?.sepayTransactionId && (
              <p className="text-xs mt-1 font-semibold">Mã GD SePay: {internalOrder.sepayTransactionId}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowPaidNotice(false)}
            className="text-xs font-semibold opacity-70 hover:opacity-100"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (orderPlaced) {
    const bankingPending = paymentMethod === 'banking' && !isBankingPaid;

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        {paidNoticeNode}
        <div className="container-custom">
          <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${bankingPending ? 'bg-amber-100' : 'bg-green-100'}`}>
              {bankingPending ? (
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l2 2m6-2a8 8 0 11-16 0 8 8 0 0116 0z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {bankingPending ? 'Đơn hàng đã tạo, chờ chuyển khoản' : 'Đặt hàng thành công!'}
            </h2>
            <p className="text-gray-600 mb-1">Mã đơn hàng: <strong className="text-primary-700">{activeOrderId}</strong></p>
            {shippingOrderCode && (
              <p className="text-gray-600 mb-1 text-sm">
                Mã vận đơn {shippingCarrier === 'ghn' ? 'GHN' : 'Viettel Post'}: <strong className="text-blue-600">{shippingOrderCode}</strong>
              </p>
            )}
            {requiresShippingInfo && (
              <p className="text-gray-600 mb-1 text-sm">
                Giao đến: <strong>{fullName}</strong> — {address}, {selectedWardName}, {selectedDistrictName}, {selectedProvinceName}
              </p>
            )}
            <p className="text-gray-600 mb-4 text-sm">Phương thức: {paymentMethodLabel[paymentMethod]}</p>

            {paymentMethod === 'banking' && (
              <div className="text-left border border-gray-200 rounded-lg p-4 mb-6 text-sm space-y-3">
                <div className={`rounded-lg px-3 py-2 text-xs ${isBankingPaid ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                  {isBankingPaid
                    ? (internalOrder?.paymentStatusMessage || 'Hệ thống đã xác nhận giao dịch SePay.')
                    : (internalOrder?.paymentStatusMessage || 'Vui lòng chuyển khoản đúng nội dung bên dưới để hệ thống tự động đối soát.')}
                </div>

                {bankingQrUrl && !isBankingPaid && (
                  <div className="flex justify-center">
                    <img
                      src={bankingQrUrl}
                      alt="QR chuyển khoản SePay"
                      className="w-56 h-56 object-contain rounded-lg border border-emerald-200 bg-white p-2"
                    />
                  </div>
                )}

                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Ngân hàng</span>
                  <span className="font-semibold text-gray-900">{resolvedBankName}</span>
                </div>
                <div className="flex justify-between gap-2 items-center">
                  <span className="text-gray-500">Số tài khoản</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{resolvedBankAccountNo || 'Chưa cấu hình'}</span>
                    {resolvedBankAccountNo && (
                      <button
                        type="button"
                        onClick={() => copyText(resolvedBankAccountNo, 'account')}
                        className="px-2 py-0.5 rounded border border-gray-300 text-[10px] font-semibold hover:bg-white"
                      >
                        {copiedField === 'account' ? 'Đã copy' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Chủ tài khoản</span>
                  <span className="font-semibold text-gray-900">{resolvedBankAccountName || 'Chưa cấu hình'}</span>
                </div>
                <div className="flex justify-between gap-2 items-center">
                  <span className="text-gray-500">Nội dung CK</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{transferContent || 'Đang tạo mã'}</span>
                    {transferContent && (
                      <button
                        type="button"
                        onClick={() => copyText(transferContent, 'content')}
                        className="px-2 py-0.5 rounded border border-gray-300 text-[10px] font-semibold hover:bg-white"
                      >
                        {copiedField === 'content' ? 'Đã copy' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Số tiền</span>
                  <span className="font-semibold text-primary-700">{formatPrice(qrAmount, internalOrder?.currency || currency)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Đã nhận</span>
                  <span className="font-semibold text-gray-900">{formatPrice(receivedAmount, internalOrder?.currency || currency)}</span>
                </div>
                {isBankingUnderpaid && (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">Còn thiếu</span>
                    <span className="font-semibold text-amber-700">{formatPrice(remainingAmount, internalOrder?.currency || currency)}</span>
                  </div>
                )}
                {internalOrder?.sepayTransactionId && (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">Mã GD SePay</span>
                    <span className="font-semibold text-emerald-700">{internalOrder.sepayTransactionId}</span>
                  </div>
                )}

                {!isBankingPaid && (
                  <button
                    type="button"
                    onClick={() => internalOrder?.id ? void checkPaymentStatus(internalOrder.id) : undefined}
                    disabled={checkingPayment}
                    className="w-full mt-2 bg-emerald-600 text-white font-semibold py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
                  >
                    {checkingPayment ? 'Đang kiểm tra giao dịch...' : 'Thanh toán đã hoàn tất'}
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleContinueShopping}
              className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              Tiếp tục mua sắm
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {paidNoticeNode}
      <div className="container-custom">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-primary-600">Trang chủ</Link>
          <span>/</span>
          <Link href="/cart" className="hover:text-primary-600">Giỏ hàng</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Thanh toán</span>
        </div>

        <h1 className="text-2xl font-bold mb-6">Thanh toán</h1>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-4">

            {/* Thông tin giao hàng */}
            {paymentMethod === 'cod' && (
            <div className="order-2 bg-white rounded-xl shadow-sm p-5 space-y-3">
              <h2 className="font-bold text-gray-900">Thông tin giao hàng</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Họ tên *</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nguyễn Văn A"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Số điện thoại *</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912345678"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Địa chỉ cụ thể *</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Số nhà, tên đường..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>

              {/* Chọn đơn vị vận chuyển */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Đơn vị vận chuyển *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setShippingCarrier('ghn')}
                    className={`border rounded-lg px-3 py-2 text-sm font-medium transition-colors ${shippingCarrier === 'ghn' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    🚚 GHN Express
                  </button>
                  <button type="button" onClick={() => setShippingCarrier('vtp')}
                    className={`border rounded-lg px-3 py-2 text-sm font-medium transition-colors ${shippingCarrier === 'vtp' ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    📦 Viettel Post
                  </button>
                </div>
              </div>

              {/* GHN address */}
              {shippingCarrier === 'ghn' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tỉnh/Thành phố *</label>
                    <select value={ghnProvince?.ProvinceID || ''} onChange={e => setGhnProvince(ghnProvinces.find(p => p.ProvinceID === Number(e.target.value)) || null)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="">-- Chọn tỉnh/thành --</option>
                      {ghnProvinces.map(p => <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quận/Huyện *</label>
                    <select value={ghnDistrict?.DistrictID || ''} onChange={e => setGhnDistrict(ghnDistricts.find(d => d.DistrictID === Number(e.target.value)) || null)}
                      disabled={!ghnProvince} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100">
                      <option value="">-- Chọn quận/huyện --</option>
                      {ghnDistricts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phường/Xã *</label>
                    <select value={ghnWard?.WardCode || ''} onChange={e => setGhnWard(ghnWards.find(w => w.WardCode === e.target.value) || null)}
                      disabled={!ghnDistrict} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100">
                      <option value="">-- Chọn phường/xã --</option>
                      {ghnWards.map(w => <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* VTP address */}
              {shippingCarrier === 'vtp' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tỉnh/Thành phố *</label>
                    <select value={vtpProvince?.PROVINCE_ID || ''} onChange={e => setVtpProvince(vtpProvinces.find(p => p.PROVINCE_ID === Number(e.target.value)) || null)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="">-- Chọn tỉnh/thành --</option>
                      {vtpProvinces.map(p => <option key={p.PROVINCE_ID} value={p.PROVINCE_ID}>{p.PROVINCE_NAME}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quận/Huyện *</label>
                    <select value={vtpDistrict?.DISTRICT_ID || ''} onChange={e => setVtpDistrict(vtpDistricts.find(d => d.DISTRICT_ID === Number(e.target.value)) || null)}
                      disabled={!vtpProvince} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100">
                      <option value="">-- Chọn quận/huyện --</option>
                      {vtpDistricts.map(d => <option key={d.DISTRICT_ID} value={d.DISTRICT_ID}>{d.DISTRICT_NAME}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phường/Xã *</label>
                    <select value={vtpWard?.WARDS_ID || ''} onChange={e => setVtpWard(vtpWards.find(w => w.WARDS_ID === Number(e.target.value)) || null)}
                      disabled={!vtpDistrict} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100">
                      <option value="">-- Chọn phường/xã --</option>
                      {vtpWards.map(w => <option key={w.WARDS_ID} value={w.WARDS_ID}>{w.WARDS_NAME}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Phí ship */}
              {((shippingCarrier === 'ghn' && ghnWard) || (shippingCarrier === 'vtp' && vtpDistrict)) && (
                <div className={`rounded-lg p-3 text-sm ${shippingFee !== null ? (shippingCarrier === 'ghn' ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200') : 'bg-gray-50'}`}>
                  {shippingLoading ? (
                    <p className="text-gray-500 text-xs">Đang tính phí vận chuyển...</p>
                  ) : shippingFee !== null ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${shippingCarrier === 'ghn' ? 'text-blue-700' : 'text-red-700'}`}>
                          {shippingCarrier === 'ghn' ? '🚚 GHN Express' : '📦 Viettel Post'}
                        </p>
                        <p className="text-xs text-gray-500">{shippingCarrier === 'ghn' ? 'Giao hàng 1-3 ngày' : 'Giao hàng 2-4 ngày'}</p>
                      </div>
                      <p className={`font-bold ${shippingCarrier === 'ghn' ? 'text-blue-700' : 'text-red-700'}`}>{formatPrice(shippingFee, currency)}</p>
                    </div>
                  ) : (
                    <p className="text-red-500 text-xs">Không thể tính phí vận chuyển cho khu vực này.</p>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Đơn hàng */}
            <div className="order-1 bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Đơn hàng của bạn</h2>
                {allowTotalForSingleItem && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSwitchSingleCheckoutMode('single')}
                      disabled={switchingCheckoutMode}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                        singleCheckoutMode === 'single'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Thanh toán riêng (1 sản phẩm)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchSingleCheckoutMode('total')}
                      disabled={switchingCheckoutMode}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                        singleCheckoutMode === 'total'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Thanh toán tổng (x{singleCheckoutTargetItem?.quantity || 1})
                    </button>
                  </div>
                )}
              </div>
              <div className="divide-y divide-gray-50">
                {checkoutItems.map((item) => {
                  const quantity = resolveCheckoutItemQuantity(item.quantity);
                  const unitPrice = resolveCheckoutUnitPrice(item);
                  const selectedOptionLines = resolveCheckoutSelectedOptionLines(item);
                  const lineCurrency = item.prices?.price?.currency || item.prices?.row_total?.currency || currency;
                  return (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="w-14 h-14 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                        {item.product.thumbnail?.url ? (
                          <img
                            src={item.product.thumbnail.url}
                            alt={item.product.name}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              e.currentTarget.style.visibility = 'hidden';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 px-1 text-center">
                            Không có ảnh
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{item.product.name}</p>
                        {selectedOptionLines.map((line) => (
                          <p key={`${item.id}-${line}`} className="text-xs text-gray-500 truncate">{line}</p>
                        ))}
                        <p className="text-xs text-gray-500">x{quantity} • {formatPrice(unitPrice, lineCurrency)} / sản phẩm</p>
                      </div>
                      <span className="font-semibold text-sm text-gray-900 flex-shrink-0">
                        {formatPrice(unitPrice * quantity, lineCurrency)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-4 bg-gray-50 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tạm tính</span><span>{formattedTotal}</span>
                </div>
                {requiresShippingInfo && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Phí vận chuyển ({shippingCarrier === 'ghn' ? 'GHN' : 'Viettel Post'})</span>
                    {shippingLoading ? <span className="text-gray-400">Đang tính...</span>
                      : shippingFee !== null ? <span className="text-blue-600 font-medium">{formatPrice(shippingFee, currency)}</span>
                      : <span className="text-gray-400">Chưa tính</span>}
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-lg border-t border-gray-200 pt-2">
                  <span>Tổng cộng</span>
                  <span className="text-primary-600">{formattedGrandTotal}</span>
                </div>
              </div>
            </div>

            {/* Ghi chú */}
            <div className="order-3 bg-white rounded-xl shadow-sm p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú đơn hàng (tuỳ chọn)</label>
              <textarea value={orderNote} onChange={e => setOrderNote(e.target.value)}
                placeholder="Màu sắc, phiên bản, yêu cầu giao hàng..." rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            </div>

            {/* Thanh toán */}
            <div className="order-4 bg-white rounded-xl shadow-sm p-5 space-y-3">
              <h2 className="font-bold text-gray-900">Phương thức thanh toán</h2>
              <div className="space-y-3">
                {(['cod', 'banking', 'momo'] as PaymentMethod[]).map(method => (
                  <button key={method} type="button" onClick={() => setPaymentMethod(method)}
                    className={`w-full text-left border rounded-lg px-4 py-3 transition-colors ${
                      paymentMethod === method
                        ? method === 'momo' ? 'border-pink-300 bg-pink-50' : 'border-primary-300 bg-primary-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                    {method === 'cod' && <><p className="text-sm font-medium text-gray-900">Thanh toán khi nhận hàng (COD)</p><p className="text-xs text-gray-600 mt-1">Thanh toán tiền mặt khi nhận hàng.</p></>}
                    {method === 'banking' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-gray-900">Chuyển khoản ngân hàng</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">QR sẵn sàng</span>
                        </div>
                        <p className="text-xs text-gray-600">Quét QR và chuyển khoản đúng nội dung để đối soát tự động.</p>
                      </div>
                    )}
                    {method === 'momo' && (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2"><span className="text-pink-600 text-lg">💳</span><p className="text-sm font-medium text-gray-900">Ví MoMo</p></div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Bạn sẽ xử lý sau</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {orderError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {orderError}
                </div>
              )}

              <button onClick={handleConfirmOrder} disabled={switchingCheckoutMode || placingOrder || momoLoading || confirmLoading || creatingBankingOrder || (requiresShippingInfo && shippingLoading) || !isAddressComplete || !hasShippingFee}
                className={`w-full font-bold py-3 rounded-xl transition-colors text-white ${
                  paymentMethod === 'momo'
                    ? 'bg-pink-600 hover:bg-pink-700'
                    : paymentMethod === 'banking'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-primary-600 hover:bg-primary-700'
                } disabled:opacity-60 disabled:cursor-not-allowed`}>
                {switchingCheckoutMode
                  ? 'Đang đồng bộ chế độ thanh toán...'
                  : confirmLoading
                  ? 'Đang tạo đơn...'
                  : placingOrder
                    ? 'Đang xử lý...'
                  : creatingBankingOrder
                    ? 'Đang tạo mã chuyển khoản...'
                    : momoLoading
                      ? 'Đang tạo QR...'
                      : paymentMethod === 'banking'
                        ? 'Theo dõi thanh toán (Chuyển khoản ngân hàng)'
                        : `Xác nhận đặt hàng (${paymentMethodLabel[paymentMethod]})`}
              </button>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-6 text-sm text-gray-700 space-y-3">
              {paymentMethod === 'cod' && (
                <>
                  <h3 className="font-bold text-gray-900">{paymentMethodLabel[paymentMethod]}</h3>
                  <p>{paymentMethodDescription[paymentMethod]}</p>
                </>
              )}
              {paymentMethod === 'momo' && momoQR ? (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">💜</span>
                    <h3 className="font-bold text-pink-600 text-lg">Quét mã QR để thanh toán</h3>
                  </div>
                  <div className="border-4 border-pink-200 rounded-2xl p-4 inline-block bg-white">
                    <QRCode value={momoQR} size={192} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} />
                  </div>
                  <p className="text-xs text-gray-500">Mở app MoMo → Quét mã → Xác nhận thanh toán</p>
                  <div className="bg-pink-50 rounded-lg p-3 text-left space-y-1">
                    <p className="text-xs font-semibold text-pink-700">Số tiền: {formattedGrandTotal}</p>
                    <p className="text-xs text-gray-500">Mã đơn: {orderId}</p>
                  </div>
                  <button onClick={async () => {
                    setMomoQR(null);
                    setShippingOrderCode(null);
                    setOrderPlaced(true);
                  }} className="w-full bg-pink-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-pink-700 transition-colors">
                    Tôi đã thanh toán xong
                  </button>
                </div>
              ) : paymentMethod === 'momo' && !momoQR ? (
                <div className="text-center space-y-3">
                  <span className="text-4xl">💜</span>
                  <h3 className="font-bold text-pink-600">Ví MoMo</h3>
                  <p className="text-gray-600 text-xs">Bấm <strong>Xác nhận đặt hàng</strong> để tạo mã QR thanh toán.</p>
                  {momoError && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-red-600 text-xs">{momoError}</p></div>}
                </div>
              ) : paymentMethod === 'banking' ? (
                <div className="space-y-3">
                  {!internalOrder ? (
                    <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      {switchingCheckoutMode
                        ? 'Đang đồng bộ chế độ thanh toán lẻ/tổng. Vui lòng đợi QR mới trước khi quét.'
                        : <>Nhấn <strong>Theo dõi thanh toán</strong> để tạo mã chuyển khoản.</>}
                    </div>
                  ) : (
                    <>
                      <div className="border border-emerald-200 rounded-xl p-3 bg-emerald-50/30">
                        {bankingQrUrl ? (
                          <img
                            src={bankingQrUrl}
                            alt="QR chuyển khoản ngân hàng"
                            className="w-full max-w-[360px] mx-auto object-contain rounded-lg border border-emerald-200 bg-white p-2"
                          />
                        ) : (
                          <div className="text-xs text-gray-500 text-center py-8">Chưa có mã QR thanh toán</div>
                        )}
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-gray-500">Ngân hàng</span>
                          <span className="font-semibold text-gray-900">{resolvedBankName || 'Chưa cấu hình'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-gray-500">Số tài khoản</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{resolvedBankAccountNo || 'Chưa cấu hình'}</span>
                            {resolvedBankAccountNo && (
                              <button
                                type="button"
                                onClick={() => copyText(resolvedBankAccountNo, 'account')}
                                className="px-2 py-0.5 rounded border border-gray-300 text-[10px] font-semibold hover:bg-white"
                              >
                                {copiedField === 'account' ? 'Đã copy' : 'Copy'}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-gray-500">Chủ tài khoản</span>
                          <span className="font-semibold text-gray-900">{resolvedBankAccountName || 'Chưa cấu hình'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-gray-500">Số tiền</span>
                          <span className="font-semibold text-primary-700">{formatPrice(qrAmount, internalOrder.currency || currency)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-gray-500">Nội dung CK</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{transferContent || 'Đang tạo mã'}</span>
                            {transferContent && (
                              <button
                                type="button"
                                onClick={() => copyText(transferContent, 'content')}
                                className="px-2 py-0.5 rounded border border-gray-300 text-[10px] font-semibold hover:bg-white"
                              >
                                {copiedField === 'content' ? 'Đã copy' : 'Copy'}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-gray-500">Trạng thái</span>
                          <span className={`font-semibold ${internalOrder.status === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {internalOrder.status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                          </span>
                        </div>

                        {internalOrder.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => void checkPaymentStatus(internalOrder.id)}
                            disabled={checkingPayment}
                            className="w-full mt-2 bg-emerald-600 text-white font-semibold py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
                          >
                            {checkingPayment ? 'Đang kiểm tra giao dịch...' : 'Thanh toán đã hoàn tất'}
                          </button>
                        )}

                        {internalOrder.paymentStatusMessage && (
                          <p className="text-[11px] text-gray-500">{internalOrder.paymentStatusMessage}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <></>
              )}

              {isAddressComplete && paymentMethod === 'cod' && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-1 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700">📦 Giao đến:</p>
                  <p className="text-xs text-gray-600">{fullName} — {phone}</p>
                  <p className="text-xs text-gray-600">{address}, {selectedWardName}, {selectedDistrictName}, {selectedProvinceName}</p>
                </div>
              )}
              {paymentMethod !== 'momo' && <p className="text-xs text-gray-500">Đơn hàng sẽ được xử lý trong 24 giờ làm việc sau khi đặt hàng.</p>}
            </div>
            <Link href="/cart" className="block text-center text-sm text-gray-500 hover:text-gray-700 underline">Quay lại giỏ hàng</Link>
          </div>
        </div>
      </div>
    </div>
  );
}