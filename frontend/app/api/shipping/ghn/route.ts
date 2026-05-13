import { NextRequest, NextResponse } from 'next/server';

const GHN_API = process.env.GHN_API_BASE_URL?.trim() || 'https://dev-online-gateway.ghn.vn/shiip/public-api';
const GHN_TOKEN = process.env.GHN_TOKEN?.trim() || '';
const GHN_SHOP_ID = Number(process.env.GHN_SHOP_ID || 0);
const GHN_FROM_DISTRICT_ID = Number(process.env.GHN_FROM_DISTRICT_ID || 0);

function parseUnknownJsonPayload(raw: string): unknown {
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!GHN_TOKEN || !Number.isFinite(GHN_SHOP_ID) || GHN_SHOP_ID <= 0) {
      return NextResponse.json(
        { error: 'Thiếu cấu hình GHN. Vui lòng kiểm tra GHN_TOKEN và GHN_SHOP_ID trong env.' },
        { status: 500 },
      );
    }

    const { action, payload } = await request.json();

    let endpoint = '';
    if (action === 'calculate-fee') {
      endpoint = `${GHN_API}/v2/shipping-order/fee`;
    } else if (action === 'get-province') {
      endpoint = `${GHN_API}/master-data/province`;
    } else if (action === 'get-district') {
      endpoint = `${GHN_API}/master-data/district`;
    } else if (action === 'get-ward') {
      endpoint = `${GHN_API}/master-data/ward`;
    } else if (action === 'create-order') {
      endpoint = `${GHN_API}/v2/shipping-order/create`;
    } else {
      return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
    }

    const body = action === 'calculate-fee'
      ? { ...payload, from_district_id: GHN_FROM_DISTRICT_ID }
      : payload || {};

    if (action === 'calculate-fee' && (!Number.isFinite(GHN_FROM_DISTRICT_ID) || GHN_FROM_DISTRICT_ID <= 0)) {
      return NextResponse.json(
        { error: 'Thiếu cấu hình GHN_FROM_DISTRICT_ID trong env.' },
        { status: 500 },
      );
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': GHN_TOKEN,
        'ShopId': GHN_SHOP_ID.toString(),
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    const data = parseUnknownJsonPayload(responseText);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi kết nối GHN' }, { status: 500 });
  }
}