import { NextRequest, NextResponse } from 'next/server';

const MAGENTO_GRAPHQL_URL = process.env.NEXT_PUBLIC_MAGENTO_GRAPHQL_URL || 'https://localhost/graphql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Store': process.env.NEXT_PUBLIC_MAGENTO_STORE_CODE || 'default',
    };

    // Forward authorization header if present
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(MAGENTO_GRAPHQL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      // Disable SSL verification for local development
      // @ts-ignore
      ...(process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' && {
        agent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      })
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error('GraphQL Proxy Error:', error);
    return NextResponse.json(
      { 
        errors: [{ 
          message: error instanceof Error ? error.message : 'Failed to fetch from Magento' 
        }] 
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
