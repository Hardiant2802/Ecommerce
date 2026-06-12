import { NextRequest, NextResponse } from 'next/server';

const VTP_TOKEN = process.env.VTP_TOKEN?.trim() || '';
const VTP_API = process.env.VTP_API_BASE_URL?.trim() || 'https://partner.viettelpost.vn/v2';

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
    if (!VTP_TOKEN) {
      return NextResponse.json(
        { error: 'Thiếu cấu hình VTP_TOKEN trong env.' },
        { status: 500 },
      );
    }

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
      return NextResponse.json(
        { error: 'Chế độ demo không tạo vận đơn thật trên Viettel Post.' },
        { status: 403 },
      );
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
    const responseText = await response.text();
    const data = parseUnknownJsonPayload(responseText);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi kết nối Viettel Post' }, { status: 500 });
  }
}
