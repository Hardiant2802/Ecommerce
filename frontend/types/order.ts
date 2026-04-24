export type InternalPaymentMethod = 'cod' | 'banking' | 'momo';

export type InternalOrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

export type MagentoSyncStatus = 'not_started' | 'queued' | 'success' | 'failed';

export interface InternalOrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  rowTotal: number;
}

export interface InternalOrder {
  id: string;
  paymentMethod: InternalPaymentMethod;
  paymentCode: string;
  status: InternalOrderStatus;
  amount: number;
  currency: string;
  note?: string;
  customerEmail?: string;
  items: InternalOrderItem[];
  bankName?: string;
  bankBin?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  qrUrl?: string;
  sepayTransactionId?: string;
  paidAt?: number;
  lastPaymentAmountReceived?: number;
  lastPaymentCheckedAt?: number;
  paymentStatusMessage?: string;
  createdAt: number;
  updatedAt: number;
  magentoSyncStatus: MagentoSyncStatus;
  magentoOrderNumber?: string;
  magentoQuoteId?: string;
  magentoSyncError?: string;
}

export interface CreateInternalOrderInput {
  paymentMethod: InternalPaymentMethod;
  amount: number;
  currency: string;
  note?: string;
  customerEmail?: string;
  items: InternalOrderItem[];
}
