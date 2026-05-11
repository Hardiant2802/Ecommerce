import { NextRequest, NextResponse } from 'next/server';

const GHN_TOKEN = '055e17d4-4aa9-11f1-a973-aee5264794df';
const GHN_SHOP_ID = 200229;
const GHN_FROM_DISTRICT_ID = 1485; // Quận Cầu Giấy, Hà Nội
const GHN_API = 'https://dev-online-gateway.ghn.vn/shiip/public-api';

export async function POST(request: NextRequest) {
  try {
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

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': GHN_TOKEN,
        'ShopId': GHN_SHOP_ID.toString(),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi kết nối GHN' }, { status: 500 });
  }
}