'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart, useAuth } from '@/lib/hooks';
import { formatPrice } from '@/lib/utils/formatters';
import QRCode from 'react-qr-code';

type PaymentMethod = 'cod' | 'banking' | 'momo';
type ShippingCarrier = 'ghn' | 'vtp';

interface GHNProvince { ProvinceID: number; ProvinceName: string; }
interface GHNDistrict { DistrictID: number; DistrictName: string; }
interface GHNWard { WardCode: string; WardName: string; }

interface VTPProvince { PROVINCE_ID: number; PROVINCE_NAME: string; }
interface VTPDistrict { DISTRICT_ID: number; DISTRICT_NAME: string; }
interface VTPWard { WARDS_ID: number; WARDS_NAME: string; }

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
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [shippingOrderCode, setShippingOrderCode] = useState<string | null>(null);

  // Địa chỉ
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Carrier
  const [shippingCarrier, setShippingCarrier] = useState<ShippingCarrier>('ghn');

  // GHN address
  const [ghnProvinces, setGhnProvinces] = useState<GHNProvince[]>([]);
  const [ghnDistricts, setGhnDistricts] = useState<GHNDistrict[]>([]);
  const [ghnWards, setGhnWards] = useState<GHNWard[]>([]);
  const [ghnProvince, setGhnProvince] = useState<GHNProvince | null>(null);
  const [ghnDistrict, setGhnDistrict] = useState<GHNDistrict | null>(null);
  const [ghnWard, setGhnWard] = useState<GHNWard | null>(null);

  // VTP address
  const [vtpProvinces, setVtpProvinces] = useState<VTPProvince[]>([]);
  const [vtpDistricts, setVtpDistricts] = useState<VTPDistrict[]>([]);
  const [vtpWards, setVtpWards] = useState<VTPWard[]>([]);
  const [vtpProvince, setVtpProvince] = useState<VTPProvince | null>(null);
  const [vtpDistrict, setVtpDistrict] = useState<VTPDistrict | null>(null);
  const [vtpWard, setVtpWard] = useState<VTPWard | null>(null);

  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);

  const paymentMethodLabel: Record<PaymentMethod, string> = {
    cod: 'Thanh toán khi nhận hàng (COD)',
    banking: 'Chuyển khoản ngân hàng',
    momo: 'Ví MoMo',
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login?redirect=/checkout');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => { setMomoQR(null); setMomoError(null); }, [paymentMethod]);

  // Reset fee khi đổi carrier
  useEffect(() => {
    setShippingFee(null);
  }, [shippingCarrier]);

  // Load GHN provinces
  useEffect(() => {
    fetch('/api/shipping/ghn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-province', payload: {} }),
    }).then(r => r.json()).then(data => {
      if (data.code === 200 && data.data) setGhnProvinces(data.data);
    }).catch(() => {});
  }, []);

  // Load VTP provinces
  useEffect(() => {
    fetch('/api/shipping/viettelpost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-province', payload: {} }),
    }).then(r => r.json()).then(data => {
      if (data.status === 200 && data.data) setVtpProvinces(data.data);
    }).catch(() => {});
  }, []);

  // GHN: load district
  useEffect(() => {
    if (!ghnProvince) { setGhnDistricts([]); setGhnDistrict(null); setGhnWards([]); setGhnWard(null); return; }
    fetch('/api/shipping/ghn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-district', payload: { province_id: ghnProvince.ProvinceID } }),
    }).then(r => r.json()).then(data => {
      if (data.code === 200 && data.data) setGhnDistricts(data.data);
      else setGhnDistricts([]);
      setGhnDistrict(null); setGhnWards([]); setGhnWard(null); setShippingFee(null);
    }).catch(() => setGhnDistricts([]));
  }, [ghnProvince]);

  // GHN: load ward
  useEffect(() => {
    if (!ghnDistrict) { setGhnWards([]); setGhnWard(null); return; }
    fetch('/api/shipping/ghn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-ward', payload: { district_id: ghnDistrict.DistrictID } }),
    }).then(r => r.json()).then(data => {
      if (data.code === 200 && data.data) setGhnWards(data.data);
      else setGhnWards([]);
      setGhnWard(null); setShippingFee(null);
    }).catch(() => setGhnWards([]));
  }, [ghnDistrict]);

  // VTP: load district
  useEffect(() => {
    if (!vtpProvince) { setVtpDistricts([]); setVtpDistrict(null); setVtpWards([]); setVtpWard(null); return; }
    fetch('/api/shipping/viettelpost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-district', payload: { provinceId: vtpProvince.PROVINCE_ID } }),
    }).then(r => r.json()).then(data => {
      if (data.status === 200 && data.data) setVtpDistricts(data.data);
      else setVtpDistricts([]);
      setVtpDistrict(null); setVtpWards([]); setVtpWard(null); setShippingFee(null);
    }).catch(() => setVtpDistricts([]));
  }, [vtpProvince]);

  // VTP: load ward
  useEffect(() => {
    if (!vtpDistrict) { setVtpWards([]); setVtpWard(null); return; }
    fetch('/api/shipping/viettelpost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-ward', payload: { districtId: vtpDistrict.DISTRICT_ID } }),
    }).then(r => r.json()).then(data => {
      if (data.status === 200 && data.data) setVtpWards(data.data);
      else setVtpWards([]);
      setVtpWard(null); setShippingFee(null);
    }).catch(() => setVtpWards([]));
  }, [vtpDistrict]);

  // Tính phí GHN
  useEffect(() => {
    if (shippingCarrier !== 'ghn' || !ghnDistrict || !ghnWard) return;
    setShippingLoading(true);
    fetch('/api/shipping/ghn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'calculate-fee',
        payload: {
          service_type_id: 2,
          to_district_id: ghnDistrict.DistrictID,
          to_ward_code: ghnWard.WardCode,
          weight: 500,
          insurance_value: Math.round(orderTotal || 0),
        },
      }),
    }).then(r => r.json()).then(data => {
      // VTP calculate-fee trả về array trực tiếp
      const list = Array.isArray(data) ? data : (data.data || []);
      if (list.length > 0) {
        const vcn = list.find((s: any) => s.MA_DV_CHINH === 'VCN') || list[0];
        setShippingFee(vcn.GIA_CUOC);
      } else setShippingFee(null);
    }).catch(() => setShippingFee(null)).finally(() => setShippingLoading(false));
  }, [ghnDistrict, ghnWard, shippingCarrier]);

  // Tính phí VTP
  useEffect(() => {
    if (shippingCarrier !== 'vtp' || !vtpProvince || !vtpDistrict) return;
    setShippingLoading(true);
    fetch('/api/shipping/viettelpost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'calculate-fee',
        payload: {
          PRODUCT_WEIGHT: 500,
          PRODUCT_PRICE: Math.round(orderTotal || 0),
          ORDER_SERVICE_ADD: '',
          ORDER_SERVICE: 'VCN',
          SENDER_PROVINCE: 1,
          SENDER_DISTRICT: 22,
          RECEIVER_PROVINCE: vtpProvince.PROVINCE_ID,
          RECEIVER_DISTRICT: vtpDistrict.DISTRICT_ID,
          PRODUCT_TYPE: 'HH',
          NATIONAL_TYPE: 1,
        },
      }),
    }).then(r => r.json()).then(data => {
      const list = Array.isArray(data) ? data : [];
if (list.length > 0) {
  const vcn = list.find((s: any) => s.MA_DV_CHINH === 'VCN') || list[0];
  setShippingFee(vcn.GIA_CUOC);
} else setShippingFee(null);
    }).catch(() => setShippingFee(null)).finally(() => setShippingLoading(false));
  }, [vtpProvince, vtpDistrict, shippingCarrier]);

  const createGHNOrder = async () => {
    if (!ghnDistrict || !ghnWard) return null;
    try {
      const items = checkoutItems.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: Math.round(item.product.price_range?.minimum_price?.regular_price?.value ?? item.prices.price.value),
      }));
      const response = await fetch('/api/shipping/ghn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-order',
          payload: {
            payment_type_id: paymentMethod === 'cod' ? 2 : 1,
            note: orderNote || '',
            required_note: 'KHONGCHOXEMHANG',
            to_name: fullName,
            to_phone: phone,
            to_address: address,
            to_ward_code: ghnWard.WardCode,
            to_district_id: ghnDistrict.DistrictID,
            cod_amount: paymentMethod === 'cod' ? Math.round(orderTotal + (shippingFee || 0)) : 0,
            weight: 500, length: 20, width: 15, height: 10,
            insurance_value: Math.round(orderTotal),
            service_type_id: 2,
            items,
          },
        }),
      });
      const data = await response.json();
      if (data.code === 200 && data.data?.order_code) return data.data.order_code;
      return null;
    } catch { return null; }
  };

  const createVTPOrder = async () => {
    if (!vtpProvince || !vtpDistrict || !vtpWard) return null;
    try {
      const response = await fetch('/api/shipping/viettelpost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-order',
          payload: {
            ORDER_NUMBER: orderId,
            GROUPADDRESS_ID: 0,
            CUS_ID: 0,
            DELIVERY_DATE: new Date().toISOString(),
            SENDER_FULLNAME: 'AH Phone Store',
            SENDER_ADDRESS: '144 Xuân Thủy, Cầu Giấy',
            SENDER_PHONE: '0912345678',
            SENDER_EMAIL: '',
            SENDER_WARD: 0,
            SENDER_DISTRICT: 22,
            SENDER_PROVINCE: 1,
            SENDER_LATITUDE: 0,
            SENDER_LONGITUDE: 0,
            RECEIVER_FULLNAME: fullName,
            RECEIVER_ADDRESS: address,
            RECEIVER_PHONE: phone,
            RECEIVER_EMAIL: '',
            RECEIVER_WARD: vtpWard.WARDS_ID,
            RECEIVER_DISTRICT: vtpDistrict.DISTRICT_ID,
            RECEIVER_PROVINCE: vtpProvince.PROVINCE_ID,
            RECEIVER_LATITUDE: 0,
            RECEIVER_LONGITUDE: 0,
            PRODUCT_NAME: checkoutItems.map(i => i.product.name).join(', '),
            PRODUCT_DESCRIPTION: orderNote || '',
            PRODUCT_QUANTITY: checkoutItems.reduce((s, i) => s + i.quantity, 0),
            PRODUCT_PRICE: Math.round(orderTotal),
            PRODUCT_WEIGHT: 500,
            PRODUCT_LENGTH: 20,
            PRODUCT_WIDTH: 15,
            PRODUCT_HEIGHT: 10,
            PRODUCT_TYPE: 'HH',
            ORDER_PAYMENT: paymentMethod === 'cod' ? 3 : 1,
            ORDER_SERVICE: 'VCN',
            ORDER_SERVICE_ADD: '',
            ORDER_VOUCHER: '',
            ORDER_NOTE: orderNote || '',
            MONEY_COLLECTION: paymentMethod === 'cod' ? Math.round(orderTotal + (shippingFee || 0)) : 0,
            MONEY_TOTALFEE: shippingFee || 0,
            MONEY_FEECOD: 0,
            MONEY_FEEVAS: 0,
            MONEY_FEEINSUR: 0,
            MONEY_FEE: shippingFee || 0,
            MONEY_FEEOTHER: 0,
            MONEY_TOTALVAT: 0,
            MONEY_TOTAL: Math.round(orderTotal),
            LIST_ITEM: checkoutItems.map(item => ({
              PRODUCT_NAME: item.product.name,
              PRODUCT_PRICE: Math.round(item.product.price_range?.minimum_price?.regular_price?.value ?? item.prices.price.value),
              PRODUCT_WEIGHT: 500,
              PRODUCT_QUANTITY: item.quantity,
              PRODUCT_CODE: item.product.sku || '',
            })),
          },
        }),
      });
      const data = await response.json();
      if (data.status === 200 && data.data?.ORDER_NUMBER) return data.data.ORDER_NUMBER;
      return null;
    } catch { return null; }
  };

  const handleMomoPayment = async () => {
    setMomoLoading(true);
    setMomoError(null);
    try {
      const response = await fetch('/api/momo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round((orderTotal || 0) + (shippingFee || 0)),
          orderId,
          orderInfo: `Thanh toán đơn hàng ${orderId}`,
        }),
      });
      const data = await response.json();
      if (data.payUrl) setMomoQR(data.payUrl);
      else setMomoError('Không thể tạo QR MoMo. Vui lòng thử lại.');
    } catch { setMomoError('Lỗi kết nối. Vui lòng thử lại.'); }
    finally { setMomoLoading(false); }
  };

  const isAddressComplete = fullName && phone && address && (
    shippingCarrier === 'ghn'
      ? (ghnProvince && ghnDistrict && ghnWard)
      : (vtpProvince && vtpDistrict && vtpWard)
  );

  const selectedProvinceName = shippingCarrier === 'ghn' ? ghnProvince?.ProvinceName : vtpProvince?.PROVINCE_NAME;
  const selectedDistrictName = shippingCarrier === 'ghn' ? ghnDistrict?.DistrictName : vtpDistrict?.DISTRICT_NAME;
  const selectedWardName = shippingCarrier === 'ghn' ? ghnWard?.WardName : vtpWard?.WARDS_NAME;

  const doCreateShippingOrder = async () => {
    if (shippingCarrier === 'ghn') return await createGHNOrder();
    return await createVTPOrder();
  };

  const handleConfirmOrder = async () => {
    if (!isAddressComplete) { alert('Vui lòng điền đầy đủ thông tin địa chỉ giao hàng!'); return; }
    if (paymentMethod === 'momo') { await handleMomoPayment(); return; }
    setConfirmLoading(true);
    const code = await doCreateShippingOrder();
    if (code) setShippingOrderCode(code);
    setConfirmLoading(false);
    setOrderPlaced(true);
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
  const checkoutItems = isEmpty ? [] : itemId ? cart.items.filter(item => item.id === itemId) : cart.items;

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
    const unitPrice = item.product.price_range?.minimum_price?.regular_price?.value ?? item.prices.price.value;
    return sum + unitPrice * item.quantity;
  }, 0);
  const grandTotal = orderTotal + (shippingFee || 0);
  const formattedTotal = formatPrice(orderTotal, currency);
  const formattedGrandTotal = formatPrice(grandTotal, currency);

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
            <p className="text-gray-600 mb-1">Mã đơn hàng: <strong className="text-primary-700">{orderId}</strong></p>
            {shippingOrderCode && (
              <p className="text-gray-600 mb-1 text-sm">
                Mã vận đơn {shippingCarrier === 'ghn' ? 'GHN' : 'Viettel Post'}: <strong className="text-blue-600">{shippingOrderCode}</strong>
              </p>
            )}
            <p className="text-gray-600 mb-1 text-sm">
              Giao đến: <strong>{fullName}</strong> — {address}, {selectedWardName}, {selectedDistrictName}, {selectedProvinceName}
            </p>
            <p className="text-gray-600 mb-6 text-sm">Phương thức: {paymentMethodLabel[paymentMethod]}</p>
            <Link href="/" className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors">
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

            {/* Thông tin giao hàng */}
            <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
              <h2 className="font-bold text-gray-900">Thông tin giao hàng</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Họ tên *</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nguyễn Văn A"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Số điện thoại *</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912345678"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Địa chỉ cụ thể *</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Số nhà, tên đường..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>

              {/* Chọn đơn vị vận chuyển */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Đơn vị vận chuyển *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setShippingCarrier('ghn')}
                    className={`border rounded-lg px-3 py-2 text-sm font-medium transition-colors ${shippingCarrier === 'ghn' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    🚚 GHN Express
                  </button>
                  <button type="button" onClick={() => setShippingCarrier('vtp')}
                    className={`border rounded-lg px-3 py-2 text-sm font-medium transition-colors ${shippingCarrier === 'vtp' ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    📦 Viettel Post
                  </button>
                </div>
              </div>

              {/* GHN address */}
              {shippingCarrier === 'ghn' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tỉnh/Thành phố *</label>
                    <select value={ghnProvince?.ProvinceID || ''} onChange={e => setGhnProvince(ghnProvinces.find(p => p.ProvinceID === Number(e.target.value)) || null)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="">-- Chọn tỉnh/thành --</option>
                      {ghnProvinces.map(p => <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quận/Huyện *</label>
                    <select value={ghnDistrict?.DistrictID || ''} onChange={e => setGhnDistrict(ghnDistricts.find(d => d.DistrictID === Number(e.target.value)) || null)}
                      disabled={!ghnProvince} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100">
                      <option value="">-- Chọn quận/huyện --</option>
                      {ghnDistricts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phường/Xã *</label>
                    <select value={ghnWard?.WardCode || ''} onChange={e => setGhnWard(ghnWards.find(w => w.WardCode === e.target.value) || null)}
                      disabled={!ghnDistrict} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100">
                      <option value="">-- Chọn phường/xã --</option>
                      {ghnWards.map(w => <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* VTP address */}
              {shippingCarrier === 'vtp' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tỉnh/Thành phố *</label>
                    <select value={vtpProvince?.PROVINCE_ID || ''} onChange={e => setVtpProvince(vtpProvinces.find(p => p.PROVINCE_ID === Number(e.target.value)) || null)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="">-- Chọn tỉnh/thành --</option>
                      {vtpProvinces.map(p => <option key={p.PROVINCE_ID} value={p.PROVINCE_ID}>{p.PROVINCE_NAME}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quận/Huyện *</label>
                    <select value={vtpDistrict?.DISTRICT_ID || ''} onChange={e => setVtpDistrict(vtpDistricts.find(d => d.DISTRICT_ID === Number(e.target.value)) || null)}
                      disabled={!vtpProvince} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100">
                      <option value="">-- Chọn quận/huyện --</option>
                      {vtpDistricts.map(d => <option key={d.DISTRICT_ID} value={d.DISTRICT_ID}>{d.DISTRICT_NAME}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phường/Xã *</label>
                    <select value={vtpWard?.WARDS_ID || ''} onChange={e => setVtpWard(vtpWards.find(w => w.WARDS_ID === Number(e.target.value)) || null)}
                      disabled={!vtpDistrict} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100">
                      <option value="">-- Chọn phường/xã --</option>
                      {vtpWards.map(w => <option key={w.WARDS_ID} value={w.WARDS_ID}>{w.WARDS_NAME}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Phí ship */}
              {((shippingCarrier === 'ghn' && ghnWard) || (shippingCarrier === 'vtp' && vtpDistrict)) && (
                <div className={`rounded-lg p-3 text-sm ${shippingFee !== null ? (shippingCarrier === 'ghn' ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200') : 'bg-gray-50'}`}>
                  {shippingLoading ? (
                    <p className="text-gray-500 text-xs">Đang tính phí vận chuyển...</p>
                  ) : shippingFee !== null ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${shippingCarrier === 'ghn' ? 'text-blue-700' : 'text-red-700'}`}>
                          {shippingCarrier === 'ghn' ? '🚚 GHN Express' : '📦 Viettel Post'}
                        </p>
                        <p className="text-xs text-gray-500">{shippingCarrier === 'ghn' ? 'Giao hàng 1-3 ngày' : 'Giao hàng 2-4 ngày'}</p>
                      </div>
                      <p className={`font-bold ${shippingCarrier === 'ghn' ? 'text-blue-700' : 'text-red-700'}`}>{formatPrice(shippingFee, currency)}</p>
                    </div>
                  ) : (
                    <p className="text-red-500 text-xs">Không thể tính phí vận chuyển cho khu vực này.</p>
                  )}
                </div>
              )}
            </div>

            {/* Đơn hàng */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Đơn hàng của bạn</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {checkoutItems.map((item) => {
                  const unitPrice = item.product.price_range?.minimum_price?.regular_price?.value ?? item.prices.price.value;
                  return (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="w-14 h-14 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                        <img src={item.product.thumbnail?.url || '/images/placeholder.svg'} alt={item.product.name}
                          className="w-full h-full object-contain p-1" onError={(e) => { e.currentTarget.src = '/images/placeholder.svg'; }} />
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
                  <span>Tạm tính</span><span>{formattedTotal}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Phí vận chuyển ({shippingCarrier === 'ghn' ? 'GHN' : 'Viettel Post'})</span>
                  {shippingLoading ? <span className="text-gray-400">Đang tính...</span>
                    : shippingFee !== null ? <span className="text-blue-600 font-medium">{formatPrice(shippingFee, currency)}</span>
                    : <span className="text-gray-400">Chưa tính</span>}
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-lg border-t border-gray-200 pt-2">
                  <span>Tổng cộng</span>
                  <span className="text-primary-600">{formattedGrandTotal}</span>
                </div>
              </div>
            </div>

            {/* Ghi chú */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú đơn hàng (tuỳ chọn)</label>
              <textarea value={orderNote} onChange={e => setOrderNote(e.target.value)}
                placeholder="Màu sắc, phiên bản, yêu cầu giao hàng..." rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            </div>

            {/* Thanh toán */}
            <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
              <h2 className="font-bold text-gray-900">Phương thức thanh toán</h2>
              <div className="space-y-3">
                {(['cod', 'banking', 'momo'] as PaymentMethod[]).map(method => (
                  <button key={method} type="button" onClick={() => setPaymentMethod(method)}
                    className={`w-full text-left border rounded-lg px-4 py-3 transition-colors ${
                      paymentMethod === method
                        ? method === 'momo' ? 'border-pink-300 bg-pink-50' : 'border-primary-300 bg-primary-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                    {method === 'cod' && <><p className="text-sm font-medium text-gray-900">Thanh toán khi nhận hàng (COD)</p><p className="text-xs text-gray-600 mt-1">Thanh toán tiền mặt khi nhận hàng.</p></>}
                    {method === 'banking' && <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-gray-900">Chuyển khoản ngân hàng</p><span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Bạn sẽ xử lý sau</span></div>}
                    {method === 'momo' && <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="text-pink-600 text-lg">💳</span><p className="text-sm font-medium text-gray-900">Ví MoMo</p></div>{paymentMethod === 'momo' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 font-semibold">Đã chọn</span>}</div>}
                  </button>
                ))}
              </div>
              <button onClick={handleConfirmOrder} disabled={momoLoading || confirmLoading}
                className={`w-full font-bold py-3 rounded-xl transition-colors text-white ${
                  paymentMethod === 'momo' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-primary-600 hover:bg-primary-700'
                } disabled:opacity-60 disabled:cursor-not-allowed`}>
                {confirmLoading ? 'Đang tạo đơn...' : momoLoading ? 'Đang tạo QR...' : `Xác nhận đặt hàng (${paymentMethodLabel[paymentMethod]})`}
              </button>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-6 text-sm text-gray-700 space-y-3">
              {paymentMethod === 'momo' && momoQR ? (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">💜</span>
                    <h3 className="font-bold text-pink-600 text-lg">Quét mã QR để thanh toán</h3>
                  </div>
                  <div className="border-4 border-pink-200 rounded-2xl p-4 inline-block bg-white">
                    <QRCode value={momoQR} size={192} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} />
                  </div>
                  <p className="text-xs text-gray-500">Mở app MoMo → Quét mã → Xác nhận thanh toán</p>
                  <div className="bg-pink-50 rounded-lg p-3 text-left space-y-1">
                    <p className="text-xs font-semibold text-pink-700">Số tiền: {formattedGrandTotal}</p>
                    <p className="text-xs text-gray-500">Mã đơn: {orderId}</p>
                  </div>
                  <button onClick={async () => {
                    setMomoQR(null); setConfirmLoading(true);
                    const code = await doCreateShippingOrder();
                    if (code) setShippingOrderCode(code);
                    setConfirmLoading(false); setOrderPlaced(true);
                  }} className="w-full bg-pink-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-pink-700 transition-colors">
                    Tôi đã thanh toán xong
                  </button>
                </div>
              ) : paymentMethod === 'momo' && !momoQR ? (
                <div className="text-center space-y-3">
                  <span className="text-4xl">💜</span>
                  <h3 className="font-bold text-pink-600">Ví MoMo</h3>
                  <p className="text-gray-600 text-xs">Bấm <strong>Xác nhận đặt hàng</strong> để tạo mã QR thanh toán.</p>
                  {momoError && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-red-600 text-xs">{momoError}</p></div>}
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-gray-900">{paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản ngân hàng'}</h3>
                  <p>{paymentMethod === 'cod' ? 'Bạn thanh toán bằng tiền mặt khi shipper giao hàng đến tay.' : 'Tạm thời ghi nhận lựa chọn chuyển khoản. Bạn sẽ cấu hình thông tin tài khoản nhận tiền sau.'}</p>
                </>
              )}

              {isAddressComplete && paymentMethod !== 'momo' && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-1 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700">📦 Giao đến:</p>
                  <p className="text-xs text-gray-600">{fullName} — {phone}</p>
                  <p className="text-xs text-gray-600">{address}, {selectedWardName}, {selectedDistrictName}, {selectedProvinceName}</p>
                </div>
              )}
              {paymentMethod !== 'momo' && <p className="text-xs text-gray-500">Đơn hàng sẽ được xử lý trong 24 giờ làm việc sau khi đặt hàng.</p>}
            </div>
            <Link href="/cart" className="block text-center text-sm text-gray-500 hover:text-gray-700 underline">Quay lại giỏ hàng</Link>
          </div>
        </div>
      </div>
    </div>
  );
}