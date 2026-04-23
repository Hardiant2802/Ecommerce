import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const MOMO_CONFIG = {
  partnerCode: 'MOMO',
  accessKey: 'F8BBA842ECF85',
  secretKey: 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
  endpoint: 'https://test-payment.momo.vn/v2/gateway/api/create',
};

export async function POST(request: NextRequest) {
  try {
    const { amount, orderId, orderInfo } = await request.json();

    const requestId = `${orderId}-${Date.now()}`;
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/momo-return`;
    const ipnUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/momo/ipn`;
    const requestType = 'captureWallet';
    const extraData = '';

    const rawSignature = [
      `accessKey=${MOMO_CONFIG.accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${ipnUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${MOMO_CONFIG.partnerCode}`,
      `redirectUrl=${redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join('&');

    const signature = crypto
      .createHmac('sha256', MOMO_CONFIG.secretKey)
      .update(rawSignature)
      .digest('hex');

    const body = {
      partnerCode: MOMO_CONFIG.partnerCode,
      accessKey: MOMO_CONFIG.accessKey,
      requestId,
      amount: amount.toString(),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType,
      signature,
      lang: 'vi',
    };

    const response = await fetch(MOMO_CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi tạo thanh toán MoMo' }, { status: 500 });
  }
}