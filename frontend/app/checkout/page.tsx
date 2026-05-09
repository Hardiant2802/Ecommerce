'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart, useAuth } from '@/lib/hooks';
import { formatPrice } from '@/lib/utils/formatters';

type PaymentMethod = 'cod' | 'banking' | 'momo';
type SingleCheckoutMode = 'single' | 'total';

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

function formatCountdown(ms: number): string {
  const safeSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
  const { cart, loading } = useCart();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [orderNote, setOrderNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('banking');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [creatingBankingOrder, setCreatingBankingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [internalOrder, setInternalOrder] = useState<InternalOrderSummary | null>(null);
  const [showPaidNotice, setShowPaidNotice] = useState(false);
  const [copiedField, setCopiedField] = useState<'account' | 'content' | null>(null);
  const [previewOrderId] = useState(() => `ORD-${Date.now().toString(36).toUpperCase()}`);
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const creatingBankingOrderRef = useRef(false);
  const internalOrderScopeRef = useRef<string>('');
  const cartSyncedPaidOrderRef = useRef<string>('');

  const paymentMethodLabel: Record<PaymentMethod, string> = {
    cod: 'Thanh toán khi nhận hàng (COD)',
    banking: 'Chuyển khoản ngân hàng',
    momo: 'Ví MoMo',
  };

  const paymentMethodDescription: Record<PaymentMethod, string> = {
    cod: 'Bạn thanh toán bằng tiền mặt khi shipper giao hàng đến tay.',
    banking: 'Quét QR để chuyển khoản nhanh. Đơn sẽ được xác nhận tự động sau khi hệ thống nhận giao dịch.',
    momo: 'Tạm thời ghi nhận lựa chọn ví MoMo. Bạn sẽ tích hợp quét QR/điều hướng thanh toán sau.',
  };

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
  const formattedTotal = formatPrice(orderTotal, currency);
  const checkoutFingerprint = [
    itemId || 'all',
    sku || 'any-sku',
    currency,
    Math.round(orderTotal),
    checkoutItems
      .map((item) => {
        const quantity = resolveCheckoutItemQuantity(item.quantity);
        const unitPrice = resolveCheckoutUnitPrice(item);
        return `${item.id}:${quantity}:${Math.round(unitPrice)}:${item.product.sku}`;
      })
      .join('|'),
    singleCheckoutMode,
  ].join('::');
  const bankName = process.env.NEXT_PUBLIC_BANK_NAME || 'Ngân hàng của bạn';
  const bankAccountNo = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NO || '';
  const bankAccountName = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || '';
  const activeOrderId = internalOrder?.id || previewOrderId;
  const transferContent = (internalOrder?.paymentCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const qrAmount = Math.max(0, Math.round(internalOrder?.amount ?? orderTotal));
  const resolvedBankName = internalOrder?.bankName || bankName;
  const resolvedBankAccountNo = internalOrder?.bankAccountNo || bankAccountNo;
  const resolvedBankAccountName = internalOrder?.bankAccountName || bankAccountName;
  const sepayBankCode = (process.env.NEXT_PUBLIC_SEPAY_BANK_CODE || resolvedBankName || 'BIDV').trim();
  const bankingQrUrl =
    ((internalOrder && resolvedBankAccountNo && sepayBankCode
      ? `https://qr.sepay.vn/img?acc=${encodeURIComponent(resolvedBankAccountNo)}&bank=${encodeURIComponent(sepayBankCode)}&amount=${qrAmount}&des=${encodeURIComponent(transferContent)}`
      : internalOrder?.qrUrl || ''));
  const qrCreatedAt = internalOrder?.createdAt || 0;
  const qrExpireAt = qrCreatedAt > 0 ? qrCreatedAt + QR_EXPIRE_MS : 0;
  const qrRemainingMs = qrExpireAt > 0 ? Math.max(0, qrExpireAt - countdownNow) : QR_EXPIRE_MS;
  const qrIsExpired = Boolean(internalOrder && internalOrder.status !== 'paid' && qrExpireAt > 0 && qrRemainingMs <= 0);
  const qrCountdownText = formatCountdown(qrRemainingMs);

  const copyText = async (value: string, field: 'account' | 'content') => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        return;
      }
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1600);
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

    params.set('payment', 'banking');
    params.set('mode', mode);
    params.set('buyAgain', '1');
    return `/checkout?${params.toString()}`;
  }, [itemId, sku]);

  const handleSwitchSingleCheckoutMode = (mode: SingleCheckoutMode) => {
    if (!isSingleProductCheckout) {
      return;
    }

    setOrderPlaced(false);
    setOrderError(null);
    setInternalOrder(null);
    setShowPaidNotice(false);
    clearStoredBankingOrder();
    router.push(buildSingleCheckoutUrl(mode));
  };

  const buildItemsPayload = useCallback((): InternalOrderItemPayload[] => {
    return checkoutItems.map((item) => {
      const quantity = resolveCheckoutItemQuantity(item.quantity);
      const unitPrice = resolveCheckoutUnitPrice(item);

      return {
        sku: item.product.sku,
        name: item.product.name,
        quantity,
        unitPrice,
        rowTotal: unitPrice * quantity,
      };
    });
  }, [checkoutItems, resolveCheckoutItemQuantity]);

  const refreshOrderStatus = useCallback(async (orderId: string): Promise<InternalOrderSummary | null> => {
    try {
      const response = await fetch(`/api/orders/internal/${encodeURIComponent(orderId)}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) return null;
      const data = (await response.json()) as { order?: InternalOrderSummary };
      if (data.order) {
        setInternalOrder(data.order);
        internalOrderScopeRef.current = checkoutFingerprint;
        writeStoredBankingOrder(data.order.id, checkoutFingerprint);
        return data.order;
      }
      return null;
    } catch (error) {
      console.error('Refresh order status failed:', error);
      return null;
    }
  }, [checkoutFingerprint]);

  const createBankingOrder = useCallback(async (): Promise<InternalOrderSummary | null> => {
    if (internalOrder) return internalOrder;
    if (creatingBankingOrderRef.current) return null;

    creatingBankingOrderRef.current = true;
    setCreatingBankingOrder(true);
    setOrderError(null);

    try {
      const response = await fetch('/api/orders/internal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethod: 'banking',
          amount: orderTotal,
          currency,
          note: orderNote,
          customerEmail: user?.email,
          items: buildItemsPayload(),
        }),
      });

      const data = (await response.json()) as { order?: InternalOrderSummary; error?: string };

      if (!response.ok || !data.order) {
        throw new Error(data.error || 'Không thể tạo mã thanh toán.');
      }

      setInternalOrder(data.order);
      internalOrderScopeRef.current = checkoutFingerprint;
      writeStoredBankingOrder(data.order.id, checkoutFingerprint);
      return data.order;
    } catch (error) {
      console.error('Create banking order failed:', error);
      setOrderError(error instanceof Error ? error.message : 'Không thể tạo mã thanh toán.');
      return null;
    } finally {
      creatingBankingOrderRef.current = false;
      setCreatingBankingOrder(false);
    }
  }, [buildItemsPayload, checkoutFingerprint, currency, internalOrder, orderNote, orderTotal, user?.email]);

  const checkPaymentStatus = useCallback(async (orderId: string): Promise<InternalOrderSummary | null> => {
    try {
      const response = await fetch(`/api/orders/internal/${encodeURIComponent(orderId)}/check-payment`, {
        method: 'POST',
        cache: 'no-store',
      });

      if (!response.ok) {
        return refreshOrderStatus(orderId);
      }

      const data = (await response.json()) as { order?: InternalOrderSummary };
      if (data.order) {
        setInternalOrder(data.order);
        return data.order;
      }

      return refreshOrderStatus(orderId);
    } catch (error) {
      console.error('Proactive payment check failed:', error);
      return refreshOrderStatus(orderId);
    }
  }, [refreshOrderStatus]);

  useEffect(() => {
    if (authLoading || loading || isEmpty || checkoutItems.length === 0 || paymentMethod !== 'banking' || internalOrder) {
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
  }, [authLoading, loading, isEmpty, checkoutItems.length, checkoutFingerprint, createBankingOrder, forceNewOrder, internalOrder, paymentMethod, refreshOrderStatus]);

  useEffect(() => {
    if (paymentMethod !== 'banking' || internalOrder?.status !== 'paid') {
      return;
    }

    // Do not reuse a paid banking order in next checkout attempt.
    clearStoredBankingOrder();
  }, [paymentMethod, internalOrder?.id, internalOrder?.status]);

  useEffect(() => {
    if (!internalOrder) {
      internalOrderScopeRef.current = '';
      return;
    }

    const scopedFingerprint = internalOrderScopeRef.current;
    if (!scopedFingerprint || scopedFingerprint === checkoutFingerprint) {
      return;
    }

    // Prevent reusing a banking order created for a different checkout item set.
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

    const paidUnits = resolveCheckoutItemQuantity(selectedItem.quantity);
    writePendingCartSync({
      orderId: paidOrderId,
      itemId: selectedItem.id,
      itemUid: selectedItem.uid,
      sku: selectedItem.product.sku,
      paidUnits,
      savedAt: Date.now(),
    });
  }, [
    paymentMethod,
    internalOrder?.id,
    internalOrder?.status,
    isSingleProductCheckout,
    checkoutItems,
    resolveCheckoutItemQuantity,
  ]);

  useEffect(() => {
    if (paymentMethod !== 'banking' || !internalOrder?.id || internalOrder.status !== 'pending') {
      return;
    }

    let cancelled = false;
    const poll = async () => {
      const next = await checkPaymentStatus(internalOrder.id);
      if (cancelled || !next) return;
    };

    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [checkPaymentStatus, paymentMethod, internalOrder?.id, internalOrder?.status]);

  const handlePlaceOrder = async () => {
    setOrderError(null);

    if (paymentMethod !== 'banking') {
      setOrderPlaced(true);
      return;
    }

    try {
      setPlacingOrder(true);

      const preparedOrder = internalOrder || (await createBankingOrder());
      if (!preparedOrder) {
        throw new Error('Không thể tạo mã thanh toán.');
      }

      setOrderPlaced(true);
    } catch (error) {
      console.error('Place order failed:', error);
      setOrderError(error instanceof Error ? error.message : 'Không thể tạo đơn hàng thanh toán.');
    } finally {
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
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-custom text-center py-20">
          <p className="text-gray-600 mb-4">Giỏ hàng của bạn đang trống.</p>
          <Link href="/" className="text-primary-600 underline">Tiếp tục mua sắm</Link>
        </div>
      </div>
    );
  }

  const paidNoticeNode = showPaidNotice && paymentMethod === 'banking' && internalOrder?.status === 'paid' ? (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl">
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 shadow-lg px-4 py-3 text-emerald-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Đã xác nhận thanh toán</p>
            <p className="text-xs mt-1">{internalOrder.paymentStatusMessage || 'Hệ thống đã nhận giao dịch thanh toán của bạn.'}</p>
            {internalOrder.sepayTransactionId && (
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
    const isPaid = paymentMethod === 'banking' && internalOrder?.status === 'paid';
    const receivedAmount = internalOrder?.lastPaymentAmountReceived || 0;
    const expectedAmount = internalOrder?.amount || qrAmount;
    const isUnderpaid = paymentMethod === 'banking' && !isPaid && receivedAmount > 0 && receivedAmount < expectedAmount;
    const remainingAmount = isUnderpaid ? expectedAmount - receivedAmount : 0;

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        {paidNoticeNode}
        <div className="container-custom">
          <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isPaid ? 'bg-green-100' : 'bg-amber-100'}`}>
              {isPaid ? (
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l2 2m6-2a8 8 0 11-16 0 8 8 0 0116 0z" />
                </svg>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isPaid ? 'Thanh toán thành công!' : 'Đơn hàng đã được tạo'}
            </h2>
            <p className="text-gray-600 mb-1">
              Mã đơn hàng: <strong className="text-primary-700">{activeOrderId}</strong>
            </p>
            <p className="text-gray-600 mb-6 text-sm">
              {paymentMethod === 'banking'
                ? isPaid
                  ? 'Hệ thống đã nhận giao dịch chuyển khoản. Đơn hàng sẽ được đồng bộ sang Magento.'
                  : 'Đang chờ giao dịch chuyển khoản. Vui lòng chuyển đúng nội dung để xác nhận tự động.'
                : `Bạn đã chọn ${paymentMethodLabel[paymentMethod].toLowerCase()}. Chúng tôi sẽ liên hệ xác nhận sớm nhất.`}
            </p>

            {paymentMethod === 'banking' && !isPaid && (
              <div className={`text-left rounded-lg border px-4 py-3 mb-4 text-sm ${isUnderpaid ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-sky-200 bg-sky-50 text-sky-800'}`}>
                <p className="font-semibold">
                  {isUnderpaid ? 'Đã nhận giao dịch nhưng chưa đủ số tiền' : 'Hệ thống đang đợi SePay xác nhận giao dịch'}
                </p>
                {isUnderpaid && (
                  <p className="mt-1">
                    Còn thiếu: <strong>{formatPrice(remainingAmount, internalOrder?.currency || currency)}</strong>
                  </p>
                )}
              </div>
            )}

            {paymentMethod === 'banking' && (
              <div className="text-left border border-gray-200 rounded-lg p-4 mb-6 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Nội dung CK</span>
                  <span className="font-semibold text-gray-900">{transferContent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Số tiền</span>
                  <span className="font-semibold text-primary-700">{formatPrice(qrAmount, internalOrder?.currency || currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Trạng thái</span>
                  <span className={`font-semibold ${isPaid ? 'text-green-600' : 'text-amber-600'}`}>
                    {isPaid ? 'Đã thanh toán' : 'Chờ thanh toán'}
                  </span>
                </div>
                {internalOrder?.sepayTransactionId && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mã GD SePay</span>
                    <span className="font-semibold text-emerald-700">{internalOrder.sepayTransactionId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Đã nhận</span>
                  <span className="font-semibold text-gray-900">
                    {formatPrice(receivedAmount, internalOrder?.currency || currency)}
                  </span>
                </div>
                {isUnderpaid && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Còn thiếu</span>
                    <span className="font-semibold text-amber-700">
                      {formatPrice(remainingAmount, internalOrder?.currency || currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Đồng bộ Magento</span>
                  <span className="font-semibold text-gray-900">{internalOrder?.magentoSyncStatus || 'not_started'}</span>
                </div>
              </div>
            )}

            <Link
              href="/"
              className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {paidNoticeNode}
      <div className="container-custom">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-primary-600">Trang chủ</Link>
          <span>/</span>
          <Link href="/cart" className="hover:text-primary-600">Giỏ hàng</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Thanh toán</span>
        </div>

        <h1 className="text-2xl font-bold mb-6">Thanh toán</h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: đơn hàng + ghi chú */}
          <div className="space-y-4">
            {/* Danh sách sản phẩm */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Đơn hàng của bạn</h2>
                {allowTotalForSingleItem && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSwitchSingleCheckoutMode('single')}
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
                  return (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="w-14 h-14 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                        <img
                          src={item.product.thumbnail?.url || '/images/placeholder.svg'}
                          alt={item.product.name}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => { e.currentTarget.src = '/images/placeholder.svg'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-500">x{quantity}</p>
                      </div>
                      <span className="font-semibold text-sm text-gray-900 flex-shrink-0">
                        {formatPrice(unitPrice * quantity, item.prices.row_total.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-4 bg-gray-50 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Vận chuyển</span>
                  <span className="text-green-600 font-medium">Miễn phí</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-lg border-t border-gray-200 pt-2">
                  <span>Tổng cộng</span>
                  <span className="text-primary-600">{formattedTotal}</span>
                </div>
              </div>
            </div>

            {/* Ghi chú */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ghi chú đơn hàng (tuỳ chọn)
              </label>
              <textarea
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="Màu sắc, phiên bản, yêu cầu giao hàng..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            {/* Phương thức thanh toán */}
            <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
              <h2 className="font-bold text-gray-900">Phương thức thanh toán</h2>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`w-full text-left border rounded-lg px-4 py-3 transition-colors ${
                    paymentMethod === 'cod' ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">Thanh toán khi nhận hàng (COD)</p>
                  <p className="text-xs text-gray-600 mt-1">Thanh toán tiền mặt khi nhận hàng.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('banking')}
                  className={`w-full text-left border rounded-lg px-4 py-3 transition-colors ${
                    paymentMethod === 'banking' ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">Chuyển khoản ngân hàng</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">QR sẵn sàng</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Quét QR và chuyển khoản đúng nội dung để đối soát tự động.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('momo')}
                  className={`w-full text-left border rounded-lg px-4 py-3 transition-colors ${
                    paymentMethod === 'momo' ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">Ví MoMo</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Bạn sẽ xử lý sau</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Đặt đơn với hình thức ví điện tử MoMo.</p>
                </button>
              </div>

              {orderError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {orderError}
                </div>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder || (paymentMethod === 'banking' && creatingBankingOrder)}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {placingOrder
                  ? 'Đang xử lý...'
                  : paymentMethod === 'banking'
                    ? creatingBankingOrder
                      ? 'Đang tạo mã thanh toán...'
                      : internalOrder?.status === 'paid'
                        ? 'Xem xác nhận thanh toán'
                        : `Theo dõi thanh toán (${paymentMethodLabel[paymentMethod]})`
                    : `Xác nhận đặt hàng (${paymentMethodLabel[paymentMethod]})`}
              </button>
            </div>
          </div>

          {/* Right: thông tin phương thức đã chọn */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-6 text-sm text-gray-700 space-y-3">
              <h3 className="font-bold text-gray-900">{paymentMethodLabel[paymentMethod]}</h3>
              <p>{paymentMethodDescription[paymentMethod]}</p>

              {paymentMethod === 'banking' && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-4">
                  <h4 className="font-semibold text-emerald-800">Quét QR để thanh toán</h4>

                  {!internalOrder ? (
                    <div className="text-xs text-sky-800 bg-sky-50 border border-sky-200 rounded-lg p-3">
                      Đang tạo mã thanh toán thực để đối soát. Vui lòng đợi hệ thống hiện QR và nội dung chuyển khoản rồi mới thanh toán.
                    </div>
                  ) : (
                    <>
                      {internalOrder.status !== 'paid' && (
                        <div
                          className={`text-xs rounded-lg border px-3 py-2 ${
                            qrIsExpired
                              ? 'border-amber-300 bg-amber-50 text-amber-900'
                              : 'border-sky-200 bg-sky-50 text-sky-800'
                          }`}
                        >
                          <p className="font-semibold">
                            {qrIsExpired ? 'QR đã hết hạn' : `QR sẽ hết hạn sau ${qrCountdownText}`}
                          </p>
                          <p className="mt-1">
                            {qrIsExpired
                              ? 'Vui lòng tải lại trang thanh toán để tạo QR mới.'
                              : 'Vui lòng hoàn tất chuyển khoản trước khi mã QR hết hạn để được xác nhận tự động.'}
                          </p>
                        </div>
                      )}

                      {bankingQrUrl ? (
                        <div className="bg-white border border-emerald-200 rounded-lg p-4 inline-block">
                          <img
                            src={bankingQrUrl}
                            alt="QR chuyển khoản ngân hàng"
                            className="w-72 h-72 md:w-[420px] md:h-[420px] object-contain"
                          />
                        </div>
                      ) : (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          Chưa cấu hình nhận tiền. Vui lòng thêm `NEXT_PUBLIC_BANK_BIN` và `NEXT_PUBLIC_BANK_ACCOUNT_NO` để hiển thị QR thật.
                        </div>
                      )}

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-gray-500">Ngân hàng</span>
                          <span className="font-semibold text-gray-900">{resolvedBankName}</span>
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
                          <span className="font-semibold text-primary-700">{formatPrice(qrAmount, internalOrder?.currency || currency)}</span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <span className="text-gray-500">Nội dung CK</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{transferContent}</span>
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
                          <span className={`font-semibold ${internalOrder.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                            {internalOrder.status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                          </span>
                        </div>

                        {internalOrder.sepayTransactionId && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-gray-500">Mã GD SePay</span>
                            <span className="font-semibold text-emerald-700">{internalOrder.sepayTransactionId}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3">
                          <span className="text-gray-500">Đã nhận</span>
                          <span className="font-semibold text-gray-900">
                            {formatPrice(internalOrder.lastPaymentAmountReceived || 0, internalOrder.currency || currency)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-500">
                Đơn hàng sẽ được xử lý trong 24 giờ làm việc sau khi đặt hàng.
              </p>
            </div>

            <Link
              href="/cart"
              className="block text-center text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Quay lại giỏ hàng
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
