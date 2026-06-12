export type InternalPaymentMethod = 'cod' | 'banking' | 'momo' | 'vnpay';

export type InternalOrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

export type MagentoSyncStatus = 'not_started' | 'queued' | 'success' | 'failed';

export interface InternalOrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  rowTotal: number;
}

export interface InternalOrderShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  province: string;
  countryCode: string;
  provinceId?: string | number;
  districtId?: string | number;
  wardId?: string | number;
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
  shippingAddress?: InternalOrderShippingAddress;
  shippingCarrier?: 'ghn' | 'vtp';
  shippingFee?: number;
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
  shippingAddress: InternalOrderShippingAddress;
  shippingCarrier: 'ghn' | 'vtp';
  shippingFee: number;
  items: InternalOrderItem[];
}
