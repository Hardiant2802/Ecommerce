import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createOtp, normalizeEmail, verifyOtpCode } from '@/lib/server/registerOtpStore';

export const runtime = 'nodejs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SendOtpPayload {
  action: 'send';
  email: string;
}

interface VerifyOtpPayload {
  action: 'verify';
  email: string;
  otpCode: string;
}

async function sendOtpEmail(email: string, otpCode: string): Promise<void> {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !from) {
    throw new Error('SMTP is not configured. Set SMTP_HOST and SMTP_FROM in frontend env.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Your verification code',
    text: `Your verification code is ${otpCode}. This code will expire in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.`,
    html: `<p>Your verification code is <strong>${otpCode}</strong>.</p><p>This code will expire in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.</p>`,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendOtpPayload | VerifyOtpPayload;

    if (!body?.action) {
      return NextResponse.json({ message: 'Invalid request action.' }, { status: 400 });
    }

    if (body.action === 'send') {
      const email = normalizeEmail(body.email || '');
      if (!EMAIL_REGEX.test(email)) {
        return NextResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 });
      }

      const otpResult = await createOtp(email);
      if (otpResult.retryAfterSeconds > 0) {
        return NextResponse.json(
          { message: `Please wait ${otpResult.retryAfterSeconds}s before requesting a new code.` },
          { status: 429 }
        );
      }

      await sendOtpEmail(email, otpResult.otpCode);

      return NextResponse.json({
        success: true,
        message: 'Verification code has been sent to your email.',
        expiresInSeconds: otpResult.expiresInSeconds,
      });
    }

    const email = normalizeEmail(body.email || '');
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 });
    }

    const otpCode = String(body.otpCode || '').trim();
    if (!/^\d{6}$/.test(otpCode)) {
      return NextResponse.json({ message: 'OTP code must be 6 digits.' }, { status: 400 });
    }

    const verificationResult = await verifyOtpCode(email, otpCode);
    if (!verificationResult.success) {
      return NextResponse.json({ message: verificationResult.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully.',
      verificationToken: verificationResult.verificationToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process OTP request.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
