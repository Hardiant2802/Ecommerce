import { extractPaymentCodeFromText } from '@/lib/services/internalOrders';
import type { InternalOrder } from '@/types/order';

export interface SePayMatchedTransaction {
  id: string;
  amount: number;
  content: string;
  accountNumber?: string;
  subAccount?: string;
  transactionDate?: string;
  raw: Record<string, unknown>;
}

const DEFAULT_TRANSACTIONS_API_URL = 'https://my.sepay.vn/userapi/transactions/list';

function normalizeText(value?: string): string {
  return (value || '').trim();
}

function parseExpectedAccounts(raw?: string): string[] {
  if (!raw) return [];

  return raw
    .split(',')
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function resolveExpectedAccountsFromEnv(): string[] {
  const merged = [
    process.env.SEPAY_EXPECTED_ACCOUNT_NUMBER || '',
    process.env.SEPAY_EXPECTED_ACCOUNTS || '',
    process.env.SEPAY_EXPECTED_VA || '',
  ]
    .join(',')
    .trim();

  return parseExpectedAccounts(merged);
}

function normalizeTokenCandidate(candidate: string): { token: string } | null {
  const normalized = normalizeText(candidate);
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  if (lower.startsWith('bearer ')) {
    const token = normalizeText(normalized.slice(7));
    if (!token) return null;
    return { token };
  }

  if (lower.startsWith('apikey ')) {
    const token = normalizeText(normalized.slice(7));
    if (!token) return null;
    return { token };
  }

  if (lower.startsWith('token ')) {
    const token = normalizeText(normalized.slice(6));
    if (!token) return null;
    return { token };
  }

  return { token: normalized };
}

function buildAuthorizationCandidates(): Record<string, string>[] {
  const rawCandidates = [
    normalizeText(process.env.SEPAY_API_TOKEN),
    normalizeText(process.env.SEPAY_API_KEY),
  ].filter(Boolean);

  const variants: Record<string, string>[] = [];
  const seen = new Set<string>();

  const pushVariant = (headerSet: Record<string, string>) => {
    const key = JSON.stringify(headerSet);
    if (seen.has(key)) return;
    seen.add(key);
    variants.push(headerSet);
  };

  for (const candidate of rawCandidates) {
    const normalized = normalizeTokenCandidate(candidate);
    if (!normalized) continue;

    const token = normalized.token;
    if (!token) {
      continue;
    }

    // SePay docs require API Token in Bearer Authorization header.
    pushVariant({ Authorization: `Bearer ${token}` });
  }

  return variants;
}

function normalizeUpper(value?: string): string {
  return normalizeText(value).toUpperCase();
}

function compactCode(value?: string): string {
  return normalizeUpper(value).replace(/[^A-Z0-9]/g, '');
}

function pickString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const raw = source[key];
    if (typeof raw === 'string') {
      const value = raw.trim();
      if (value) return value;
    }

    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return String(raw);
    }
  }

  return '';
}

function pickNumber(source: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const raw = source[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }

    if (typeof raw === 'string') {
      const normalized = raw.replace(/[^0-9.-]/g, '');
      if (!normalized) continue;
      const value = Number(normalized);
      if (Number.isFinite(value)) {
        return value;
      }
    }
  }

  return 0;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function collectArrays(payload: unknown): unknown[][] {
  const root = toRecord(payload);
  if (!root) return [];

  const arrays: unknown[][] = [];
  for (const value of Object.values(root)) {
    if (Array.isArray(value)) {
      arrays.push(value);
      continue;
    }

    const nested = toRecord(value);
    if (!nested) continue;

    for (const nestedValue of Object.values(nested)) {
      if (Array.isArray(nestedValue)) {
        arrays.push(nestedValue);
      }
    }
  }

  return arrays;
}

function toTransaction(candidate: unknown): SePayMatchedTransaction | null {
  const record = toRecord(candidate);
  if (!record) return null;

  const amount = pickNumber(record, [
    'amount',
    'amountIn',
    'amount_in',
    'transferAmount',
    'transfer_amount',
    'transactionAmount',
    'transaction_amount',
    'totalAmount',
    'total_amount',
  ]);

  const id = pickString(record, [
    'id',
    'transaction_id',
    'transactionId',
    'gatewayTransactionId',
    'gateway_transaction_id',
  ]);

  const content = pickString(record, [
    'content',
    'description',
    'transaction_content',
    'transactionContent',
    'transferContent',
    'transfer_content',
    'code',
    'sub_account',
    'subAccount',
    'reference_number',
    'referenceNumber',
    'reference',
    'note',
  ]);

  if (!id) {
    return null;
  }

  return {
    id,
    amount,
    content,
    accountNumber: pickString(record, ['accountNumber', 'account_number', 'accountNo', 'account_no']),
    subAccount: pickString(record, ['subAccount', 'sub_account', 'virtualAccount', 'virtual_account']),
    transactionDate: pickString(record, ['transactionDate', 'transaction_date', 'createdAt', 'created_at', 'time']),
    raw: record,
  };
}

function parseTransactions(payload: unknown): SePayMatchedTransaction[] {
  if (Array.isArray(payload)) {
    return payload.map((item) => toTransaction(item)).filter((item): item is SePayMatchedTransaction => Boolean(item));
  }

  const arrays = collectArrays(payload);
  const output: SePayMatchedTransaction[] = [];

  for (const items of arrays) {
    for (const item of items) {
      const transaction = toTransaction(item);
      if (transaction) output.push(transaction);
    }
  }

  return output;
}

async function fetchTransactionsWithHeader(url: string, authHeaders: Record<string, string>): Promise<Response> {
  return fetch(url, {
    method: 'GET',
    headers: {
      ...authHeaders,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
}

function buildEndpointCandidates(endpoint: string): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const push = (url: string) => {
    const normalized = normalizeText(url);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push(normalized);
  };

  push(endpoint);

  try {
    const base = new URL(endpoint);
    const parameterSets: Array<Array<[string, string]>> = [
      [['limit', '100']],
      [['limit', '200']],
      [['pageSize', '100']],
      [['per_page', '100']],
      [['perPage', '100']],
      [['size', '100']],
      [['page', '1'], ['limit', '100']],
      [['page', '1'], ['pageSize', '100']],
      [['page', '1'], ['per_page', '100']],
      [['page', '1'], ['perPage', '100']],
    ];

    for (const params of parameterSets) {
      const next = new URL(base.toString());
      for (const [key, value] of params) {
        next.searchParams.set(key, value);
      }
      push(next.toString());
    }
  } catch {
    // If endpoint is not a valid absolute URL, keep the original only.
  }

  return candidates;
}

function mergeTransactions(...groups: SePayMatchedTransaction[][]): SePayMatchedTransaction[] {
  const merged = new Map<string, SePayMatchedTransaction>();

  for (const group of groups) {
    for (const transaction of group) {
      if (!transaction?.id) continue;
      if (!merged.has(transaction.id)) {
        merged.set(transaction.id, transaction);
      }
    }
  }

  return Array.from(merged.values());
}

async function fetchSePayTransactions(): Promise<{ transactions: SePayMatchedTransaction[]; error?: string }> {
  const authorizationCandidates = buildAuthorizationCandidates();
  if (authorizationCandidates.length === 0) {
    return { transactions: [], error: 'SEPAY_API_TOKEN is missing (create API token at my.sepay.vn/companyapi)' };
  }

  const endpoint = normalizeText(process.env.SEPAY_TRANSACTIONS_API_URL) || DEFAULT_TRANSACTIONS_API_URL;
  const endpointCandidates = buildEndpointCandidates(endpoint);
  let lastError = '';

  for (const authHeaders of authorizationCandidates) {
    let bestTransactions: SePayMatchedTransaction[] = [];
    let sawOkResponse = false;

    for (const candidateUrl of endpointCandidates) {
      try {
        const response = await fetchTransactionsWithHeader(candidateUrl, authHeaders);
        if (!response.ok) {
          lastError =
            response.status === 401 || response.status === 403
              ? `SePay API responded ${response.status} (check SEPAY_API_TOKEN from API Access)`
              : `SePay API responded ${response.status}`;
          if (response.status === 401 || response.status === 403) {
            bestTransactions = [];
            break;
          }
          continue;
        }

        sawOkResponse = true;
        const payload = await response.json();
        const transactions = parseTransactions(payload);
        bestTransactions = mergeTransactions(bestTransactions, transactions);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Cannot fetch SePay transactions';
      }
    }

    if (bestTransactions.length > 0 || sawOkResponse) {
      return { transactions: bestTransactions, error: sawOkResponse ? undefined : lastError };
    }
  }

  return { transactions: [], error: lastError || 'Cannot fetch SePay transactions' };
}

function scoreTransaction(order: InternalOrder, transaction: SePayMatchedTransaction): number {
  const paymentCodeUpper = normalizeUpper(order.paymentCode);
  const paymentCodeCompact = compactCode(order.paymentCode);
  const orderIdCompact = compactCode(order.id);
  const contentUpper = normalizeUpper(transaction.content);
  const contentCompact = compactCode(transaction.content);
  const extractedCodeUpper = normalizeUpper(extractPaymentCodeFromText(transaction.content) || '');

  const matchesDirectCode = Boolean(contentUpper && contentUpper.includes(paymentCodeUpper));
  const matchesCompactCode = Boolean(paymentCodeCompact && contentCompact && contentCompact.includes(paymentCodeCompact));
  const matchesOrderId = Boolean(orderIdCompact && contentCompact && contentCompact.includes(orderIdCompact));
  const matchesExtractedCode = Boolean(extractedCodeUpper && extractedCodeUpper === paymentCodeUpper);

  // Guardrail: only consider transactions that actually mention the order payment code.
  if (!matchesDirectCode && !matchesCompactCode && !matchesOrderId && !matchesExtractedCode) {
    return 0;
  }

  let score = 0;

  if (matchesDirectCode) score += 5;
  if (matchesCompactCode) score += 5;
  if (matchesOrderId) score += 4;
  if (matchesExtractedCode) score += 8;

  if (transaction.amount === order.amount) score += 4;
  else if (transaction.amount > 0 && transaction.amount < order.amount) score += 2;

  if (transaction.transactionDate) score += 1;

  return score;
}

function sortByBestMatch(order: InternalOrder, transactions: SePayMatchedTransaction[]): SePayMatchedTransaction[] {
  const withScore = transactions
    .map((transaction) => ({ transaction, score: scoreTransaction(order, transaction) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const dateA = Date.parse(a.transaction.transactionDate || '');
      const dateB = Date.parse(b.transaction.transactionDate || '');
      if (Number.isFinite(dateA) && Number.isFinite(dateB)) {
        return dateB - dateA;
      }

      return b.transaction.amount - a.transaction.amount;
    });

  return withScore.map((entry) => entry.transaction);
}

export async function findMatchingSePayTransaction(order: InternalOrder): Promise<{
  transaction?: SePayMatchedTransaction;
  transactionsScanned: number;
  recentTransactions: SePayMatchedTransaction[];
  error?: string;
}> {
  const expectedAccounts = resolveExpectedAccountsFromEnv();
  const orderAccount = normalizeText(order.bankAccountNo);
  const targetAccounts = Array.from(new Set([
    ...expectedAccounts,
    ...(orderAccount ? [orderAccount] : []),
  ]));
  const { transactions, error } = await fetchSePayTransactions();

  let filtered = transactions;
  if (targetAccounts.length > 0) {
    filtered = filtered.filter((item) => {
      const itemAccounts = [
        normalizeText(item.accountNumber),
        normalizeText(item.subAccount),
      ].filter(Boolean);

      if (itemAccounts.length === 0) return true;
      return itemAccounts.some((account) => targetAccounts.includes(account));
    });
  }

  const matched = sortByBestMatch(order, filtered);
  return {
    transaction: matched[0],
    transactionsScanned: filtered.length,
    recentTransactions: filtered.slice(0, 5),
    error,
  };
}
