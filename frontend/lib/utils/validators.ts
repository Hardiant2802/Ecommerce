// Validation utilities

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  return password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password);
}

export function validateRequired(value: string): string | null {
  return value.trim() ? null : 'Trường này là bắt buộc';
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email là bắt buộc';
  if (!isValidEmail(email)) return 'Vui lòng nhập địa chỉ email hợp lệ';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Mật khẩu là bắt buộc';
  if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
  if (!/[A-Z]/.test(password)) return 'Mật khẩu phải có ít nhất 1 chữ hoa';
  if (!/[a-z]/.test(password)) return 'Mật khẩu phải có ít nhất 1 chữ thường';
  if (!/[0-9]/.test(password)) return 'Mật khẩu phải có ít nhất 1 chữ số';
  return null;
}

export function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  if (password !== confirmPassword) return 'Mật khẩu xác nhận không khớp';
  return null;
}
