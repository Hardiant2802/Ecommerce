import { NextRequest, NextResponse } from 'next/server';
import { getInternalOrder } from '@/lib/services/internalOrders';

export const runtime = 'edge';

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
