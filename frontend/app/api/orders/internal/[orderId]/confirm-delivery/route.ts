import { NextRequest, NextResponse } from 'next/server';
import { getInternalOrder, markInternalOrderPaid, updateInternalOrder } from '@/lib/services/internalOrders';
import { syncPaidOrderToMagentoRealtime } from '@/lib/services/magentoRealtimeSync';

export const runtime = 'nodejs';

interface RouteProps {
  params: Promise<{ orderId: string }>;
}

/**
 * POST /api/orders/internal/:orderId/confirm-delivery
 * Khách xác nhận đã nhận hàng COD → đánh dấu paid → sync Magento → processing
 */
export async function POST(_request: NextRequest, { params }: RouteProps) {
  const { orderId } = await params;

  const order = await getInternalOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: 'Không tìm thấy đơn hàng.' }, { status: 404 });
  }

  if (order.paymentMethod !== 'cod') {
    return NextResponse.json({ error: 'Chỉ áp dụng cho đơn COD.' }, { status: 400 });
  }

  if (order.status === 'paid') {
    return NextResponse.json({ ok: true, message: 'Đơn đã được xác nhận trước đó.', order });
  }

  // Đánh dấu paid (COD - không cần gatewayTransactionId)
  const paidUpdate = await updateInternalOrder(orderId, {
    status: 'paid',
    paidAt: Date.now(),
    lastPaymentAmountReceived: order.amount,
    lastPaymentCheckedAt: Date.now(),
    paymentStatusMessage: 'Khách xác nhận đã nhận hàng và thanh toán COD.',
  });

  const paidOrder = paidUpdate || order;

  // Sync sang Magento: tạo invoice + chuyển sang processing
  const synced = await syncPaidOrderToMagentoRealtime(paidOrder);
  const finalOrder = synced || paidOrder;

  return NextResponse.json({
    ok: true,
    message: 'Đơn hàng đã được xác nhận giao thành công.',
    order: finalOrder,
  });
}
