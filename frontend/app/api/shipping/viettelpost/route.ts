import { NextRequest, NextResponse } from 'next/server';

const VTP_TOKEN = 'F530940781AF6035B1845FAA8C3D9C3E';
const VTP_API = 'https://partner.viettelpost.vn/v2';

export async function POST(request: NextRequest) {
  try {
    const { action, payload } = await request.json();

    let endpoint = '';
    let method = 'POST';

    if (action === 'get-province') {
      endpoint = `${VTP_API}/categories/listProvinceById?provinceId=-1`;
      method = 'GET';
    } else if (action === 'get-district') {
      endpoint = `${VTP_API}/categories/listDistrict?provinceId=${payload.provinceId}`;
      method = 'GET';
    } else if (action === 'get-ward') {
      endpoint = `${VTP_API}/categories/listWards?districtId=${payload.districtId}`;
      method = 'GET';
    } else if (action === 'calculate-fee') {
      endpoint = `${VTP_API}/order/getPriceAll`;
    } else if (action === 'create-order') {
      endpoint = `${VTP_API}/order/createOrder`;
    } else {
      return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
    }

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Token': VTP_TOKEN,
      },
    };

    if (method === 'POST' && payload) {
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(endpoint, options);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi kết nối Viettel Post' }, { status: 500 });
  }
}