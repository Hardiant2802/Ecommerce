'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { validateEmail, validatePassword, validateRequired, validateConfirmPassword } from '@/lib/utils/validators';

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpStatusMessage, setOtpStatusMessage] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSending, setOtpSending] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setServerError('');

    if (name === 'email') {
      setOtpRequested(false);
      setOtpCode('');
      setOtpStatusMessage('');
      setOtpError('');
    }
  };

  const requestOtp = async () => {
    const emailError = validateEmail(formData.email);
    if (emailError) {
      setErrors(prev => ({ ...prev, email: emailError }));
      return;
    }

    setOtpSending(true);
    setOtpError('');
    setOtpStatusMessage('');

    try {
      const response = await fetch('/api/auth/register-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          email: formData.email.trim(),
        }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || 'Unable to send OTP.');
      }

      setOtpRequested(true);
      setOtpStatusMessage(payload.message || 'Verification code sent. Enter the code and create account.');
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Unable to send OTP.');
    } finally {
      setOtpSending(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const firstnameError = validateRequired(formData.firstname);
    if (firstnameError) newErrors.firstname = firstnameError;

    const lastnameError = validateRequired(formData.lastname);
    if (lastnameError) newErrors.lastname = lastnameError;

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setServerError('');
    setOtpError('');
    setOtpStatusMessage('');

    if (!otpRequested) {
      setServerError('Please send OTP code to your email first.');
      setLoading(false);
      return;
    }

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setServerError('Please enter a valid 6-digit verification code.');
      setLoading(false);
      return;
    }

    try {
      const verifyResponse = await fetch('/api/auth/register-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          email: formData.email.trim(),
          otpCode: otpCode.trim(),
        }),
      });

      const verifyPayload = (await verifyResponse.json()) as {
        message?: string;
        verificationToken?: string;
      };

      if (!verifyResponse.ok || !verifyPayload.verificationToken) {
        throw new Error(verifyPayload.message || 'OTP verification failed.');
      }

      await register({
        firstname: formData.firstname.trim(),
        lastname: formData.lastname.trim(),
        email: formData.email.trim(),
        password: formData.password,
        otpVerificationToken: verifyPayload.verificationToken,
      });
      router.replace('/');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full">
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Create Account</h2>
            <p className="mt-2 text-sm text-slate-600">
              Join us today and start shopping!
            </p>
          </div>

          {serverError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                type="text"
                name="firstname"
                value={formData.firstname}
                onChange={handleChange}
                error={errors.firstname}
                placeholder="John"
                required
              />

              <Input
                label="Last Name"
                type="text"
                name="lastname"
                value={formData.lastname}
                onChange={handleChange}
                error={errors.lastname}
                placeholder="Doe"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start sm:items-end">
              <Input
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="your@email.com"
                required
              />

              <div className="sm:pb-[2px]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={requestOtp}
                  loading={otpSending}
                  disabled={!formData.email.trim()}
                  className="w-full sm:w-auto"
                >
                  {otpRequested ? 'Resend Code' : 'Send Code'}
                </Button>
              </div>
            </div>

            {otpRequested && (
              <div className="space-y-3">
                <Input
                  label="Verification Code"
                  type="text"
                  name="otpCode"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  required
                />
              </div>
            )}

            {otpStatusMessage && (
              <p className="text-sm text-green-600">{otpStatusMessage}</p>
            )}

            {otpError && (
              <p className="text-sm text-red-600">{otpError}</p>
            )}

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="Create a strong password"
              helperText="Must be at least 8 characters with uppercase, lowercase, and number"
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              placeholder="Confirm your password"
              required
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading || authLoading}
            >
              Create Account
            </Button>

            <p className="text-xs text-slate-500 text-center">
              Enter the OTP code and then click Create Account.
            </p>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
