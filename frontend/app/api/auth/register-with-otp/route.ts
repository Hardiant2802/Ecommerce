import { NextRequest, NextResponse } from 'next/server';
import { consumeVerificationToken, isVerificationTokenValid, normalizeEmail } from '@/lib/server/registerOtpStore';
import { magentoGraphqlRequest } from '@/lib/server/magentoGraphql';

export const runtime = 'nodejs';

const CREATE_CUSTOMER = `
  mutation CreateCustomer($input: CustomerCreateInput!) {
    createCustomerV2(input: $input) {
      customer {
        id
        email
        firstname
        lastname
      }
    }
  }
`;

const GENERATE_TOKEN = `
  mutation GenerateCustomerToken($email: String!, $password: String!) {
    generateCustomerToken(email: $email, password: $password) {
      token
    }
  }
`;

const GET_CUSTOMER = `
  query GetCustomer {
    customer {
      id
      email
      firstname
      lastname
    }
  }
`;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RegisterPayload {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  otpVerificationToken: string;
}

interface CreateCustomerResponse {
  createCustomerV2: {
    customer: {
      id: number;
      email: string;
      firstname: string;
      lastname: string;
    };
  };
}

interface GenerateTokenResponse {
  generateCustomerToken: {
    token: string;
  };
}

interface CustomerResponse {
  customer: {
    id: number;
    email: string;
    firstname: string;
    lastname: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterPayload;
    const firstname = (body.firstname || '').trim();
    const lastname = (body.lastname || '').trim();
    const email = normalizeEmail(body.email || '');
    const password = String(body.password || '');
    const otpVerificationToken = String(body.otpVerificationToken || '');

    if (!firstname || !lastname || !email || !password || !otpVerificationToken) {
      return NextResponse.json({ message: 'Missing required registration fields.' }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!(await isVerificationTokenValid(email, otpVerificationToken))) {
      return NextResponse.json({ message: 'Email verification is invalid or expired.' }, { status: 401 });
    }

    await magentoGraphqlRequest<CreateCustomerResponse>({
      requestUrl: request.nextUrl,
      query: CREATE_CUSTOMER,
      variables: {
        input: {
          firstname,
          lastname,
          email,
          password,
        },
      },
    });

    const tokenResult = await magentoGraphqlRequest<GenerateTokenResponse>({
      requestUrl: request.nextUrl,
      query: GENERATE_TOKEN,
      variables: { email, password },
    });

    const customerToken = tokenResult.generateCustomerToken?.token;
    if (!customerToken) {
      throw new Error('Failed to generate customer token after registration.');
    }

    const customerResult = await magentoGraphqlRequest<CustomerResponse>({
      requestUrl: request.nextUrl,
      query: GET_CUSTOMER,
      token: customerToken,
    });

    await consumeVerificationToken(email);

    return NextResponse.json({
      success: true,
      token: customerToken,
      user: customerResult.customer,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
