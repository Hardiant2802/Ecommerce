'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatPrice } from '@/lib/utils/formatters';

interface AdminOrder {
  id: string;
  paymentMethod: 'cod' | 'banking' | 'momo';
  paymentCode: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  customerEmail?: string;
  createdAt: number;
  updatedAt: number;
  magentoSyncStatus: 'not_started' | 'queued' | 'success' | 'failed';
  magentoSyncError?: string;
  magentoOrderNumber?: string;
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('vi-VN');
}

export default function AdminOrdersPage() {
  const searchParams = useSearchParams();
  const adminKey = searchParams.get('key') || '';

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!adminKey) {
      setLoading(false);
      setError('Missing admin key in URL. Use /admin/orders?key=YOUR_KEY');
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/orders/internal?limit=200&adminKey=${encodeURIComponent(adminKey)}`, {
        method: 'GET',
        cache: 'no-store',
      });

      const payload = (await response.json()) as { orders?: AdminOrder[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Cannot load orders');
      }

      setOrders(payload.orders || []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Cannot load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();

    if (!adminKey) return;
    const timer = setInterval(() => {
      void fetchOrders();
    }, 7000);

    return () => clearInterval(timer);
  }, [adminKey]);

  const paidOrders = useMemo(() => orders.filter((order) => order.status === 'paid').length, [orders]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Theo doi don SePay</h1>
            <p className="text-sm text-gray-500 mt-1">
              Tong: {orders.length} | Da thanh toan: {paidOrders}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void fetchOrders();
              }}
              className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-semibold hover:bg-black"
            >
              Lam moi
            </button>
            <Link href="/checkout" className="text-sm underline text-gray-600 hover:text-gray-900">
              Mo checkout
            </Link>
          </div>
        </div>

        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-gray-500">Dang tai don hang...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="text-left px-4 py-3">Order ID</th>
                  <th className="text-left px-4 py-3">Payment</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-gray-100 align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{order.id}</div>
                      <div className="text-xs text-gray-500">{order.paymentCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{order.paymentMethod}</div>
                      <div className="text-xs text-gray-500">{order.customerEmail || 'guest'}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {formatPrice(order.amount, order.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${
                        order.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-200 text-gray-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDateTime(order.updatedAt)}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Chua co don nao.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
