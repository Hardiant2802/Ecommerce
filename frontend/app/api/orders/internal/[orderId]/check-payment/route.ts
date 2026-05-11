import { NextRequest, NextResponse } from 'next/server';
import {
  getInternalOrder,
  markInternalOrderPaid,
  updateInternalOrder,
} from '@/lib/services/internalOrders';
import { syncInternalOrderToMagento } from '@/lib/services/magentoSync';
import { findMatchingSePayTransaction } from '@/lib/services/sepayClient';
import type { InternalOrder } from '@/types/order';

export const runtime = 'nodejs';

interface RouteProps {
  params: Promise<{
    orderId: string;
  }>;
}

interface PerformCheckOptions {
  verifySePayHistory?: boolean;
}

const DEFAULT_CHECK_COOLDOWN_MS = 600;

function getCheckCooldownMs(): number {
  const raw = Number(process.env.SEPAY_CHECK_COOLDOWN_MS || DEFAULT_CHECK_COOLDOWN_MS);
  if (!Number.isFinite(raw) || raw < 0) return DEFAULT_CHECK_COOLDOWN_MS;
  return raw;
}

function triggerMagentoSync(order: InternalOrder): void {
  if (order.status !== 'paid') {
    return;
  }

  if (order.magentoSyncStatus === 'success') {
    return;
  }

  void syncInternalOrderToMagento(order)
    .then(async (syncResult) => {
      if (!syncResult.success) {
        await updateInternalOrder(order.id, {
          magentoSyncStatus: 'failed',
          magentoSyncError: syncResult.error || 'Magento sync failed',
        });
        return;
      }

      await updateInternalOrder(order.id, {
        magentoSyncStatus: 'success',
        magentoOrderNumber: syncResult.orderNumber || order.magentoOrderNumber,
        magentoQuoteId: syncResult.quoteId || order.magentoQuoteId,
        magentoSyncError: undefined,
      });
    })
    .catch((error) => {
      console.error('Background Magento sync failed:', error);
    });
}

function isDuplicateTransactionReason(reason?: string): boolean {
  if (!reason) return false;
  return reason === 'DUPLICATE_TRANSACTION' || reason.startsWith('TRANSACTION_ALREADY_USED:');
}

function normalizeKey(raw: string): string {
  const value = (raw || '').trim();
  if (!value) return '';

  if (value.toLowerCase().startsWith('apikey ')) {
    return value.slice(7).trim();
  }

  if (value.toLowerCase().startsWith('bearer ')) {
    return value.slice(7).trim();
  }

  return value;
}

function readProvidedKey(request: NextRequest): string {
  const fromHeader = normalizeKey(request.headers.get('x-admin-key') || '');
  if (fromHeader) return fromHeader;

  const fromAuth = normalizeKey(request.headers.get('authorization') || '');
  if (fromAuth) return fromAuth;

  const fromQuery = normalizeKey(request.nextUrl.searchParams.get('adminKey') || '');
  if (fromQuery) return fromQuery;

  return '';
}

function isInternalAdminAuthorized(request: NextRequest): boolean {
  const allowedKeys = [
    process.env.INTERNAL_ORDERS_ADMIN_KEY || '',
    process.env.INTERNAL_ADMIN_KEY || '',
  ]
    .join(',')
    .split(',')
    .map((item) => normalizeKey(item))
    .filter(Boolean);

  if (allowedKeys.length === 0) return false;

  const provided = readProvidedKey(request);
  if (!provided) return false;

  return allowedKeys.includes(provided);
}

function shouldVerifySePayHistory(request: NextRequest): boolean {
  const value = (request.nextUrl.searchParams.get('verifySePayHistory') || '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

async function performCheck(order: InternalOrder, options?: PerformCheckOptions): Promise<NextResponse> {
  const now = Date.now();
  const cooldownMs = getCheckCooldownMs();
  const verifySePayHistory = options?.verifySePayHistory === true;

  if (order.status === 'paid') {
    if (verifySePayHistory) {
      const lookup = await findMatchingSePayTransaction(order);
      const matched = lookup.transaction;
      const expectedTransactionId = (order.sepayTransactionId || '').trim();
      const historyMatched = Boolean(
        matched && (!expectedTransactionId || matched.id === expectedTransactionId)
      );

      triggerMagentoSync(order);
      return NextResponse.json({
        ok: true,
        found: true,
        source: 'already_paid',
        sepayHistoryVerified: historyMatched,
        transactionsScanned: lookup.transactionsScanned,
        error: lookup.error,
        expectedTransactionId: expectedTransactionId || null,
        matchedTransactionId: matched?.id || null,
        matchedTransaction: matched
          ? {
            id: matched.id,
            amount: matched.amount,
            content: matched.content,
            accountNumber: matched.accountNumber,
            subAccount: matched.subAccount,
            transactionDate: matched.transactionDate,
          }
          : null,
        recentTransactions: lookup.recentTransactions.map((transaction) => ({
          id: transaction.id,
          amount: transaction.amount,
          content: transaction.content,
          accountNumber: transaction.accountNumber,
          subAccount: transaction.subAccount,
          transactionDate: transaction.transactionDate,
        })),
        order,
      });
    }

    triggerMagentoSync(order);
    return NextResponse.json({
      ok: true,
      found: true,
      source: 'already_paid',
      order,
    });
  }

  if (order.lastPaymentCheckedAt && now - order.lastPaymentCheckedAt < cooldownMs) {
    return NextResponse.json({
      ok: true,
      found: false,
      skipped: 'CHECK_COOLDOWN',
      order,
    });
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

    return NextResponse.json({
      ok: true,
      found: false,
      transactionsScanned: lookup.transactionsScanned,
      recentTransactions: verifySePayHistory
        ? lookup.recentTransactions.map((transaction) => ({
          id: transaction.id,
          amount: transaction.amount,
          content: transaction.content,
          accountNumber: transaction.accountNumber,
          subAccount: transaction.subAccount,
          transactionDate: transaction.transactionDate,
        }))
        : undefined,
      error: lookup.error,
      order: refreshed || order,
    });
  }

  const paymentResult = await markInternalOrderPaid({
    paymentCode: order.paymentCode,
    transferAmount: matched.amount,
    gatewayTransactionId: matched.id,
  });

  const effectiveOrder = paymentResult.order || order;

  if (paymentResult.reason === 'ALREADY_PAID' || isDuplicateTransactionReason(paymentResult.reason)) {
    triggerMagentoSync(effectiveOrder);
    return NextResponse.json({
      ok: true,
      found: true,
      duplicate: true,
      reason: paymentResult.reason,
      transaction: {
        id: matched.id,
        amount: matched.amount,
        content: matched.content,
        transactionDate: matched.transactionDate,
      },
      order: effectiveOrder,
    });
  }

  triggerMagentoSync(effectiveOrder);

  return NextResponse.json({
    ok: true,
    found: true,
    reason: paymentResult.reason,
    transaction: {
      id: matched.id,
      amount: matched.amount,
      content: matched.content,
      transactionDate: matched.transactionDate,
    },
    order: effectiveOrder,
  });
}

export async function POST(request: NextRequest, { params }: RouteProps) {
  const { orderId } = await params;
  const order = await getInternalOrder(orderId);

  if (!order) {
    return NextResponse.json({ error: 'Không tìm thấy đơn hàng.' }, { status: 404 });
  }

  const verifySePayHistory = shouldVerifySePayHistory(request);
  if (verifySePayHistory && !isInternalAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Không có quyền dùng chế độ xác minh.' }, { status: 401 });
  }

  // Strict mode: never trust manual receipt payloads to mark orders paid.
  // Paid status must come from SePay transaction list matching only.
  try {
    const body = (await request.json()) as {
      transactionId?: string;
      amount?: number | string;
      content?: string;
      manualReceipt?: unknown;
    };
    const hasManualData = Boolean(
      body?.transactionId ||
      body?.amount ||
      body?.content ||
      body?.manualReceipt
    );

    if (hasManualData) {
      return NextResponse.json({
        ok: false,
        error: 'Đã tắt đối soát thủ công. Trạng thái thanh toán chỉ chấp nhận từ giao dịch SePay.',
      }, { status: 400 });
    }
  } catch {
    // Empty or non-JSON body is acceptable for auto check.
  }

  return performCheck(order, { verifySePayHistory });
}

export async function GET(request: NextRequest, props: RouteProps) {
  return POST(request, props);
}
