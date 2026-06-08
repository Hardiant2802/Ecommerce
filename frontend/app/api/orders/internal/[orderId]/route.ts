import { NextRequest, NextResponse } from 'next/server';
import { getInternalOrder, updateInternalOrder } from '@/lib/services/internalOrders';

export const runtime = 'nodejs';

interface RouteProps {
  params: Promise<{
    orderId: string;
  }>;
}

export async function GET(_request: NextRequest, { params }: RouteProps) {
  const { orderId } = await params;
  const order = await getInternalOrder(orderId);

  if (!order) {
    return NextResponse.json({ error: 'Khong tim thay don hang.' }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function PATCH(request: NextRequest, { params }: RouteProps) {
  const { orderId } = await params;
  const order = await getInternalOrder(orderId);

  if (!order) {
    return NextResponse.json({ error: 'Khong tim thay don hang.' }, { status: 404 });
  }

  let action = '';
  try {
    const body = (await request.json()) as { action?: string };
    action = body?.action ?? '';
  } catch {
    action = '';
  }

  if (action !== 'cancel') {
    return NextResponse.json({ error: 'Hanh dong khong hop le.' }, { status: 400 });
  }

  // Chỉ cho hủy đơn đang chờ; không đụng vào đơn đã thanh toán
  if (order.status !== 'pending') {
    return NextResponse.json({ order });
  }

  const cancelled = await updateInternalOrder(orderId, {
    status: 'cancelled',
    paymentStatusMessage: 'Đơn đã bị hủy do khách chuyển sang phương thức thanh toán khác.',
  });

  return NextResponse.json({ order: cancelled || order });
}

