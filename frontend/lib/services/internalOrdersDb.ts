import mysql from 'mysql2/promise';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { InternalOrder, InternalOrderItem, InternalOrderShippingAddress } from '@/types/order';

interface InternalOrdersDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface InternalOrderRow extends RowDataPacket {
  id: string;
  payment_method: string;
  payment_code: string;
  status: string;
  amount: number | string;
  currency: string;
  note: string | null;
  customer_email: string | null;
  shipping_address_json: string | null;
  shipping_carrier: string | null;
  shipping_fee: number | string | null;
  bank_name: string | null;
  bank_bin: string | null;
  bank_account_no: string | null;
  bank_account_name: string | null;
  qr_url: string | null;
  sepay_transaction_id: string | null;
  paid_at: number | null;
  last_payment_amount_received: number | string | null;
  last_payment_checked_at: number | null;
  payment_status_message: string | null;
  created_at: number | string;
  updated_at: number | string;
  magento_sync_status: string;
  magento_order_number: string | null;
  magento_quote_id: string | null;
  magento_sync_error: string | null;
}

interface InternalOrderItemRow extends RowDataPacket {
  order_id: string;
  sku: string;
  name: string;
  quantity: number | string;
  unit_price: number | string;
  row_total: number | string;
}

const DB_POOL_KEY = '__AHPHONE_INTERNAL_ORDERS_DB_POOL__';
const DB_SCHEMA_PROMISE_KEY = '__AHPHONE_INTERNAL_ORDERS_DB_SCHEMA_PROMISE__';

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

function normalizePaymentCodeCompact(value: string): string {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function parseShippingAddress(raw: string | null): InternalOrderShippingAddress | undefined {
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as Partial<InternalOrderShippingAddress>;
    if (
      !parsed.fullName ||
      !parsed.phone ||
      !parsed.street ||
      !parsed.ward ||
      !parsed.district ||
      !parsed.province
    ) {
      return undefined;
    }

    return {
      fullName: parsed.fullName,
      phone: parsed.phone,
      street: parsed.street,
      ward: parsed.ward,
      district: parsed.district,
      province: parsed.province,
      countryCode: parsed.countryCode || 'VN',
      provinceId: parsed.provinceId,
      districtId: parsed.districtId,
      wardId: parsed.wardId,
    };
  } catch {
    return undefined;
  }
}

function getDbConfig(): InternalOrdersDbConfig | null {
  const enabledRaw = (process.env.INTERNAL_ORDERS_DB_ENABLED || '').trim().toLowerCase();
  if (enabledRaw === '0' || enabledRaw === 'false' || enabledRaw === 'no' || enabledRaw === 'off') {
    return null;
  }

  const host = (
    process.env.INTERNAL_ORDERS_DB_HOST ||
    process.env.DB_HOST ||
    process.env.MYSQL_HOST ||
    ''
  ).trim();
  const user = (
    process.env.INTERNAL_ORDERS_DB_USER ||
    process.env.DB_USER ||
    process.env.MYSQL_USER ||
    ''
  ).trim();
  const password = (
    process.env.INTERNAL_ORDERS_DB_PASSWORD ||
    process.env.DB_PASSWORD ||
    process.env.MYSQL_PASSWORD ||
    ''
  ).trim();
  const database = (
    process.env.INTERNAL_ORDERS_DB_NAME ||
    process.env.DB_NAME ||
    process.env.DB_DATABASE ||
    process.env.MYSQL_DATABASE ||
    ''
  ).trim();

  const portRaw =
    process.env.INTERNAL_ORDERS_DB_PORT ||
    process.env.DB_PORT ||
    process.env.MYSQL_PORT ||
    '3306';
  const parsedPort = Number(portRaw);
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? Math.floor(parsedPort) : 3306;

  if (!host || !user || !database) {
    return null;
  }

  return {
    host,
    port,
    user,
    password,
    database,
  };
}

export function hasDbPersistence(): boolean {
  return getDbConfig() !== null;
}

function getGlobalScope(): typeof globalThis & {
  [DB_POOL_KEY]?: Pool;
  [DB_SCHEMA_PROMISE_KEY]?: Promise<boolean>;
} {
  return globalThis as typeof globalThis & {
    [DB_POOL_KEY]?: Pool;
    [DB_SCHEMA_PROMISE_KEY]?: Promise<boolean>;
  };
}

async function getPool(): Promise<Pool | null> {
  const config = getDbConfig();
  if (!config) {
    return null;
  }

  const globalScope = getGlobalScope();
  if (!globalScope[DB_POOL_KEY]) {
    globalScope[DB_POOL_KEY] = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
    });
  }

  return globalScope[DB_POOL_KEY] || null;
}

async function ensureSchema(): Promise<boolean> {
  const globalScope = getGlobalScope();
  if (globalScope[DB_SCHEMA_PROMISE_KEY]) {
    return globalScope[DB_SCHEMA_PROMISE_KEY] as Promise<boolean>;
  }

  globalScope[DB_SCHEMA_PROMISE_KEY] = (async () => {
    const pool = await getPool();
    if (!pool) return false;

    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS ah_internal_orders (
          id VARCHAR(64) PRIMARY KEY,
          payment_method VARCHAR(16) NOT NULL,
          payment_code VARCHAR(128) NOT NULL,
          payment_code_compact VARCHAR(128) NOT NULL,
          status VARCHAR(16) NOT NULL,
          amount DECIMAL(18,2) NOT NULL,
          currency VARCHAR(16) NOT NULL,
          note TEXT NULL,
          customer_email VARCHAR(255) NULL,
          shipping_address_json TEXT NULL,
          shipping_carrier VARCHAR(16) NULL,
          shipping_fee DECIMAL(18,2) NULL,
          bank_name VARCHAR(128) NULL,
          bank_bin VARCHAR(32) NULL,
          bank_account_no VARCHAR(128) NULL,
          bank_account_name VARCHAR(255) NULL,
          qr_url TEXT NULL,
          sepay_transaction_id VARCHAR(128) NULL,
          paid_at BIGINT NULL,
          last_payment_amount_received DECIMAL(18,2) NULL,
          last_payment_checked_at BIGINT NULL,
          payment_status_message TEXT NULL,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          magento_sync_status VARCHAR(32) NOT NULL,
          magento_order_number VARCHAR(128) NULL,
          magento_quote_id VARCHAR(128) NULL,
          magento_sync_error TEXT NULL,
          UNIQUE KEY uniq_ah_internal_orders_payment_code_compact (payment_code_compact),
          UNIQUE KEY uniq_ah_internal_orders_sepay_transaction_id (sepay_transaction_id),
          KEY idx_ah_internal_orders_customer_email (customer_email),
          KEY idx_ah_internal_orders_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await pool.execute(`
        ALTER TABLE ah_internal_orders
          ADD COLUMN IF NOT EXISTS shipping_address_json TEXT NULL AFTER customer_email,
          ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(16) NULL AFTER shipping_address_json,
          ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(18,2) NULL AFTER shipping_carrier;
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS ah_internal_order_items (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          order_id VARCHAR(64) NOT NULL,
          sku VARCHAR(128) NOT NULL,
          name VARCHAR(255) NOT NULL,
          quantity INT NOT NULL,
          unit_price DECIMAL(18,2) NOT NULL,
          row_total DECIMAL(18,2) NOT NULL,
          created_at BIGINT NOT NULL,
          KEY idx_ah_internal_order_items_order_id (order_id),
          CONSTRAINT fk_ah_internal_order_items_order
            FOREIGN KEY (order_id) REFERENCES ah_internal_orders(id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      return true;
    } catch (error) {
      console.error('Ensure internal orders DB schema failed:', error);
      return false;
    }
  })();

  return globalScope[DB_SCHEMA_PROMISE_KEY] as Promise<boolean>;
}

function mapRowToOrder(row: InternalOrderRow, items: InternalOrderItem[]): InternalOrder {
  return {
    id: row.id,
    paymentMethod: row.payment_method as InternalOrder['paymentMethod'],
    paymentCode: row.payment_code,
    status: row.status as InternalOrder['status'],
    amount: toNumber(row.amount),
    currency: row.currency,
    note: row.note || undefined,
    customerEmail: row.customer_email || undefined,
    shippingAddress: parseShippingAddress(row.shipping_address_json),
    shippingCarrier: row.shipping_carrier === 'ghn' || row.shipping_carrier === 'vtp' ? row.shipping_carrier : undefined,
    shippingFee: row.shipping_fee === null ? undefined : toNumber(row.shipping_fee),
    items,
    bankName: row.bank_name || undefined,
    bankBin: row.bank_bin || undefined,
    bankAccountNo: row.bank_account_no || undefined,
    bankAccountName: row.bank_account_name || undefined,
    qrUrl: row.qr_url || undefined,
    sepayTransactionId: row.sepay_transaction_id || undefined,
    paidAt: toOptionalNumber(row.paid_at),
    lastPaymentAmountReceived: toOptionalNumber(row.last_payment_amount_received),
    lastPaymentCheckedAt: toOptionalNumber(row.last_payment_checked_at),
    paymentStatusMessage: row.payment_status_message || undefined,
    createdAt: toNumber(row.created_at),
    updatedAt: toNumber(row.updated_at),
    magentoSyncStatus: row.magento_sync_status as InternalOrder['magentoSyncStatus'],
    magentoOrderNumber: row.magento_order_number || undefined,
    magentoQuoteId: row.magento_quote_id || undefined,
    magentoSyncError: row.magento_sync_error || undefined,
  };
}

type SqlExecutor = Pick<Pool, 'execute'>;

async function loadItemsByOrderIds(executor: SqlExecutor, orderIds: string[]): Promise<Map<string, InternalOrderItem[]>> {
  const result = new Map<string, InternalOrderItem[]>();
  if (orderIds.length === 0) {
    return result;
  }

  const placeholders = orderIds.map(() => '?').join(',');
  const [itemRows] = await executor.execute<InternalOrderItemRow[]>(
    `
      SELECT order_id, sku, name, quantity, unit_price, row_total
      FROM ah_internal_order_items
      WHERE order_id IN (${placeholders})
      ORDER BY id ASC
    `,
    orderIds,
  );

  for (const row of itemRows) {
    const orderItems = result.get(row.order_id) || [];
    orderItems.push({
      sku: row.sku,
      name: row.name,
      quantity: Math.max(0, Math.floor(toNumber(row.quantity))),
      unitPrice: toNumber(row.unit_price),
      rowTotal: toNumber(row.row_total),
    });
    result.set(row.order_id, orderItems);
  }

  return result;
}

async function withConnection<T>(runner: (conn: PoolConnection) => Promise<T>): Promise<T | null> {
  const schemaReady = await ensureSchema();
  if (!schemaReady) return null;

  const pool = await getPool();
  if (!pool) return null;

  const conn = await pool.getConnection();
  try {
    return await runner(conn);
  } catch (error) {
    console.error('Internal orders DB operation failed:', error);
    return null;
  } finally {
    conn.release();
  }
}

export async function upsertInternalOrderToDb(order: InternalOrder): Promise<InternalOrder | null> {
  return withConnection(async (conn) => {
    const paymentCodeCompact = normalizePaymentCodeCompact(order.paymentCode);

    await conn.beginTransaction();
    try {
      await conn.execute(
        `
          INSERT INTO ah_internal_orders (
            id,
            payment_method,
            payment_code,
            payment_code_compact,
            status,
            amount,
            currency,
            note,
            customer_email,
            shipping_address_json,
            shipping_carrier,
            shipping_fee,
            bank_name,
            bank_bin,
            bank_account_no,
            bank_account_name,
            qr_url,
            sepay_transaction_id,
            paid_at,
            last_payment_amount_received,
            last_payment_checked_at,
            payment_status_message,
            created_at,
            updated_at,
            magento_sync_status,
            magento_order_number,
            magento_quote_id,
            magento_sync_error
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            payment_method = VALUES(payment_method),
            payment_code = VALUES(payment_code),
            payment_code_compact = VALUES(payment_code_compact),
            status = VALUES(status),
            amount = VALUES(amount),
            currency = VALUES(currency),
            note = VALUES(note),
            customer_email = VALUES(customer_email),
            shipping_address_json = VALUES(shipping_address_json),
            shipping_carrier = VALUES(shipping_carrier),
            shipping_fee = VALUES(shipping_fee),
            bank_name = VALUES(bank_name),
            bank_bin = VALUES(bank_bin),
            bank_account_no = VALUES(bank_account_no),
            bank_account_name = VALUES(bank_account_name),
            qr_url = VALUES(qr_url),
            sepay_transaction_id = VALUES(sepay_transaction_id),
            paid_at = VALUES(paid_at),
            last_payment_amount_received = VALUES(last_payment_amount_received),
            last_payment_checked_at = VALUES(last_payment_checked_at),
            payment_status_message = VALUES(payment_status_message),
            created_at = VALUES(created_at),
            updated_at = VALUES(updated_at),
            magento_sync_status = VALUES(magento_sync_status),
            magento_order_number = VALUES(magento_order_number),
            magento_quote_id = VALUES(magento_quote_id),
            magento_sync_error = VALUES(magento_sync_error)
        `,
        [
          order.id,
          order.paymentMethod,
          order.paymentCode,
          paymentCodeCompact,
          order.status,
          order.amount,
          order.currency,
          order.note || null,
          order.customerEmail || null,
          order.shippingAddress ? JSON.stringify(order.shippingAddress) : null,
          order.shippingCarrier || null,
          order.shippingFee ?? null,
          order.bankName || null,
          order.bankBin || null,
          order.bankAccountNo || null,
          order.bankAccountName || null,
          order.qrUrl || null,
          order.sepayTransactionId || null,
          order.paidAt || null,
          order.lastPaymentAmountReceived || null,
          order.lastPaymentCheckedAt || null,
          order.paymentStatusMessage || null,
          order.createdAt,
          order.updatedAt,
          order.magentoSyncStatus,
          order.magentoOrderNumber || null,
          order.magentoQuoteId || null,
          order.magentoSyncError || null,
        ],
      );

      await conn.execute('DELETE FROM ah_internal_order_items WHERE order_id = ?', [order.id]);
      for (const item of order.items) {
        await conn.execute(
          `
            INSERT INTO ah_internal_order_items (
              order_id,
              sku,
              name,
              quantity,
              unit_price,
              row_total,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            order.id,
            item.sku,
            item.name,
            Math.max(0, Math.floor(item.quantity)),
            item.unitPrice,
            item.rowTotal,
            order.createdAt,
          ],
        );
      }

      await conn.commit();
      return order;
    } catch (error) {
      await conn.rollback();
      throw error;
    }
  });
}

export async function getInternalOrderFromDb(orderId: string): Promise<InternalOrder | null> {
  return withConnection(async (conn) => {
    const [orderRows] = await conn.execute<InternalOrderRow[]>(
      `
        SELECT
          id,
          payment_method,
          payment_code,
          status,
          amount,
          currency,
          note,
          customer_email,
          shipping_address_json,
          shipping_carrier,
          shipping_fee,
          bank_name,
          bank_bin,
          bank_account_no,
          bank_account_name,
          qr_url,
          sepay_transaction_id,
          paid_at,
          last_payment_amount_received,
          last_payment_checked_at,
          payment_status_message,
          created_at,
          updated_at,
          magento_sync_status,
          magento_order_number,
          magento_quote_id,
          magento_sync_error
        FROM ah_internal_orders
        WHERE id = ?
        LIMIT 1
      `,
      [orderId],
    );

    if (orderRows.length === 0) {
      return null;
    }

    const orderRow = orderRows[0];
    const itemsMap = await loadItemsByOrderIds(conn, [orderRow.id]);
    const items = itemsMap.get(orderRow.id) || [];
    return mapRowToOrder(orderRow, items);
  });
}

export async function listInternalOrdersFromDb(limit = 50): Promise<InternalOrder[]> {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));

  const rows = await withConnection(async (conn) => {
    const [orderRows] = await conn.execute<InternalOrderRow[]>(
      `
        SELECT
          id,
          payment_method,
          payment_code,
          status,
          amount,
          currency,
          note,
          customer_email,
          shipping_address_json,
          shipping_carrier,
          shipping_fee,
          bank_name,
          bank_bin,
          bank_account_no,
          bank_account_name,
          qr_url,
          sepay_transaction_id,
          paid_at,
          last_payment_amount_received,
          last_payment_checked_at,
          payment_status_message,
          created_at,
          updated_at,
          magento_sync_status,
          magento_order_number,
          magento_quote_id,
          magento_sync_error
        FROM ah_internal_orders
        ORDER BY created_at DESC
        LIMIT ?
      `,
      [safeLimit],
    );

    return orderRows;
  });

  if (!rows || rows.length === 0) {
    return [];
  }

  const pool = await getPool();
  if (!pool) return [];

  const orderIds = rows.map((row) => row.id);
  const itemsMap = await loadItemsByOrderIds(pool, orderIds);

  return rows.map((row) => mapRowToOrder(row, itemsMap.get(row.id) || []));
}

export async function findInternalOrderIdByPaymentCodeFromDb(paymentCode: string): Promise<string | null> {
  const compactCode = normalizePaymentCodeCompact(paymentCode);
  if (!compactCode) return null;

  const row = await withConnection(async (conn) => {
    const [rows] = await conn.execute<Array<RowDataPacket & { id: string }>>(
      `
        SELECT id
        FROM ah_internal_orders
        WHERE payment_code_compact = ?
        LIMIT 1
      `,
      [compactCode],
    );

    return rows[0] || null;
  });

  return row?.id || null;
}

export async function findInternalOrderIdByTransactionIdFromDb(transactionId: string): Promise<string | null> {
  const normalized = String(transactionId || '').trim();
  if (!normalized) return null;

  const row = await withConnection(async (conn) => {
    const [rows] = await conn.execute<Array<RowDataPacket & { id: string }>>(
      `
        SELECT id
        FROM ah_internal_orders
        WHERE sepay_transaction_id = ?
        LIMIT 1
      `,
      [normalized],
    );

    return rows[0] || null;
  });

  return row?.id || null;
}
