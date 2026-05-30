import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const VNPAY_CONFIG = {
  tmnCode: process.env.VNPAY_TMN_CODE?.trim() || '',
  hashSecret: process.env.VNPAY_HASH_SECRET?.trim() || '',
  paymentUrl: process.env.VNPAY_PAYMENT_URL?.trim() || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  returnUrl: process.env.VNPAY_RETURN_URL?.trim() || '',
};

function sortObject(obj: Record<string, string>): Record<string, string> {
  const sorted: Record<string, string> = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = obj[key];
    });
  return sorted;
}

export async function POST(request: NextRequest) {
  try {
    if (!VNPAY_CONFIG.tmnCode || !VNPAY_CONFIG.hashSecret) {
      return NextResponse.json(
        { error: 'Thiếu cấu hình VNPAY (VNPAY_TMN_CODE, VNPAY_HASH_SECRET).' },
        { status: 500 },
      );
    }

    const { amount, orderId, orderInfo, ipAddr, itemId: checkoutItemId } = await request.json();

    const now = new Date();
    // Format: YYYYMMDDHHmmss theo múi giờ UTC+7
    const vnpCreateDate = new Date(now.getTime() + 7 * 60 * 60 * 1000)
      .toISOString()
      .replace(/\D/g, '')
      .slice(0, 14);

    const baseReturnUrl = (VNPAY_CONFIG.returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/checkout`).replace(/[?].*$/, '');
    // Giữ lại itemId để sau khi return biết đây là single product checkout
    const returnUrl = checkoutItemId
      ? `${baseReturnUrl}?payment=vnpay&itemId=${encodeURIComponent(checkoutItemId)}`
      : `${baseReturnUrl}?payment=vnpay`;
    const clientIp = (ipAddr || '127.0.0.1').replace('::1', '127.0.0.1').replace('::ffff:', '');

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: VNPAY_CONFIG.tmnCode,
      vnp_Amount: String(Math.round(amount) * 100), // VNPAY nhân 100
      vnp_CreateDate: vnpCreateDate,
      vnp_CurrCode: 'VND',
      vnp_IpAddr: clientIp,
      vnp_Locale: 'vn',
      vnp_OrderInfo: orderInfo || `Thanh toan don hang ${orderId}`,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: returnUrl,
      vnp_TxnRef: orderId,
    };

    const sortedParams = sortObject(vnpParams);

    // Tạo query string để ký
    const signData = new URLSearchParams(sortedParams).toString();

    const signature = crypto
      .createHmac('sha512', VNPAY_CONFIG.hashSecret)
      .update(signData)
      .digest('hex');

    sortedParams['vnp_SecureHash'] = signature;

    const paymentUrl = `${VNPAY_CONFIG.paymentUrl}?${new URLSearchParams(sortedParams).toString()}`;

    return NextResponse.json({ paymentUrl });
  } catch (error) {
    console.error('VNPAY create error:', error);
    return NextResponse.json({ error: 'Lỗi tạo thanh toán VNPAY' }, { status: 500 });
  }
}

// Xử lý IPN callback từ VNPAY (server-to-server)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const secureHash = params['vnp_SecureHash'];
    if (!secureHash) {
      return NextResponse.json({ RspCode: '97', Message: 'Missing secure hash' });
    }

    // Xoá hash trước khi verify
    const { vnp_SecureHash: _, vnp_SecureHashType: __, ...verifyParams } = params;

    const sortedParams = sortObject(verifyParams);
    const signData = new URLSearchParams(sortedParams).toString();
    const expectedHash = crypto
      .createHmac('sha512', VNPAY_CONFIG.hashSecret)
      .update(signData)
      .digest('hex');

    if (expectedHash !== secureHash) {
      return NextResponse.json({ RspCode: '97', Message: 'Invalid signature' });
    }

    const responseCode = params['vnp_ResponseCode'];
    if (responseCode === '00') {
      // Thanh toán thành công - có thể update order status ở đây nếu cần
      return NextResponse.json({ RspCode: '00', Message: 'Success' });
    }

    return NextResponse.json({ RspCode: responseCode, Message: 'Payment failed' });
  } catch (error) {
    console.error('VNPAY IPN error:', error);
    return NextResponse.json({ RspCode: '99', Message: 'Unknown error' });
  }
}
