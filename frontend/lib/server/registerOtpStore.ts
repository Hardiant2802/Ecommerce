import { createHash, randomBytes, randomInt } from 'crypto';
import { getRedisClient } from '@/lib/server/redis';

interface RedisOtpEntry {
  codeHash: string;
  lastSentAt: number;
  attempts: number;
}

const otpTtlMs = Number(process.env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000;
const otpCooldownMs = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60) * 1000;
const otpMaxAttempts = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const verificationTtlMs = Number(process.env.OTP_VERIFICATION_TOKEN_MINUTES || 15) * 60 * 1000;
const redisPrefix = process.env.REDIS_PREFIX || 'mobile-store';

function otpKey(email: string): string {
  return `${redisPrefix}:register:otp:${email}`;
}

function verificationKey(email: string): string {
  return `${redisPrefix}:register:verified:${email}`;
}

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createOtp(email: string): Promise<{
  otpCode: string;
  expiresInSeconds: number;
  retryAfterSeconds: number;
}> {
  const normalizedEmail = normalizeEmail(email);
  const redis = await getRedisClient();
  const now = Date.now();
  const key = otpKey(normalizedEmail);
  const existingRaw = await redis.get(key);
  const existing = existingRaw ? (JSON.parse(existingRaw) as RedisOtpEntry) : null;

  if (existing && now - existing.lastSentAt < otpCooldownMs) {
    const retryAfterMs = otpCooldownMs - (now - existing.lastSentAt);
    const ttl = await redis.ttl(key);
    return {
      otpCode: '',
      expiresInSeconds: Math.max(0, ttl),
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  const otpCode = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const payload: RedisOtpEntry = {
    codeHash: hashValue(otpCode),
    lastSentAt: now,
    attempts: 0,
  };

  await redis.set(key, JSON.stringify(payload), {
    EX: Math.ceil(otpTtlMs / 1000),
  });

  return {
    otpCode,
    expiresInSeconds: Math.ceil(otpTtlMs / 1000),
    retryAfterSeconds: 0,
  };
}

export async function verifyOtpCode(email: string, otpCode: string): Promise<
  | { success: true; verificationToken: string }
  | { success: false; message: string }
> {
  const normalizedEmail = normalizeEmail(email);
  const redis = await getRedisClient();
  const key = otpKey(normalizedEmail);
  const otpEntryRaw = await redis.get(key);

  const otpEntry = otpEntryRaw ? (JSON.parse(otpEntryRaw) as RedisOtpEntry) : null;
  if (!otpEntry) {
    return { success: false, message: 'OTP has expired or was not requested.' };
  }

  if (otpEntry.attempts >= otpMaxAttempts) {
    await redis.del(key);
    return { success: false, message: 'Too many invalid attempts. Request a new OTP.' };
  }

  if (otpEntry.codeHash !== hashValue(otpCode.trim())) {
    otpEntry.attempts += 1;
    const ttl = await redis.ttl(key);

    if (ttl <= 0) {
      await redis.del(key);
      return { success: false, message: 'OTP has expired or was not requested.' };
    }

    await redis.set(key, JSON.stringify(otpEntry), { EX: ttl });

    if (otpEntry.attempts >= otpMaxAttempts) {
      await redis.del(key);
      return { success: false, message: 'Too many invalid attempts. Request a new OTP.' };
    }

    return { success: false, message: 'Invalid OTP code.' };
  }

  await redis.del(key);
  const verificationToken = randomBytes(24).toString('hex');
  await redis.set(verificationKey(normalizedEmail), verificationToken, {
    EX: Math.ceil(verificationTtlMs / 1000),
  });

  return { success: true, verificationToken };
}

export async function isVerificationTokenValid(email: string, token: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const redis = await getRedisClient();
  const storedToken = await redis.get(verificationKey(normalizedEmail));
  return Boolean(storedToken && storedToken === token);
}

export async function consumeVerificationToken(email: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.del(verificationKey(normalizeEmail(email)));
}
