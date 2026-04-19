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
  const { register } = useAuth();
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setServerError('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setLoading(true);
    setServerError('');

    try {
      await register({
        firstname: formData.firstname,
        lastname: formData.lastname,
        email: formData.email,
        password: formData.password,
      });
      router.push('/');
    } catch (error) {
      console.error('Lỗi đăng ký:', error);
      setServerError('Đăng ký thất bại. Email có thể đã được sử dụng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Tạo tài khoản</h2>
            <p className="mt-2 text-sm text-gray-600">
              Tham gia ngay hôm nay để bắt đầu mua sắm!
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
                label="Tên"
                type="text"
                name="firstname"
                value={formData.firstname}
                onChange={handleChange}
                error={errors.firstname}
                placeholder="Ví dụ: Huy"
                required
              />

              <Input
                label="Họ"
                type="text"
                name="lastname"
                value={formData.lastname}
                onChange={handleChange}
                error={errors.lastname}
                placeholder="Ví dụ: Nguyễn"
                required
              />
            </div>

            <Input
              label="Địa chỉ email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="your@email.com"
              required
            />

            <Input
              label="Mật khẩu"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="Tạo mật khẩu mạnh"
              helperText="Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số"
              required
            />

            <Input
              label="Xác nhận mật khẩu"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              placeholder="Nhập lại mật khẩu"
              required
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
            >
              Tạo tài khoản
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Đã có tài khoản?{' '}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
