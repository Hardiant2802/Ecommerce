'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart, useAuth } from '@/lib/hooks';
import { formatPrice } from '@/lib/utils/formatters';
import QRCode from 'react-qr-code';

type PaymentMethod = 'cod' | 'banking' | 'momo';

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get('itemId');
  const { cart, loading } = useCart();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [orderNote, setOrderNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId] = useState(() => `ORD-${Date.now().toString(36).toUpperCase()}`);
  const [momoQR, setMomoQR] = useState<string | null>(null);
  const [momoLoading, setMomoLoading] = useState(false);
  const [momoError, setMomoError] = useState<string | null>(null);

  const paymentMethodLabel: Record<PaymentMethod, string> = {
    cod: 'Thanh toán khi nhận hàng (COD)',
    banking: 'Chuyển khoản ngân hàng',
    momo: 'Ví MoMo',
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/checkout');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    setMomoQR(null);
    setMomoError(null);
  }, [paymentMethod]);

  const handleMomoPayment = async () => {
    setMomoLoading(true);
    setMomoError(null);
    try {
      const response = await fetch('/api/momo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(orderTotal),
          orderId,
          orderInfo: `Thanh toán đơn hàng ${orderId}`,
        }),
      });

      const data = await response.json();

      if (data.payUrl) {
        setMomoQR(data.payUrl);
      } else {
        setMomoError('Không thể tạo QR MoMo. Vui lòng thử lại.');
      }
    } catch {
      setMomoError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setMomoLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (paymentMethod === 'momo') {
      await handleMomoPayment();
    } else {
      setOrderPlaced(true);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-custom">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !cart || !cart.items || cart.items.length === 0;
  const checkoutItems = isEmpty
    ? []
    : itemId
      ? cart.items.filter((item) => item.id === itemId)
      : cart.items;

  if (isEmpty || checkoutItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-custom text-center py-20">
          <p className="text-gray-600 mb-4">Giỏ hàng của bạn đang trống.</p>
          <Link href="/" className="text-primary-600 underline">Tiếp tục mua sắm</Link>
        </div>
      </div>
    );
  }

  const currency = cart.prices.subtotal_excluding_tax.currency;
  const orderTotal = checkoutItems.reduce((sum, item) => {
    const unitPrice =
      item.product.price_range?.minimum_price?.regular_price?.value ??
      item.prices.price.value;
    return sum + unitPrice * item.quantity;
  }, 0);
  const formattedTotal = formatPrice(orderTotal, currency);

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-custom">
          <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Đặt hàng thành công!</h2>
            <p className="text-gray-600 mb-1">
              Mã đơn hàng: <strong className="text-primary-700">{orderId}</strong>
            </p>
            <p className="text-gray-600 mb-6 text-sm">
              Bạn đã chọn {paymentMethodLabel[paymentMethod].toLowerCase()}. Chúng tôi sẽ liên hệ xác nhận sớm nhất.
            </p>
            <Link
              href="/"
              className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-primary-600">Trang chủ</Link>
          <span>/</span>
          <Link href="/cart" className="hover:text-primary-600">Giỏ hàng</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Thanh toán</span>
        </div>

        <h1 className="text-2xl font-bold mb-6">Thanh toán</h1>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Đơn hàng của bạn</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {checkoutItems.map((item) => {
                  const unitPrice =
                    item.product.price_range?.minimum_price?.regular_price?.value ??
                    item.prices.price.value;
                  return (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="w-14 h-14 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                        <img
                          src={item.product.thumbnail?.url || '/images/placeholder.svg'}
                          alt={item.product.name}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => { e.currentTarget.src = '/images/placeholder.svg'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-500">x{item.quantity}</p>
                      </div>
                      <span className="font-semibold text-sm text-gray-900 flex-shrink-0">
                        {formatPrice(unitPrice * item.quantity, item.prices.row_total.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-4 bg-gray-50 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Vận chuyển</span>
                  <span className="text-green-600 font-medium">Miễn phí</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-lg border-t border-gray-200 pt-2">
                  <span>Tổng cộng</span>
                  <span className="text-primary-600">{formattedTotal}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ghi chú đơn hàng (tuỳ chọn)
              </label>
              <textarea
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="Màu sắc, phiên bản, yêu cầu giao hàng..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
              <h2 className="font-bold text-gray-900">Phương thức thanh toán</h2>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`w-full text-left border rounded-lg px-4 py-3 transition-colors ${
                    paymentMethod === 'cod' ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">Thanh toán khi nhận hàng (COD)</p>
                  <p className="text-xs text-gray-600 mt-1">Thanh toán tiền mặt khi nhận hàng.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('banking')}
                  className={`w-full text-left border rounded-lg px-4 py-3 transition-colors ${
                    paymentMethod === 'banking' ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">Chuyển khoản ngân hàng</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Bạn sẽ xử lý sau</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Đặt đơn với hình thức chuyển khoản.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('momo')}
                  className={`w-full text-left border rounded-lg px-4 py-3 transition-colors ${
                    paymentMethod === 'momo' ? 'border-pink-300 bg-pink-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-pink-600 text-lg">💳</span>
                      <p className="text-sm font-medium text-gray-900">Ví MoMo</p>
                    </div>
                    {paymentMethod === 'momo' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 font-semibold">Đã chọn</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Quét mã QR để thanh toán qua ví MoMo.</p>
                </button>
              </div>

              <button
                onClick={handleConfirmOrder}
                disabled={momoLoading}
                className={`w-full font-bold py-3 rounded-xl transition-colors text-white ${
                  paymentMethod === 'momo'
                    ? 'bg-pink-600 hover:bg-pink-700'
                    : 'bg-primary-600 hover:bg-primary-700'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {momoLoading ? 'Đang tạo QR...' : `Xác nhận đặt hàng (${paymentMethodLabel[paymentMethod]})`}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-6 text-sm text-gray-700 space-y-3">
              {paymentMethod === 'momo' && momoQR ? (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">💜</span>
                    <h3 className="font-bold text-pink-600 text-lg">Quét mã QR để thanh toán</h3>
                  </div>
                  <div className="border-4 border-pink-200 rounded-2xl p-4 inline-block bg-white">
                    <QRCode
                      value={momoQR}
                      size={192}
                      style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">Mở app MoMo → Quét mã → Xác nhận thanh toán</p>
                  <div className="bg-pink-50 rounded-lg p-3 text-left space-y-1">
                    <p className="text-xs font-semibold text-pink-700">Số tiền: {formattedTotal}</p>
                    <p className="text-xs text-gray-500">Mã đơn: {orderId}</p>
                  </div>
                  <button
                    onClick={() => { setMomoQR(null); setOrderPlaced(true); }}
                    className="w-full bg-pink-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-pink-700 transition-colors"
                  >
                    Tôi đã thanh toán xong
                  </button>
                </div>
              ) : paymentMethod === 'momo' && !momoQR ? (
                <div className="text-center space-y-3">
                  <span className="text-4xl">💜</span>
                  <h3 className="font-bold text-pink-600">Ví MoMo</h3>
                  <p className="text-gray-600 text-xs">
                    Bấm <strong>Xác nhận đặt hàng</strong> để tạo mã QR thanh toán.
                  </p>
                  {momoError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-600 text-xs">{momoError}</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-gray-900">
                    {paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản ngân hàng'}
                  </h3>
                  <p>
                    {paymentMethod === 'cod'
                      ? 'Bạn thanh toán bằng tiền mặt khi shipper giao hàng đến tay.'
                      : 'Tạm thời ghi nhận lựa chọn chuyển khoản. Bạn sẽ cấu hình thông tin tài khoản nhận tiền sau.'}
                  </p>
                </>
              )}

              {paymentMethod !== 'momo' && (
                <p className="text-xs text-gray-500">
                  Đơn hàng sẽ được xử lý trong 24 giờ làm việc sau khi đặt hàng.
                </p>
              )}
            </div>

            <Link
              href="/cart"
              className="block text-center text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Quay lại giỏ hàng
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}