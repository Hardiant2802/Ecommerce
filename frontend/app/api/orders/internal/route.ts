import { NextRequest, NextResponse } from 'next/server';
import {
  cancelStalePendingOrders,
  createInternalOrder,
  getInternalOrder,
  listInternalOrders,
  markInternalOrderPaid,
  updateInternalOrder,
} from '@/lib/services/internalOrders';
import { syncInternalOrderToMagento } from '@/lib/services/magentoSync';
import { syncPaidOrderToMagentoRealtime } from '@/lib/services/magentoRealtimeSync';
import { findMatchingSePayTransaction } from '@/lib/services/sepayClient';
import {
  CreateInternalOrderInput,
  InternalOrder,
  InternalOrderItem,
  InternalPaymentMethod,
} from '@/types/order';

export const runtime = 'nodejs';

interface CreateOrderBody {
  paymentMethod: InternalPaymentMethod;
  amount: number;
  currency: string;
  note?: string;
  customerEmail?: string;
  items: InternalOrderItem[];
  vnpayTxnId?: string;
}

function isValidPaymentMethod(method: string): method is InternalPaymentMethod {
  return method === 'cod' || method === 'banking' || method === 'momo' || method === 'vnpay';
}

function sanitizeItems(items: unknown): InternalOrderItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const sku = typeof item?.sku === 'string' ? item.sku.trim() : '';
      const name = typeof item?.name === 'string' ? item.name.trim() : '';
      const quantity = Number(item?.quantity || 0);
      const unitPrice = Number(item?.unitPrice || 0);
      const rowTotal = Number(item?.rowTotal || unitPrice * quantity);

      if (!sku || !name || !Number.isFinite(quantity) || quantity <= 0) return null;
      if (!Number.isFinite(unitPrice) || unitPrice < 0) return null;
      if (!Number.isFinite(rowTotal) || rowTotal < 0) return null;

      return {
        sku,
        name,
        quantity: Math.floor(quantity),
        unitPrice,
        rowTotal,
      };
    })
    .filter((item): item is InternalOrderItem => !!item);
}

function resolveOrderAmount(baseAmount: number, paymentMethod: InternalPaymentMethod): number {
  if (paymentMethod !== 'banking') {
    return baseAmount;
  }

  const forced = Number(process.env.SEPAY_TEST_AMOUNT_VND || 0);
  if (Number.isFinite(forced) && forced > 0) {
    return forced;
  }

  return baseAmount;
}

function isAdminAuthorized(request: NextRequest): boolean {
  const expectedKeys = [
    process.env.INTERNAL_ORDERS_ADMIN_KEY || '',
    process.env.INTERNAL_ADMIN_KEY || '',
  ]
    .join(',')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (expectedKeys.length === 0) return true;

  const fromHeader = (request.headers.get('x-admin-key') || '').trim();
  const fromQuery = (request.nextUrl.searchParams.get('adminKey') || '').trim();
  const provided = fromHeader || fromQuery;

  return expectedKeys.includes(provided);
}

function shouldReconcilePending(request: NextRequest): boolean {
  const raw = (request.nextUrl.searchParams.get('reconcilePending') || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  const value = Number(raw || fallback);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

function isTruthy(raw: string | null): boolean {
  const value = (raw || '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

function normalizeEmail(raw: string | null | undefined): string {
  return String(raw || '').trim().toLowerCase();
}

function filterOrdersByQuery(orders: InternalOrder[], request: NextRequest): InternalOrder[] {
  const customerEmail = normalizeEmail(request.nextUrl.searchParams.get('customerEmail'));
  const paidOnly = isTruthy(request.nextUrl.searchParams.get('paidOnly'));

  return orders.filter((order) => {
    if (customerEmail && normalizeEmail(order.customerEmail) !== customerEmail) {
      return false;
    }

    if (paidOnly && order.status !== 'paid') {
      return false;
    }

    return true;
  });
}

function isDuplicateTransactionReason(reason?: string): boolean {
  if (!reason) return false;
  return reason === 'DUPLICATE_TRANSACTION' || reason.startsWith('TRANSACTION_ALREADY_USED:');
}

async function ensureMagentoSynced(order: InternalOrder): Promise<InternalOrder | null> {
  return syncPaidOrderToMagentoRealtime(order);
}

async function reconcileOrder(order: InternalOrder, now: number) {
  if (order.paymentMethod !== 'banking') {
    return { orderId: order.id, status: 'skipped', reason: 'PAYMENT_METHOD_NOT_BANKING' };
  }

  if (order.status === 'paid') {
    const synced = await ensureMagentoSynced(order);
    return {
      orderId: order.id,
      status: 'skipped',
      reason: 'ALREADY_PAID',
      paymentStatusMessage: synced?.paymentStatusMessage || order.paymentStatusMessage,
    };
  }

  const lookup = await findMatchingSePayTransaction(order);
  const matched = lookup.transaction;

  if (!matched) {
    const refreshed = await updateInternalOrder(order.id, {
      lastPaymentCheckedAt: now,
      paymentStatusMessage: lookup.error
        ? `Không thể kết nối SePay: ${lookup.error}`
        : undefined,
    });

    return {
      orderId: order.id,
      status: 'not_found',
      reason: lookup.error || 'MATCH_NOT_FOUND',
      transactionsScanned: lookup.transactionsScanned,
      paymentStatusMessage: refreshed?.paymentStatusMessage || order.paymentStatusMessage,
    };
  }

  const paymentResult = await markInternalOrderPaid({
    paymentCode: order.paymentCode,
    transferAmount: matched.amount,
    gatewayTransactionId: matched.id,
  });

  const effectiveOrder = paymentResult.order || order;
  if (paymentResult.reason && paymentResult.reason.startsWith('AMOUNT_NOT_ENOUGH:')) {
    return {
      orderId: effectiveOrder.id,
      status: 'underpaid',
      reason: paymentResult.reason,
      transactionId: matched.id,
      amount: matched.amount,
      paymentStatusMessage: effectiveOrder.paymentStatusMessage,
    };
  }

  if (paymentResult.reason === 'ALREADY_PAID' || isDuplicateTransactionReason(paymentResult.reason)) {
    const synced = await ensureMagentoSynced(effectiveOrder);
    const finalOrder = synced || effectiveOrder;
    return {
      orderId: finalOrder.id,
      status: 'duplicate',
      reason: paymentResult.reason,
      transactionId: matched.id,
      amount: matched.amount,
      paymentStatusMessage: finalOrder.paymentStatusMessage,
    };
  }

  const synced = await ensureMagentoSynced(effectiveOrder);
  const finalOrder = synced || effectiveOrder;
  return {
    orderId: finalOrder.id,
    status: 'matched',
    transactionId: matched.id,
    amount: matched.amount,
    paymentStatusMessage: finalOrder.paymentStatusMessage,
  };
}

export async function GET(request: NextRequest) {
  const adminAuthorized = isAdminAuthorized(request);
  const customerEmail = normalizeEmail(request.nextUrl.searchParams.get('customerEmail'));
  const paidOnly = isTruthy(request.nextUrl.searchParams.get('paidOnly'));

  if (!adminAuthorized && !customerEmail) {
    return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 401 });
  }

  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || 50);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(200, Math.floor(requestedLimit))) : 50;

  const now = Date.now();
  const allOrdersResult = await cancelStalePendingOrders(await listInternalOrders(limit), now);
  const allOrders = allOrdersResult.orders;
  const orders = filterOrdersByQuery(allOrders, request);

  if (!adminAuthorized || !shouldReconcilePending(request)) {
    return NextResponse.json({ orders });
  }

  const requestedOrderId = (request.nextUrl.searchParams.get('orderId') || '').trim();
  const reconcileLimit = Math.max(1, Math.min(10, parsePositiveInt(request.nextUrl.searchParams.get('reconcileLimit'), 3)));
  const lookbackMinutes = parsePositiveInt(request.nextUrl.searchParams.get('lookbackMinutes'), 24 * 60);
  const createdAfter = now - lookbackMinutes * 60 * 1000;

  const targets = requestedOrderId
    ? [] as InternalOrder[]
    : allOrders
      .filter((order) => {
        if (order.paymentMethod !== 'banking') return false;
        if (order.status === 'paid') return false;
        return order.createdAt >= createdAfter;
      })
      .slice(0, reconcileLimit);

  if (requestedOrderId) {
    const targetOrder = await getInternalOrder(requestedOrderId);
    if (targetOrder) {
      targets.push(targetOrder);
    }
  }

  const results = [] as Array<Record<string, unknown>>;
  for (const order of targets) {
    try {
      const item = await reconcileOrder(order, now);
      results.push(item);
    } catch (error) {
      results.push({
        orderId: order.id,
        status: 'error',
        reason: error instanceof Error ? error.message : 'UNKNOWN_RECONCILE_ERROR',
      });
    }
  }

  const refreshedOrders = filterOrdersByQuery(await listInternalOrders(limit), request);

  return NextResponse.json({
    orders: refreshedOrders,
    reconcile: {
      total: results.length,
      matched: results.filter((item) => item.status === 'matched').length,
      notFound: results.filter((item) => item.status === 'not_found').length,
      underpaid: results.filter((item) => item.status === 'underpaid').length,
      duplicate: results.filter((item) => item.status === 'duplicate').length,
      skipped: results.filter((item) => item.status === 'skipped').length,
      error: results.filter((item) => item.status === 'error').length,
      results,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateOrderBody;
    const paymentMethod = body?.paymentMethod;

    if (!paymentMethod || !isValidPaymentMethod(paymentMethod)) {
      return NextResponse.json({ error: 'Phương thức thanh toán không hợp lệ.' }, { status: 400 });
    }

    const sanitizedItems = sanitizeItems(body.items);
    if (sanitizedItems.length === 0) {
      return NextResponse.json({ error: 'Đơn hàng không có sản phẩm hợp lệ.' }, { status: 400 });
    }

    const currency = typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim() : 'VND';
    const amountFromItems = sanitizedItems.reduce((sum, item) => sum + item.rowTotal, 0);
    const amountFromClient = Number(body.amount || 0);
    const baseAmount = amountFromClient > 0 ? amountFromClient : amountFromItems;
    const normalizedAmount = resolveOrderAmount(Math.max(0, Math.round(baseAmount)), paymentMethod);

    if (normalizedAmount <= 0) {
      return NextResponse.json({ error: 'Số tiền thanh toán không hợp lệ.' }, { status: 400 });
    }

    const input: CreateInternalOrderInput = {
      paymentMethod,
      amount: normalizedAmount,
      currency,
      note: typeof body.note === 'string' ? body.note.trim() : undefined,
      customerEmail: typeof body.customerEmail === 'string' ? body.customerEmail.trim() : undefined,
      items: sanitizedItems,
    };

    let order = await createInternalOrder(input);

    // COD orders are synced to Magento immediately so admin can see new orders in near realtime.
    if (paymentMethod === 'cod') {
      order = (await updateInternalOrder(order.id, {
        magentoSyncStatus: 'queued',
        magentoSyncError: undefined,
      })) || order;

      const syncResult = await syncInternalOrderToMagento(order);
      if (!syncResult.success) {
        order = (await updateInternalOrder(order.id, {
          magentoSyncStatus: 'failed',
          magentoSyncError: syncResult.error || 'Magento sync failed',
        })) || order;
      } else {
        order = (await updateInternalOrder(order.id, {
          magentoSyncStatus: 'success',
          magentoOrderNumber: syncResult.orderNumber || order.magentoOrderNumber,
          magentoQuoteId: syncResult.quoteId || order.magentoQuoteId,
          magentoSyncError: undefined,
          paymentStatusMessage:
            order.paymentStatusMessage || 'Don COD da duoc dong bo vao Magento.',
        })) || order;
      }
    }

    // VNPAY: đánh dấu paid ngay (frontend đã nhận callback success từ VNPAY)
    // và sync Magento giống flow banking sau khi đối soát SePay
    if (paymentMethod === 'vnpay') {
      const vnpayTxnId = typeof body.vnpayTxnId === 'string' ? body.vnpayTxnId.trim() : '';
      const paidUpdate = await updateInternalOrder(order.id, {
        status: 'paid',
        sepayTransactionId: vnpayTxnId || `VNPAY-${order.id}`,
        lastPaymentAmountReceived: order.amount,
        lastPaymentCheckedAt: Date.now(),
        paidAt: Date.now(),
        paymentStatusMessage: vnpayTxnId
          ? `Thanh toán VNPAY thành công. Mã GD: ${vnpayTxnId}`
          : 'Thanh toán VNPAY thành công.',
      });

      if (paidUpdate) {
        order = paidUpdate;
      }

      // Sync sang Magento (tạo order + invoice + chuyển status pending → processing)
      const synced = await syncPaidOrderToMagentoRealtime(order);
      if (synced) {
        order = synced;
      }
    }

    return NextResponse.json({
      order,
    });
  } catch (error) {
    console.error('Create internal order failed:', error);

    if (error instanceof Error && error.message === 'SEPAY_EXPECTED_ACCOUNT_NUMBER_NOT_CONFIGURED') {
      return NextResponse.json({
        error: 'Chưa cấu hình SEPAY_EXPECTED_ACCOUNT_NUMBER. Không thể tạo QR chuyển khoản để đối soát SePay.',
      }, { status: 400 });
    }

    if (error instanceof Error && error.message === 'SEPAY_RECEIVING_ACCOUNT_NOT_CONFIGURED') {
      return NextResponse.json({
        error: 'Chưa cấu hình tài khoản nhận tiền SePay. Không thể tạo QR chuyển khoản.',
      }, { status: 400 });
    }

    return NextResponse.json({ error: 'Không thể tạo đơn hàng nội bộ.' }, { status: 500 });
  }
}
