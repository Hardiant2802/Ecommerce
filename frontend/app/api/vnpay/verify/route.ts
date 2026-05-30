import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

const VNPAY_HASH_SECRET = process.env.VNPAY_HASH_SECRET?.trim() || '';

function sortObject(obj: Record<string, string>): Record<string, string> {
  const sorted: Record<string, string> = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = obj[key];
    });
  return sorted;
}

/**
 * POST /api/vnpay/verify
 * Nhận toàn bộ query params từ VNPAY return URL, verify HMAC-SHA512 server-side.
 * Trả về { valid: true, success: true } nếu hợp lệ và thanh toán thành công.
 * Trả về { valid: false } nếu chữ ký sai (giả mạo).
 */
export async function POST(request: NextRequest) {
  try {
    if (!VNPAY_HASH_SECRET) {
      console.error('VNPAY_HASH_SECRET not configured');
      return NextResponse.json({ valid: false, error: 'Server config error' }, { status: 500 });
    }

    const body = (await request.json()) as Record<string, string>;

    const secureHash = body['vnp_SecureHash'];
    if (!secureHash) {
      return NextResponse.json({ valid: false, error: 'Missing signature' }, { status: 400 });
    }

    // Loại bỏ các trường hash và các params không phải của VNPAY (payment, itemId, v.v.)
    const verifyParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType' && key.startsWith('vnp_')) {
        verifyParams[key] = value;
      }
    }

    const sortedParams = sortObject(verifyParams);
    const signData = new URLSearchParams(sortedParams).toString();

    const expectedHash = crypto
      .createHmac('sha512', VNPAY_HASH_SECRET)
      .update(signData)
      .digest('hex');

    if (expectedHash.toLowerCase() !== secureHash.toLowerCase()) {
      // Chữ ký không khớp - có thể bị giả mạo
      console.warn('VNPAY signature mismatch:', {
        txnRef: body['vnp_TxnRef'],
        responseCode: body['vnp_ResponseCode'],
        ip: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '',
      });
      return NextResponse.json({ valid: false, error: 'Invalid signature' }, { status: 400 });
    }

    const responseCode = body['vnp_ResponseCode'] || '';
    const transactionStatus = body['vnp_TransactionStatus'] || '';

    // Chữ ký hợp lệ - kiểm tra trạng thái giao dịch
    const success = responseCode === '00' && transactionStatus === '00';

    return NextResponse.json({
      valid: true,
      success,
      responseCode,
      transactionStatus,
      txnRef: body['vnp_TxnRef'] || '',
      transactionNo: body['vnp_TransactionNo'] || '',
      amount: body['vnp_Amount'] || '0',
      bankCode: body['vnp_BankCode'] || '',
      orderInfo: body['vnp_OrderInfo'] || '',
      payDate: body['vnp_PayDate'] || '',
    });
  } catch (error) {
    console.error('VNPAY verify error:', error);
    return NextResponse.json({ valid: false, error: 'Verify failed' }, { status: 500 });
  }
}
