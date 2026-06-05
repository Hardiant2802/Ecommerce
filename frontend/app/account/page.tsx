'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks';
import { graphqlClient } from '@/lib/graphql/client';
import { CHANGE_PASSWORD } from '@/lib/graphql/queries/auth';
import type { InternalOrder } from '@/types/order';

/* ─────────────────── helpers ─────────────────── */
function formatDate(raw?: string | null | number) {
  if (!raw) return '—';
  const d = typeof raw === 'number' ? new Date(raw) : new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(ts?: number) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('vi-VN');
}

function formatCurrency(value: number, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(value);
}

const GENDER_LABEL: Record<number, string> = { 1: 'Nam', 2: 'Nữ', 3: 'Không xác định' };

/* Internal order status helpers */
function internalStatusColor(status: string) {
  switch (status) {
    case 'paid':      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'pending':   return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'failed':    return 'bg-red-50 text-red-600 ring-red-200';
    case 'cancelled': return 'bg-gray-100 text-gray-500 ring-gray-200';
    default:          return 'bg-gray-100 text-gray-600 ring-gray-200';
  }
}

function internalStatusLabel(status: string, paymentMethod: string) {
  if (status === 'paid') return '✓ Đã thanh toán';
  if (status === 'pending' && paymentMethod === 'cod') return 'COD – Chờ giao';
  if (status === 'pending') return 'Chờ thanh toán';
  if (status === 'failed') return 'Thất bại';
  if (status === 'cancelled') return 'Đã hủy';
  return status;
}

function paymentMethodLabel(method: string) {
  const map: Record<string, string> = {
    banking: 'Chuyển khoản',
    cod: 'COD',
    vnpay: 'VNPay',
    momo: 'MoMo',
  };
  return map[method] ?? method;
}

function shouldHideOrder(order: InternalOrder) {
  const keywords = ['WEBHOOK FALLBACK FINAL TEST', 'TEST-WEBHOOK-FALLBACK'];
  return (order.items ?? []).some((item) => {
    const n = String(item.name ?? '').toUpperCase();
    const s = String(item.sku ?? '').toUpperCase();
    return keywords.some((k) => n.includes(k) || s.includes(k));
  });
}

/* ─────────────────── avatar ─────────────────── */
function AvatarInitials({ firstname, lastname }: { firstname: string; lastname: string }) {
  const initials = `${firstname[0] ?? ''}${lastname[0] ?? ''}`.toUpperCase();
  return (
    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg select-none">
      <span className="text-2xl font-bold text-white tracking-wide">{initials}</span>
    </div>
  );
}

/* ─────────────────── tabs ─────────────────── */
type TabId = 'info' | 'password' | 'orders';
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'info',     label: 'Thông tin',    icon: '👤' },
  { id: 'password', label: 'Đổi mật khẩu', icon: '🔒' },
  { id: 'orders',   label: 'Đơn hàng',     icon: '📦' },
];

/* ─────────────────── Loading Skeleton ─────────────────── */
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-sm p-8 animate-pulse space-y-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gray-200" />
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-gray-200 rounded w-40" />
            <div className="h-4 bg-gray-200 rounded w-56" />
          </div>
        </div>
        <div className="space-y-3">
          {[80, 60, 70, 50].map((w, i) => (
            <div key={i} className={`h-4 bg-gray-200 rounded`} style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Unauthenticated ─────────────────── */
function UnauthenticatedView() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center max-w-md w-full">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Chưa đăng nhập</h2>
        <p className="text-sm text-gray-500 mb-7">Vui lòng đăng nhập để xem và quản lý thông tin tài khoản.</p>
        <Link href="/login" className="btn-primary w-full justify-center py-2.5 text-sm rounded-lg">
          Đăng nhập ngay
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────── Info Row ─────────────────── */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 w-40 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-gray-900 break-all">{value}</span>
    </div>
  );
}

/* ─────────────────── Password Tab ─────────────────── */
function PasswordTab({ token }: { token: string | null }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (form.next !== form.confirm) { setMsg({ type: 'err', text: 'Mật khẩu mới không khớp.' }); return; }
    if (form.next.length < 8) { setMsg({ type: 'err', text: 'Mật khẩu mới phải ít nhất 8 ký tự.' }); return; }
    startTransition(async () => {
      try {
        await graphqlClient({ query: CHANGE_PASSWORD, variables: { currentPassword: form.current, newPassword: form.next }, token: token ?? undefined });
        setMsg({ type: 'ok', text: 'Đổi mật khẩu thành công!' });
        setForm({ current: '', next: '', confirm: '' });
      } catch (err) {
        setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Đổi mật khẩu thất bại.' });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-gray-500">Mật khẩu phải ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.</p>
      {(['current', 'next', 'confirm'] as const).map((field) => {
        const labels = { current: 'Mật khẩu hiện tại', next: 'Mật khẩu mới', confirm: 'Xác nhận mật khẩu mới' };
        return (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels[field]}</label>
            <input type="password" autoComplete={field === 'current' ? 'current-password' : 'new-password'}
              required value={form[field]} onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
              className="input" placeholder="••••••••" />
          </div>
        );
      })}
      {msg && (
        <div className={`text-sm rounded-lg px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </div>
      )}
      <button type="submit" disabled={isPending} className="btn-primary w-full py-2.5 rounded-lg disabled:opacity-60">
        {isPending ? 'Đang lưu…' : 'Cập nhật mật khẩu'}
      </button>
    </form>
  );
}

/* ─────────────────── Internal Order Card ─────────────────── */
function InternalOrderCard({ order, onConfirmDelivery }: { order: InternalOrder; onConfirmDelivery?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const isCodPending = order.paymentMethod === 'cod' && order.status === 'pending';

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/orders/internal/${encodeURIComponent(order.id)}/confirm-delivery`, { method: 'POST' });
      if (res.ok) {
        setConfirmed(true);
        onConfirmDelivery?.(order.id);
      } else {
        const d = await res.json();
        alert(d.error || 'Không thể xác nhận. Vui lòng liên hệ hỗ trợ.');
      }
    } catch {
      alert('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${isCodPending ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 hover:border-primary-300'}`}>
      {/* Header row */}
      <button onClick={() => setOpen((p) => !p)}
        className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 text-left hover:bg-gray-50/80 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <span className="text-lg">📦</span>
          </div>
          <div className="min-w-0">
            {/* Tên sản phẩm in đậm lên trước */}
            <p className="font-bold text-gray-900 text-sm line-clamp-1">
              {(order.items ?? []).map((it) => `${it.name} x${it.quantity}`).join(', ') || 'Không có sản phẩm'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(order.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{paymentMethodLabel(order.paymentMethod)}</span>
          <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${internalStatusColor(order.status)}`}>
            {internalStatusLabel(order.status, order.paymentMethod)}
          </span>
          <span className="font-bold text-gray-900 text-sm whitespace-nowrap">
            {formatCurrency(order.amount, order.currency)}
          </span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
          {/* Items */}
          <div className="space-y-2">
            {(order.items ?? []).map((item, i) => (
              <div key={i} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">x{item.quantity}</p>
                </div>
                <span className="text-gray-700 font-medium whitespace-nowrap ml-4">
                  {formatCurrency(item.rowTotal, order.currency)}
                </span>
              </div>
            ))}
          </div>

          {/* Paid info */}
          {order.status === 'paid' && order.paidAt && (
            <p className="text-xs text-emerald-600">✓ Đã thanh toán lúc: {formatDateTime(order.paidAt)}</p>
          )}

          {/* COD confirm button */}
          {isCodPending && !confirmed && (
            <button type="button" onClick={handleConfirm} disabled={confirming}
              className="w-full mt-1 bg-amber-600 text-white font-semibold py-2 rounded-lg hover:bg-amber-700 transition-colors text-sm disabled:opacity-60">
              {confirming ? 'Đang xác nhận...' : '✅ Tôi đã nhận được hàng'}
            </button>
          )}
          {confirmed && (
            <div className="w-full text-center py-2 rounded-lg bg-emerald-100 text-emerald-700 font-semibold text-sm">
              ✅ Đã xác nhận nhận hàng thành công
            </div>
          )}

          {/* Repurchase */}
          {order.status === 'paid' && (order.items?.length ?? 0) > 0 && (
            <Link href={`/checkout?sku=${encodeURIComponent(order.items[0].sku)}&payment=banking&mode=single&buyAgain=1`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-800 hover:underline mt-1">
              🔄 Mua lại
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Orders Tab ─────────────────── */
function OrdersTab({ email }: { email: string }) {
  const [orders, setOrders] = useState<InternalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllPaid, setShowAllPaid] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/orders/internal?paidOnly=0&limit=200&customerEmail=${encodeURIComponent(email)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw: InternalOrder[] = Array.isArray(data?.orders) ? data.orders : [];
      const filtered = raw
        .filter((o) => !shouldHideOrder(o))
        .sort((a, b) => {
          const at = a.paidAt || a.updatedAt || a.createdAt || 0;
          const bt = b.paidAt || b.updatedAt || b.createdAt || 0;
          return bt - at;
        });
      setOrders(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleConfirmed = useCallback((id: string) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: 'paid' as const, paidAt: Date.now() } : o));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 text-sm mb-3">{error}</p>
        <button onClick={fetchOrders} className="text-sm text-primary-600 hover:underline">Thử lại</button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📦</span>
        </div>
        <p className="text-gray-500 font-medium">Chưa có đơn hàng nào</p>
        <p className="text-sm text-gray-400 mt-1">Sau khi thanh toán thành công, đơn hàng sẽ xuất hiện tại đây.</p>
        <Link href="/" className="inline-block mt-6 btn-primary px-6 py-2.5 rounded-lg text-sm">
          Mua sắm ngay
        </Link>
      </div>
    );
  }

  const paidOrders = orders.filter((o) => o.status === 'paid');
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const PAID_INITIAL_SHOW = 5;
  const visiblePaidOrders = showAllPaid ? paidOrders : paidOrders.slice(0, PAID_INITIAL_SHOW);

  return (
    <div className="space-y-6">
      {/* COD / pending đơn */}
      {pendingOrders.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
            Đơn đang chờ ({pendingOrders.length})
          </h3>
          <div className="space-y-3">
            {pendingOrders.map((o) => (
              <InternalOrderCard key={o.id} order={o} onConfirmDelivery={handleConfirmed} />
            ))}
          </div>
        </div>
      )}

      {/* Đơn đã thanh toán */}
      {paidOrders.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Đã thanh toán ({paidOrders.length})
          </h3>
          <div className="space-y-3">
            {visiblePaidOrders.map((o) => (
              <InternalOrderCard key={o.id} order={o} />
            ))}
          </div>

          {paidOrders.length > PAID_INITIAL_SHOW && (
            <button
              type="button"
              onClick={() => setShowAllPaid((prev) => !prev)}
              className="w-full mt-3 py-2.5 text-sm font-semibold text-primary-600 hover:text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
            >
              {showAllPaid
                ? '▲ Rút gọn'
                : `▼ Xem thêm ${paidOrders.length - PAID_INITIAL_SHOW} đơn hàng`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Main Page ─────────────────── */
export default function AccountPage() {
  const { user, token, isAuthenticated, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('info');

  if (loading) return <LoadingSkeleton />;
  if (!isAuthenticated || !user) return <UnauthenticatedView />;

  const memberSince = formatDate(user.created_at);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Header card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <AvatarInitials firstname={user.firstname} lastname={user.lastname} />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {user.firstname} {user.lastname}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{user.email}</p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  Thành viên từ {memberSince}
                </span>
                {user.is_subscribed && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full ring-1 ring-emerald-200">
                    ✉ Đã đăng ký nhận tin
                  </span>
                )}
              </div>
            </div>
            <button onClick={logout}
              className="self-start sm:self-center inline-flex items-center gap-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors border border-red-100 hover:border-red-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Đăng xuất
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors
                  ${activeTab === tab.id
                    ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-6 sm:p-8">

            {/* INFO TAB */}
            {activeTab === 'info' && (
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Thông tin cá nhân</h2>
                <p className="text-sm text-gray-400 mb-6">Thông tin được đồng bộ từ tài khoản Magento.</p>
                <div>
                  <InfoRow label="Mã khách hàng" value={<span className="font-mono text-primary-700">#{user.id}</span>} />
                  <InfoRow label="Họ và tên" value={`${user.firstname} ${user.lastname}`} />
                  <InfoRow label="Email" value={user.email} />
                  <InfoRow label="Giới tính" value={user.gender ? (GENDER_LABEL[user.gender] ?? '—') : '—'} />
                  <InfoRow label="Ngày sinh" value={formatDate(user.date_of_birth)} />
                  <InfoRow label="Thành viên từ" value={memberSince} />
                  <InfoRow label="Đăng ký nhận tin" value={
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ring-1 ring-inset font-medium
                      ${user.is_subscribed ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-100 text-gray-500 ring-gray-200'}`}>
                      {user.is_subscribed ? '✓ Đã đăng ký' : 'Chưa đăng ký'}
                    </span>
                  } />
                </div>
              </div>
            )}

            {/* PASSWORD TAB */}
            {activeTab === 'password' && (
              <div className="flex flex-col items-center">
                <div className="w-full max-w-md text-center">
                  <h2 className="text-base font-semibold text-gray-900 mb-1">Đổi mật khẩu</h2>
                  <p className="text-sm text-gray-400 mb-6">Để bảo mật tài khoản, hãy dùng mật khẩu mạnh.</p>
                </div>
                <div className="w-full max-w-md">
                  <PasswordTab token={token} />
                </div>
              </div>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Lịch sử đơn hàng</h2>
                <p className="text-sm text-gray-400 mb-6">Các đơn hàng bạn đã đặt qua hệ thống thanh toán.</p>
                <OrdersTab email={user.email} />
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
