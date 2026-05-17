import {
	CreateInternalOrderInput,
	InternalOrder,
	InternalOrderStatus,
	MagentoSyncStatus,
} from '@/types/order';
import {
	findInternalOrderIdByPaymentCodeFromDb,
	findInternalOrderIdByTransactionIdFromDb,
	getInternalOrderFromDb,
	hasDbPersistence,
	listInternalOrdersFromDb,
	upsertInternalOrderToDb,
} from '@/lib/services/internalOrdersDb';

interface InternalOrderStore {
	byId: Map<string, InternalOrder>;
	byPaymentCode: Map<string, string>;
	byTransactionId: Map<string, string>;
}

interface PaidUpdateInput {
	paymentCode: string;
	transferAmount: number;
	gatewayTransactionId?: string;
}

interface KvRestConfig {
	accountId: string;
	namespaceId: string;
	apiToken: string;
}

interface KvBindingListResult {
	keys: Array<{ name: string }>;
	cursor?: string;
	list_complete?: boolean;
}

interface KvBinding {
	put(key: string, value: string): Promise<void>;
	get(key: string): Promise<string | null>;
	list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<KvBindingListResult>;
}

const STORE_KEY = '__AHPHONE_INTERNAL_ORDER_STORE__';
const ORDER_PREFIX = 'order:';
const PAYMENT_PREFIX = 'payment:';
const TRANSACTION_PREFIX = 'transaction:';
const KV_BINDING_NAME = 'AHPHONE_ORDERS';
const CF_REQUEST_CONTEXT_SYMBOL = Symbol.for('__cloudflare-request-context__');
const DEFAULT_PENDING_TTL_MINUTES = 15;

function normalizePaymentCode(value: string): string {
	return (value || '').toUpperCase().trim();
}

function compactPaymentCode(value: string): string {
	return normalizePaymentCode(value).replace(/[^A-Z0-9]/g, '');
}

function normalizeTransactionId(value?: string): string {
	return (value || '').trim();
}

function getPendingOrderTtlMs(): number {
	const raw = Number(process.env.INTERNAL_ORDER_PENDING_TTL_MINUTES || DEFAULT_PENDING_TTL_MINUTES);
	if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_PENDING_TTL_MINUTES * 60 * 1000;
	return Math.floor(raw) * 60 * 1000;
}

function isPendingOrderExpired(order: InternalOrder, now: number): boolean {
	if (order.status !== 'pending') return false;
	if (order.paymentMethod !== 'banking') return false;
	return now - order.createdAt >= getPendingOrderTtlMs();
}

function getStore(): InternalOrderStore {
	const globalScope = globalThis as typeof globalThis & {
		[STORE_KEY]?: InternalOrderStore;
	};

	if (!globalScope[STORE_KEY]) {
		globalScope[STORE_KEY] = {
			byId: new Map<string, InternalOrder>(),
			byPaymentCode: new Map<string, string>(),
			byTransactionId: new Map<string, string>(),
		};
	}

	return globalScope[STORE_KEY];
}

function getKvRestConfig(): KvRestConfig | null {
	const accountId = (process.env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
	const namespaceId = (process.env.CF_KV_NAMESPACE_ID || '').trim();
	const apiToken = (process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || '').trim();

	if (!accountId || !namespaceId || !apiToken) {
		return null;
	}

	return {
		accountId,
		namespaceId,
		apiToken,
	};
}

function isKvBinding(value: unknown): value is KvBinding {
	if (!value || typeof value !== 'object') return false;

	const maybe = value as Partial<KvBinding>;
	return typeof maybe.put === 'function' && typeof maybe.get === 'function' && typeof maybe.list === 'function';
}

function getKvBinding(): KvBinding | null {
	const globalScope = globalThis as typeof globalThis & {
		[key: string]: unknown;
		[key: symbol]: unknown;
	};

	const context = globalScope[CF_REQUEST_CONTEXT_SYMBOL] as
		| {
				env?: Record<string, unknown>;
		  }
		| undefined;

	const fromContext = context?.env?.[KV_BINDING_NAME];
	if (isKvBinding(fromContext)) {
		return fromContext;
	}

	const fromGlobal = globalScope[KV_BINDING_NAME];
	if (isKvBinding(fromGlobal)) {
		return fromGlobal;
	}

	const fromProcess = (process.env as Record<string, unknown>)[KV_BINDING_NAME];
	if (isKvBinding(fromProcess)) {
		return fromProcess;
	}

	return null;
}

function buildKvUrl(config: KvRestConfig, path: string): string {
	return `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/storage/kv/namespaces/${config.namespaceId}${path}`;
}

async function kvFetch(path: string, init?: RequestInit): Promise<Response | null> {
	const config = getKvRestConfig();
	if (!config) return null;

	try {
		return await fetch(buildKvUrl(config, path), {
			...init,
			headers: {
				Authorization: `Bearer ${config.apiToken}`,
				...(init?.headers || {}),
			},
		});
	} catch (error) {
		console.error('KV REST request failed:', error);
		return null;
	}
}

async function kvPutText(key: string, value: string): Promise<void> {
	const kvBinding = getKvBinding();
	if (kvBinding) {
		try {
			await kvBinding.put(key, value);
			return;
		} catch (error) {
			console.error('KV binding PUT failed:', error);
		}
	}

	const response = await kvFetch(`/values/${encodeURIComponent(key)}`, {
		method: 'PUT',
		body: value,
	});

	if (!response || !response.ok) {
		if (response) {
			const body = await response.text().catch(() => '');
			console.error('KV PUT failed:', response.status, body);
		}
	}
}

async function kvGetText(key: string): Promise<string | null> {
	const kvBinding = getKvBinding();
	if (kvBinding) {
		try {
			const value = await kvBinding.get(key);
			if (typeof value === 'string') {
				return value;
			}
		} catch (error) {
			console.error('KV binding GET failed:', error);
		}
	}

	const response = await kvFetch(`/values/${encodeURIComponent(key)}`, {
		method: 'GET',
	});

	if (!response) return null;
	if (response.status === 404) return null;
	if (!response.ok) {
		const body = await response.text().catch(() => '');
		console.error('KV GET failed:', response.status, body);
		return null;
	}

	return response.text();
}

async function kvListOrderKeys(limit = 100): Promise<string[]> {
	const kvBinding = getKvBinding();
	if (kvBinding) {
		try {
			const payload = await kvBinding.list({
				prefix: ORDER_PREFIX,
				limit,
			});

			if (!payload?.keys || payload.keys.length === 0) {
				return [];
			}

			return payload.keys.map((item) => item.name || '').filter(Boolean);
		} catch (error) {
			console.error('KV binding LIST failed:', error);
		}
	}

	const response = await kvFetch(`/keys?prefix=${encodeURIComponent(ORDER_PREFIX)}&limit=${limit}`, {
		method: 'GET',
	});

	if (!response || !response.ok) {
		if (response) {
			const body = await response.text().catch(() => '');
			console.error('KV LIST failed:', response.status, body);
		}
		return [];
	}

	try {
		const payload = (await response.json()) as {
			success?: boolean;
			result?: Array<{ name?: string }>;
		};

		if (!payload.success || !payload.result) return [];
		return payload.result.map((item) => item.name || '').filter(Boolean);
	} catch (error) {
		console.error('KV LIST parse failed:', error);
		return [];
	}
}

function hasKvPersistence(): boolean {
	return !!getKvBinding() || !!getKvRestConfig();
}

function listOrdersFromMemory(limit: number): InternalOrder[] {
	return Array.from(getStore().byId.values())
		.sort((a, b) => b.createdAt - a.createdAt)
		.slice(0, Math.max(1, Math.min(limit, 200)));
}

export interface InternalOrdersKvToDbMigrationResult {
	ok: boolean;
	reason?: string;
	limit: number;
	keysFound: number;
	scanned: number;
	migrated: number;
	skipped: number;
	failed: number;
	errors: string[];
}

function isMigratableInternalOrder(value: unknown): value is InternalOrder {
	if (!value || typeof value !== 'object') return false;

	const maybe = value as Partial<InternalOrder>;
	if (!maybe.id || !maybe.paymentCode || !maybe.paymentMethod) return false;
	if (!Array.isArray(maybe.items)) return false;
	if (!maybe.currency) return false;
	if (!Number.isFinite(Number(maybe.amount))) return false;
	if (!Number.isFinite(Number(maybe.createdAt)) || !Number.isFinite(Number(maybe.updatedAt))) return false;

	return true;
}

export async function migrateInternalOrdersFromKvToDb(limit = 500): Promise<InternalOrdersKvToDbMigrationResult> {
	const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));

	if (!hasDbPersistence()) {
		return {
			ok: false,
			reason: 'DB_PERSISTENCE_NOT_CONFIGURED',
			limit: safeLimit,
			keysFound: 0,
			scanned: 0,
			migrated: 0,
			skipped: 0,
			failed: 0,
			errors: [],
		};
	}

	if (!hasKvPersistence()) {
		return {
			ok: true,
			reason: 'KV_PERSISTENCE_NOT_CONFIGURED',
			limit: safeLimit,
			keysFound: 0,
			scanned: 0,
			migrated: 0,
			skipped: 0,
			failed: 0,
			errors: [],
		};
	}

	const keys = await kvListOrderKeys(safeLimit);
	let scanned = 0;
	let migrated = 0;
	let skipped = 0;
	let failed = 0;
	const errors: string[] = [];

	for (const key of keys) {
		scanned += 1;

		const raw = await kvGetText(key);
		if (!raw) {
			skipped += 1;
			continue;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch (error) {
			failed += 1;
			if (errors.length < 30) {
				errors.push(`${key}: JSON_PARSE_ERROR:${error instanceof Error ? error.message : 'unknown'}`);
			}
			continue;
		}

		if (!isMigratableInternalOrder(parsed)) {
			skipped += 1;
			continue;
		}

		const migratedOrder = await upsertInternalOrderToDb(parsed);
		if (!migratedOrder) {
			failed += 1;
			if (errors.length < 30) {
				errors.push(`${key}: DB_UPSERT_FAILED`);
			}
			continue;
		}

		cacheOrder(parsed);
		migrated += 1;
	}

	return {
		ok: failed === 0,
		limit: safeLimit,
		keysFound: keys.length,
		scanned,
		migrated,
		skipped,
		failed,
		errors,
	};
}

async function persistOrder(order: InternalOrder): Promise<InternalOrder> {
	let orderToPersist = order;

	if (hasDbPersistence()) {
		const existing = await getInternalOrderFromDb(order.id);
		if (existing && existing.status === 'paid' && order.status !== 'paid') {
			orderToPersist = {
				...order,
				status: 'paid',
				paidAt: existing.paidAt || order.paidAt || Date.now(),
				sepayTransactionId: existing.sepayTransactionId || order.sepayTransactionId,
				lastPaymentAmountReceived: Math.max(
					existing.lastPaymentAmountReceived || 0,
					order.lastPaymentAmountReceived || 0
				),
				lastPaymentCheckedAt: Math.max(
					existing.lastPaymentCheckedAt || 0,
					order.lastPaymentCheckedAt || 0
				),
				paymentStatusMessage: existing.paymentStatusMessage || order.paymentStatusMessage,
				magentoSyncStatus: existing.magentoSyncStatus || order.magentoSyncStatus,
				magentoOrderNumber: existing.magentoOrderNumber || order.magentoOrderNumber,
				magentoQuoteId: existing.magentoQuoteId || order.magentoQuoteId,
				magentoSyncError: order.magentoSyncError ?? existing.magentoSyncError,
				updatedAt: Math.max(existing.updatedAt || 0, order.updatedAt || 0),
			};
		}
	}

	if (hasKvPersistence()) {
		const existingRaw = await kvGetText(`${ORDER_PREFIX}${order.id}`);
		if (existingRaw) {
			try {
				const existing = JSON.parse(existingRaw) as InternalOrder;
				if (existing.status === 'paid' && order.status !== 'paid') {
					orderToPersist = {
						...order,
						status: 'paid',
						paidAt: existing.paidAt || order.paidAt || Date.now(),
						sepayTransactionId: existing.sepayTransactionId || order.sepayTransactionId,
						lastPaymentAmountReceived: Math.max(
							existing.lastPaymentAmountReceived || 0,
							order.lastPaymentAmountReceived || 0
						),
						lastPaymentCheckedAt: Math.max(
							existing.lastPaymentCheckedAt || 0,
							order.lastPaymentCheckedAt || 0
						),
						paymentStatusMessage: existing.paymentStatusMessage || order.paymentStatusMessage,
						magentoSyncStatus: existing.magentoSyncStatus || order.magentoSyncStatus,
						magentoOrderNumber: existing.magentoOrderNumber || order.magentoOrderNumber,
						magentoQuoteId: existing.magentoQuoteId || order.magentoQuoteId,
						magentoSyncError: order.magentoSyncError ?? existing.magentoSyncError,
						updatedAt: Math.max(existing.updatedAt || 0, order.updatedAt || 0),
					};
				}
			} catch {
				// Ignore parsing error and persist incoming order.
			}
		}

		const normalizedCode = normalizePaymentCode(orderToPersist.paymentCode);
		const compactCode = compactPaymentCode(orderToPersist.paymentCode);
		const paymentKeys = [`${PAYMENT_PREFIX}${normalizedCode}`];
		if (compactCode && compactCode !== normalizedCode) {
			paymentKeys.push(`${PAYMENT_PREFIX}${compactCode}`);
		}

		const transactionId = normalizeTransactionId(orderToPersist.sepayTransactionId);
		const transactionKeys = transactionId ? [`${TRANSACTION_PREFIX}${transactionId}`] : [];

		await Promise.all([
			kvPutText(`${ORDER_PREFIX}${orderToPersist.id}`, JSON.stringify(orderToPersist)),
			...paymentKeys.map((key) => kvPutText(key, orderToPersist.id)),
			...transactionKeys.map((key) => kvPutText(key, orderToPersist.id)),
		]);
	}

	if (hasDbPersistence()) {
		await upsertInternalOrderToDb(orderToPersist);
	}

	return orderToPersist;
}

function resolveTransferPrefix(): string {
	const raw =
		process.env.SEPAY_TRANSFER_PREFIX ||
		process.env.NEXT_PUBLIC_TRANSFER_PREFIX ||
		'AHPHONE';
	return raw.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'AHPHONE';
}

function parseCsvValues(raw: string): string[] {
	return (raw || '')
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function resolveBankingConfig() {
	const expectedAccounts = parseCsvValues(
		[
			process.env.SEPAY_EXPECTED_ACCOUNT_NUMBER || '',
			process.env.SEPAY_EXPECTED_ACCOUNTS || '',
			process.env.SEPAY_EXPECTED_VA || '',
		].join(',')
	);
	const preferredReceivingAccountNo = (
		process.env.SEPAY_RECEIVING_ACCOUNT_NO ||
		process.env.SEPAY_RECEIVING_VA ||
		process.env.SEPAY_EXPECTED_VA ||
		''
	).trim();
	const configuredPublicAccountNo = (process.env.NEXT_PUBLIC_BANK_ACCOUNT_NO || '').trim();
	const effectiveAccountNo =
		preferredReceivingAccountNo ||
		expectedAccounts[0] ||
		configuredPublicAccountNo;

	return {
		bankName: process.env.NEXT_PUBLIC_BANK_NAME || 'BIDV',
		bankBin: process.env.NEXT_PUBLIC_BANK_BIN || '',
		bankAccountNo: effectiveAccountNo,
		bankAccountName: (process.env.SEPAY_RECEIVING_ACCOUNT_NAME || process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || '').trim(),
		expectedSePayAccountNo: expectedAccounts.join(','),
	};
}

function createOrderId(): string {
	const ts = Date.now().toString(36).toUpperCase();
	const suffix = crypto.randomUUID().split('-')[0].toUpperCase();
	return `AHP-${ts}-${suffix}`;
}

function buildQrUrl(paymentCode: string, amount: number, accountName?: string): string {
	const { bankName, bankAccountNo } = resolveBankingConfig();
	if (!bankAccountNo) return '';

	const normalizedAmount = Math.max(0, Math.round(amount));
	const sepayBankCode = (process.env.NEXT_PUBLIC_SEPAY_BANK_CODE || bankName || 'BIDV').trim();
	if (!sepayBankCode) return '';
	const transferRef = compactPaymentCode(paymentCode) || paymentCode;

	return `https://qr.sepay.vn/img?acc=${encodeURIComponent(bankAccountNo)}&bank=${encodeURIComponent(sepayBankCode)}&amount=${normalizedAmount}&des=${encodeURIComponent(transferRef)}`;
}

function cacheOrder(order: InternalOrder): InternalOrder {
	const store = getStore();
	store.byId.set(order.id, order);

	const normalizedCode = normalizePaymentCode(order.paymentCode);
	const compactCode = compactPaymentCode(order.paymentCode);

	store.byPaymentCode.set(normalizedCode, order.id);
	if (compactCode && compactCode !== normalizedCode) {
		store.byPaymentCode.set(compactCode, order.id);
	}

	const transactionId = normalizeTransactionId(order.sepayTransactionId);
	if (transactionId) {
		store.byTransactionId.set(transactionId, order.id);
	}

	return order;
}

async function findOrderIdByTransactionId(transactionId: string): Promise<string | null> {
	const normalized = normalizeTransactionId(transactionId);
	if (!normalized) return null;

	const store = getStore();
	const cached = store.byTransactionId.get(normalized);
	if (cached) {
		return cached;
	}

	if (hasDbPersistence()) {
		const dbOrderId = await findInternalOrderIdByTransactionIdFromDb(normalized);
		if (dbOrderId) {
			store.byTransactionId.set(normalized, dbOrderId);
			return dbOrderId;
		}
	}

	if (!hasKvPersistence()) {
		return null;
	}

	const orderId = await kvGetText(`${TRANSACTION_PREFIX}${normalized}`);
	if (!orderId) return null;

	store.byTransactionId.set(normalized, orderId);
	return orderId;
}

async function persistTransactionOrderIndex(transactionId: string, orderId: string): Promise<void> {
	const normalized = normalizeTransactionId(transactionId);
	if (!normalized) return;

	const store = getStore();
	store.byTransactionId.set(normalized, orderId);

	if (hasKvPersistence()) {
		await kvPutText(`${TRANSACTION_PREFIX}${normalized}`, orderId);
	}
}

function mergeOrder(existing: InternalOrder, patch: Partial<InternalOrder>): InternalOrder {
	return {
		...existing,
		...patch,
		updatedAt: Date.now(),
	};
}

export async function createInternalOrder(input: CreateInternalOrderInput): Promise<InternalOrder> {
	const now = Date.now();
	const orderId = createOrderId();
	const prefix = resolveTransferPrefix();
	const paymentCode = `${prefix}-${orderId}`.toUpperCase();
	const banking = resolveBankingConfig();
	const roundedAmount = Math.max(0, Math.round(input.amount));

	if (input.paymentMethod === 'banking') {
		if (!banking.bankAccountNo) {
			throw new Error('SEPAY_RECEIVING_ACCOUNT_NOT_CONFIGURED');
		}
	}

	const order: InternalOrder = {
		id: orderId,
		paymentMethod: input.paymentMethod,
		paymentCode,
		status: 'pending',
		amount: roundedAmount,
		currency: input.currency,
		note: input.note,
		customerEmail: input.customerEmail,
		items: input.items,
		bankName: banking.bankName,
		bankBin: banking.bankBin,
		bankAccountNo: banking.bankAccountNo,
		bankAccountName: banking.bankAccountName,
		qrUrl: input.paymentMethod === 'banking' ? buildQrUrl(paymentCode, roundedAmount, banking.bankAccountName) : '',
		createdAt: now,
		updatedAt: now,
		magentoSyncStatus: 'not_started',
	};

	cacheOrder(order);
	const persisted = await persistOrder(order);
	cacheOrder(persisted);
	return persisted;
}

export async function getInternalOrder(orderId: string): Promise<InternalOrder | null> {
	const store = getStore();
	const cached = store.byId.get(orderId);
	if (cached) return cached;

	if (hasDbPersistence()) {
		const dbOrder = await getInternalOrderFromDb(orderId);
		if (dbOrder) {
			return cacheOrder(dbOrder);
		}
	}

	if (!hasKvPersistence()) {
		return null;
	}

	const raw = await kvGetText(`${ORDER_PREFIX}${orderId}`);
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw) as InternalOrder;
		return cacheOrder(parsed);
	} catch (error) {
		console.error('Parse order failed:', error);
		return null;
	}
}

export async function listInternalOrders(limit = 50): Promise<InternalOrder[]> {
	if (hasDbPersistence()) {
		const dbOrders = await listInternalOrdersFromDb(limit);
		if (dbOrders.length > 0) {
			dbOrders.forEach((order) => {
				cacheOrder(order);
			});
			return dbOrders;
		}
	}

	if (!hasKvPersistence()) {
		return listOrdersFromMemory(limit);
	}

	const keys = await kvListOrderKeys(Math.max(1, Math.min(limit, 200)));

	const fromKv = await Promise.all(
		keys.map(async (key) => {
			const raw = await kvGetText(key);
			if (!raw) return null;
			try {
				return JSON.parse(raw) as InternalOrder;
			} catch {
				return null;
			}
		})
	);

	const orders = fromKv.filter((order): order is InternalOrder => !!order);
	if (orders.length === 0) {
		return listOrdersFromMemory(limit);
	}

	orders.forEach((order) => {
		cacheOrder(order);
	});

	return orders.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

export async function findInternalOrderByPaymentCode(paymentCode: string): Promise<InternalOrder | null> {
	const normalized = normalizePaymentCode(paymentCode);
	const compact = compactPaymentCode(paymentCode);
	const store = getStore();
	const cachedOrderId = store.byPaymentCode.get(normalized);
	const cachedCompactOrderId = compact ? store.byPaymentCode.get(compact) : undefined;

	if (cachedOrderId) {
		return getInternalOrder(cachedOrderId);
	}

	if (cachedCompactOrderId) {
		store.byPaymentCode.set(normalized, cachedCompactOrderId);
		return getInternalOrder(cachedCompactOrderId);
	}

	if (hasDbPersistence()) {
		const dbOrderId = await findInternalOrderIdByPaymentCodeFromDb(paymentCode);
		if (dbOrderId) {
			store.byPaymentCode.set(normalized, dbOrderId);
			if (compact) {
				store.byPaymentCode.set(compact, dbOrderId);
			}
			return getInternalOrder(dbOrderId);
		}
	}

	if (!hasKvPersistence()) {
		const memoryMatch = listOrdersFromMemory(200).find(
			(order) => compactPaymentCode(order.paymentCode) === compact
		);

		if (!memoryMatch) return null;

		store.byPaymentCode.set(normalized, memoryMatch.id);
		if (compact) {
			store.byPaymentCode.set(compact, memoryMatch.id);
		}
		return memoryMatch;
	}

	let orderId = await kvGetText(`${PAYMENT_PREFIX}${normalized}`);
	if (!orderId && compact && compact !== normalized) {
		orderId = await kvGetText(`${PAYMENT_PREFIX}${compact}`);
	}

	if (!orderId && compact) {
		const orders = await listInternalOrders(200);
		const matched = orders.find((order) => compactPaymentCode(order.paymentCode) === compact);
		if (matched) {
			orderId = matched.id;
			await kvPutText(`${PAYMENT_PREFIX}${compact}`, orderId);
		}
	}

	if (!orderId) return null;

	store.byPaymentCode.set(normalized, orderId);
	if (compact) {
		store.byPaymentCode.set(compact, orderId);
	}
	return getInternalOrder(orderId);
}

export function extractPaymentCodeFromText(input: string): string | null {
	if (!input) return null;

	const normalized = input.toUpperCase();
	const compactInput = normalized.replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
	const prefix = resolveTransferPrefix();
	const compactPrefix = compactPaymentCode(prefix);
	const dashedRegex = new RegExp(`${prefix}-[A-Z0-9-]+`, 'i');
	const dashedMatched = normalized.match(dashedRegex);

	if (dashedMatched && dashedMatched.length > 0) {
		return dashedMatched[0].toUpperCase();
	}

	if (!compactPrefix || !compactInput.includes(compactPrefix)) {
		return null;
	}

	const compactRegex = new RegExp(`${compactPrefix}[A-Z0-9]{4,}`, 'i');
	const matched = compactInput.match(compactRegex);
	if (!matched || matched.length === 0) return null;

	const fullCompact = matched[0].toUpperCase();
	const afterPrefix = fullCompact.slice(compactPrefix.length);
	if (!afterPrefix) return null;

	const ahpIndex = afterPrefix.indexOf('AHP');
	const orderIdPart = ahpIndex >= 0 ? afterPrefix.slice(ahpIndex) : afterPrefix;
	if (orderIdPart.length < 4) return null;

	return `${compactPrefix}${orderIdPart}`;
}

export async function updateInternalOrder(
	orderId: string,
	patch: Partial<InternalOrder>
): Promise<InternalOrder | null> {
	const existing = await getInternalOrder(orderId);
	if (!existing) return null;

	const next = mergeOrder(existing, patch);
	const persisted = await persistOrder(next);
	cacheOrder(persisted);
	return persisted;
}

export async function cancelStalePendingOrders(
	orders: InternalOrder[],
	now = Date.now()
): Promise<{ orders: InternalOrder[]; cancelled: InternalOrder[] }> {
	const cancelled: InternalOrder[] = [];
	const updatedOrders = await Promise.all(
		orders.map(async (order) => {
			if (!isPendingOrderExpired(order, now)) return order;
			const updated = await updateInternalOrder(order.id, {
				status: 'cancelled' as InternalOrderStatus,
				paymentStatusMessage: 'Đơn đã bị hủy do quá 15 phút chưa thanh toán.',
			});
			const finalOrder = updated || order;
			cancelled.push(finalOrder);
			return finalOrder;
		}),
	);

	return { orders: updatedOrders, cancelled };
}

export async function markInternalOrderPaid(input: PaidUpdateInput): Promise<{
	order: InternalOrder | null;
	reason?: string;
}> {
	const order = await findInternalOrderByPaymentCode(input.paymentCode);
	if (!order) {
		return { order: null, reason: 'ORDER_NOT_FOUND' };
	}

	const now = Date.now();
	if (order.status === 'cancelled') {
		return { order, reason: 'ORDER_CANCELLED' };
	}

	if (isPendingOrderExpired(order, now)) {
		const cancelled = await updateInternalOrder(order.id, {
			status: 'cancelled' as InternalOrderStatus,
			paymentStatusMessage: 'Đơn đã bị hủy do quá 15 phút chưa thanh toán.',
		});
		return { order: cancelled || order, reason: 'ORDER_EXPIRED' };
	}

	const normalizedTransactionId = normalizeTransactionId(input.gatewayTransactionId);
	if (order.paymentMethod === 'banking' && !normalizedTransactionId) {
		return {
			order,
			reason: 'MISSING_SEPAY_TRANSACTION_ID',
		};
	}

	if (normalizedTransactionId) {
		const linkedOrderId = await findOrderIdByTransactionId(normalizedTransactionId);
		if (linkedOrderId && linkedOrderId !== order.id) {
			return {
				order,
				reason: `TRANSACTION_ALREADY_USED:${linkedOrderId}`,
			};
		}

		if (linkedOrderId && linkedOrderId === order.id) {
			if (order.status === 'paid') {
				return {
					order,
					reason: 'ALREADY_PAID',
				};
			}

			// Same transaction already linked to this order but order is still pending.
			// Continue processing to recover the order state to paid/underpaid deterministically.
		}
	}

	if (order.status === 'paid') {
		return { order, reason: 'ALREADY_PAID' };
	}

	if (input.transferAmount < order.amount) {
		const underpaid = await updateInternalOrder(order.id, {
			sepayTransactionId: normalizedTransactionId || order.sepayTransactionId,
			lastPaymentAmountReceived: input.transferAmount,
			lastPaymentCheckedAt: now,
			paymentStatusMessage: `Đã nhận ${input.transferAmount}. Cần thêm ${order.amount - input.transferAmount} để xác nhận đơn.`,
		});

		if (normalizedTransactionId) {
			await persistTransactionOrderIndex(normalizedTransactionId, order.id);
		}

		return {
			order: underpaid || order,
			reason: `AMOUNT_NOT_ENOUGH:${input.transferAmount}<${order.amount}`,
		};
	}

	const updated = await updateInternalOrder(order.id, {
		status: 'paid' as InternalOrderStatus,
		paidAt: now,
		sepayTransactionId: normalizedTransactionId || order.sepayTransactionId,
		lastPaymentAmountReceived: input.transferAmount,
		lastPaymentCheckedAt: now,
		paymentStatusMessage: 'Đã nhận đủ tiền. Hệ thống đang xử lý đơn hàng.',
		magentoSyncStatus: 'queued' as MagentoSyncStatus,
		magentoSyncError: 'Waiting Magento sync integration',
	});

	if (normalizedTransactionId) {
		await persistTransactionOrderIndex(normalizedTransactionId, order.id);
	}

	return { order: updated };
}

