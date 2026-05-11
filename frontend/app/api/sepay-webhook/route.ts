import { NextRequest, NextResponse } from 'next/server';
import {
  extractPaymentCodeFromText,
  getInternalOrder,
  listInternalOrders,
  markInternalOrderPaid,
  updateInternalOrder,
} from '@/lib/services/internalOrders';
import { syncInternalOrderToMagento } from '@/lib/services/magentoSync';
import type { InternalOrder } from '@/types/order';

export const runtime = 'nodejs';

interface SePayPayload {
  // Official SePay webhook fields (https://docs.sepay.vn/webhooks)
  id?: string | number;           // SePay transaction ID (integer)
  gateway?: string;               // Bank brand name
  transactionDate?: string;       // Transaction datetime from bank
  accountNumber?: string;         // Bank account number
  code?: string | null;           // Auto-detected payment code by SePay (can be null)
  content?: string;               // Transfer content
  transferType?: string;          // 'in' = incoming, 'out' = outgoing
  transferAmount?: number | string; // Transaction amount (VND, integer)
  accumulated?: number | string;  // Account balance
  subAccount?: string | null;     // VA / sub-account
  referenceCode?: string;         // Bank SMS reference code (for deduplication)
  description?: string;           // Full SMS content
  // Non-standard legacy aliases kept for backward compat
  transaction_id?: string | number;
  gatewayTransactionId?: string | number;
  amount?: number | string;
  amountIn?: number | string;
  transactionContent?: string;
  transferContent?: string;
}

const DEFAULT_SEPAY_WEBHOOK_IPS = [
  '172.236.138.20',
  '172.233.83.68',
  '171.244.35.2',
  '151.158.108.68',
  '151.158.109.79',
  '103.255.238.139',
];

function isApiAccessOnlyMode(): boolean {
  const mode = (
    process.env.SEPAY_INTEGRATION_MODE ||
    process.env.SEPAY_PAYMENT_SOURCE ||
    'api_access'
  )
    .trim()
    .toLowerCase();

  // Keep webhook enabled for hybrid modes (e.g. api_access) to get faster confirmations,
  // while still allowing poll fallback when webhook is delayed or unavailable.
  return mode === 'api_access_only' || mode === 'pull_only' || mode === 'poll_only';
}

function normalizeApiKey(raw: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // SePay sends Authorization as: "Apikey <TOKEN>".
  // Strip the leading scheme robustly (case-insensitive, one-or-many spaces).
  const apikeyMatch = trimmed.match(/^apikey\s+(.+)$/i);
  if (apikeyMatch && apikeyMatch[1]) {
    return apikeyMatch[1].trim();
  }

  return trimmed;
}

function resolveExpectedApiKeys(): Set<string> {
  const values = [
    process.env.SEPAY_WEBHOOK_API_KEY || '',
    process.env.SEPAY_API_KEY || '',
    process.env.SEPAY_API_TOKEN || '',
  ]
    .join(',')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => normalizeApiKey(item));

  if (values.length > 0) {
    return new Set(values);
  }

  if (process.env.NODE_ENV !== 'production') {
    return new Set(['test-key']);
  }

  return new Set();
}

function resolveExpectedAccounts(): string[] {
  const configured = [
    process.env.SEPAY_EXPECTED_ACCOUNT_NUMBER || '',
    process.env.SEPAY_EXPECTED_ACCOUNTS || '',
    process.env.SEPAY_EXPECTED_VA || '',
  ]
    .join(',')
    .trim();

  if (configured) {
    return configured
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const fallback = (process.env.NEXT_PUBLIC_BANK_ACCOUNT_NO || '').trim();
  return fallback ? [fallback] : [];
}

function resolvePayloadAccounts(payload: SePayPayload): string[] {
  return [
    String(payload.accountNumber || '').trim(),
    String(payload.subAccount || '').trim(),
  ].filter(Boolean);
}

function shouldEnforceSePayIpWhitelist(): boolean {
  const raw = (process.env.SEPAY_WEBHOOK_ENFORCE_IP_WHITELIST || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function resolveAllowedSePayIps(): Set<string> {
  const raw = (process.env.SEPAY_WEBHOOK_ALLOWED_IPS || '').trim();
  if (!raw) {
    return new Set(DEFAULT_SEPAY_WEBHOOK_IPS);
  }

  return new Set(
    raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function extractRequesterIp(request: NextRequest): string {
  const cfIp = (request.headers.get('cf-connecting-ip') || '').trim();
  if (cfIp) return cfIp;

  const xff = (request.headers.get('x-forwarded-for') || '').trim();
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = (request.headers.get('x-real-ip') || '').trim();
  if (realIp) return realIp;

  return '';
}

function parsePositiveNumber(value: unknown): number {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.round(parsed);
}

function extractTransactionText(payload: SePayPayload): string {
  // Per SePay docs: 'content' is the canonical transfer content field
  return String(
    payload.content || payload.description || payload.transferContent || payload.transactionContent || payload.code || ''
  );
}

function isIncomingTransfer(payload: SePayPayload): boolean {
  const transferType = String(payload.transferType || '').trim().toLowerCase();
  if (!transferType) return true;
  return transferType === 'in';
}

function extractTransactionId(payload: SePayPayload): string {
  // Per SePay docs: 'id' is the canonical integer transaction ID
  return String(payload.id || payload.gatewayTransactionId || payload.transaction_id || '').trim();
}

function parseTransactionDateToMs(raw?: string): number {
  if (!raw) return 0;
  const normalized = raw.trim();
  if (!normalized) return 0;

  // SePay commonly sends local VN time without timezone: "YYYY-MM-DD HH:mm:ss".
  // Interpret that format explicitly as UTC+07:00 to avoid runtime timezone drift.
  const vnLocalPattern = /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/;
  const isoLike = vnLocalPattern.test(normalized)
    ? `${normalized.replace(' ', 'T')}+07:00`
    : normalized.replace(' ', 'T');

  const parsed = Date.parse(isoLike);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function getFallbackRecentWindowMs(): number {
  const raw = Number(process.env.SEPAY_FALLBACK_RECENT_WINDOW_MS || 30 * 60 * 1000);
  if (!Number.isFinite(raw) || raw <= 0) return 30 * 60 * 1000;
  return raw;
}

async function findFallbackPaymentCode(payload: SePayPayload, transferAmount: number): Promise<string | null> {
  if (!transferAmount || transferAmount <= 0) return null;

  const payloadAccounts = resolvePayloadAccounts(payload);
  const now = Date.now();
  const transactionAt = parseTransactionDateToMs(payload.transactionDate) || now;
  const recentWindowMs = getFallbackRecentWindowMs();
  const minCreatedAt = Math.max(0, transactionAt - recentWindowMs);

  const orders = await listInternalOrders(200);
  const candidates = orders.filter((order) => {
    if (order.paymentMethod !== 'banking') return false;
    if (order.status !== 'pending') return false;
    if (order.amount !== transferAmount) return false;
    if (payloadAccounts.length > 0 && order.bankAccountNo && !payloadAccounts.includes(order.bankAccountNo)) {
      return false;
    }
    if (order.createdAt < minCreatedAt) return false;
    if (order.createdAt > transactionAt + 5 * 60 * 1000) return false;
    return true;
  });

  if (candidates.length !== 1) {
    return null;
  }

  return candidates[0].paymentCode;
}

function isDuplicateTransactionReason(reason?: string): boolean {
  if (!reason) return false;
  return reason === 'DUPLICATE_TRANSACTION' || reason.startsWith('TRANSACTION_ALREADY_USED:');
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
      if (syncResult.success) {
        await updateInternalOrder(order.id, {
          magentoSyncStatus: 'success',
          magentoOrderNumber: syncResult.orderNumber || order.magentoOrderNumber,
          magentoQuoteId: syncResult.quoteId || order.magentoQuoteId,
          magentoSyncError: undefined,
        });
        return;
      }

      await updateInternalOrder(order.id, {
        magentoSyncStatus: 'failed',
        magentoSyncError: syncResult.error || 'Magento sync failed',
      });
    })
    .catch((error) => {
      console.error('Background Magento sync failed:', error);
    });
}

export async function POST(request: NextRequest) {
  try {
    if (isApiAccessOnlyMode()) {
      return NextResponse.json({
        success: true,
        ok: true,
        processed: false,
        reason: 'API_ACCESS_MODE_ONLY',
      });
    }

    if (shouldEnforceSePayIpWhitelist()) {
      const requesterIp = extractRequesterIp(request);
      const allowedIps = resolveAllowedSePayIps();

      if (!requesterIp || !allowedIps.has(requesterIp)) {
        return NextResponse.json({
          error: 'Forbidden IP address.',
          ip: requesterIp || null,
        }, { status: 403 });
      }
    }

      const expectedApiKeys = resolveExpectedApiKeys();
      if (expectedApiKeys.size === 0) {
      return NextResponse.json({ error: 'Webhook API key is not configured.' }, { status: 500 });
    }

    const providedApiKey = normalizeApiKey(request.headers.get('authorization'));
      if (!providedApiKey || !expectedApiKeys.has(providedApiKey)) {
      return NextResponse.json({ error: 'Unauthorized webhook request.' }, { status: 401 });
    }

    const payload = (await request.json()) as SePayPayload;

    if (!isIncomingTransfer(payload)) {
      return NextResponse.json({
        success: true,
        ok: true,
        processed: false,
        reason: 'TRANSFER_TYPE_NOT_SUPPORTED',
      });
    }

    const expectedAccounts = resolveExpectedAccounts();
    const payloadAccounts = resolvePayloadAccounts(payload);
    if (
      expectedAccounts.length > 0 &&
      payloadAccounts.length > 0 &&
      !payloadAccounts.some((account) => expectedAccounts.includes(account))
    ) {
      return NextResponse.json({
        success: true,
        ok: true,
        processed: false,
        reason: 'ACCOUNT_NOT_MATCHED',
      });
    }

    // Per SePay docs: 'transferAmount' is the canonical amount field (integer VND)
    const transferAmount =
      parsePositiveNumber(payload.transferAmount) ||
      parsePositiveNumber(payload.amountIn) ||
      parsePositiveNumber(payload.amount);

    const transferText = extractTransactionText(payload);
    let paymentCode = (payload.code && String(payload.code).trim()) || extractPaymentCodeFromText(transferText);

    if (!paymentCode) {
      paymentCode = await findFallbackPaymentCode(payload, transferAmount);
    }

    if (!paymentCode) {
      return NextResponse.json({ success: true, ok: true, processed: false, reason: 'PAYMENT_CODE_NOT_FOUND' });
    }

    const gatewayTransactionId = extractTransactionId(payload);
    if (!gatewayTransactionId) {
      return NextResponse.json({
        success: true,
        ok: true,
        processed: false,
        reason: 'MISSING_SEPAY_TRANSACTION_ID',
      });
    }

    const result = await markInternalOrderPaid({
      paymentCode,
      transferAmount,
      gatewayTransactionId,
    });

    if (!result.order) {
      return NextResponse.json({ success: true, ok: true, processed: false, reason: result.reason || 'ORDER_NOT_FOUND' });
    }

    if (result.reason === 'ALREADY_PAID') {
      triggerMagentoSync(result.order);
      const effectiveOrder = result.order;

      return NextResponse.json({
        success: true,
        ok: true,
        processed: true,
        duplicate: true,
        orderId: effectiveOrder.id,
        status: effectiveOrder.status,
        magentoSyncStatus: effectiveOrder.magentoSyncStatus,
        paymentStatusMessage: effectiveOrder.paymentStatusMessage,
      });
    }

    if (isDuplicateTransactionReason(result.reason)) {
      const freshOrder = await getInternalOrder(result.order.id);
      const effectiveOrder = freshOrder || result.order;

      return NextResponse.json({
        success: true,
        ok: true,
        processed: false,
        duplicate: true,
        reason: result.reason,
        orderId: effectiveOrder.id,
        status: effectiveOrder.status,
        magentoSyncStatus: effectiveOrder.magentoSyncStatus,
        paymentStatusMessage: effectiveOrder.paymentStatusMessage,
      });
    }

    if (result.reason) {
      return NextResponse.json({
        success: true,
        ok: true,
        processed: false,
        reason: result.reason,
        orderId: result.order.id,
        status: result.order.status,
        paymentStatusMessage: result.order.paymentStatusMessage,
      });
    }

    if (result.order.status === 'paid') {
      triggerMagentoSync(result.order);
    }

    return NextResponse.json({
      success: true,
      ok: true,
      processed: true,
      orderId: result.order.id,
      status: result.order.status,
      magentoSyncStatus: result.order.magentoSyncStatus,
      paymentStatusMessage: result.order.paymentStatusMessage,
    });
  } catch (error) {
    console.error('SePay webhook failed:', error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
