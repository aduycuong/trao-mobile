import {
  getPasswordStrength,
  maskEmail,
  validateLogin,
  validateRegistration,
  validateResetPassword,
} from '@/utils/auth-validation';

describe('auth validation', () => {
  it('validates login fields', () => {
    expect(validateLogin('not-an-email', '')).toEqual({
      email: 'Email không hợp lệ.',
      password: 'Nhập mật khẩu.',
    });
    expect(validateLogin('parent@example.com', 'x')).toEqual({});
  });

  it('validates registration like the web schema', () => {
    expect(validateRegistration(' ', 'a@b.vn', 'abcdefgh', false)).toEqual({
      displayName: 'Nhập tên hiển thị.',
      password: 'Mật khẩu cần có cả chữ và số.',
      terms: 'Bạn cần đồng ý với điều khoản để tiếp tục.',
    });
    expect(validateRegistration('An', 'a@b.vn', 'abcd1234', true)).toEqual({});
  });

  it('validates the reset form', () => {
    expect(validateResetPassword('abcd1234', 'abcd12345')).toEqual({
      confirmPassword: 'Hai mật khẩu chưa giống nhau.',
    });
  });

  it('rates password strength', () => {
    expect(getPasswordStrength('').level).toBe(0);
    expect(getPasswordStrength('abc').level).toBe(1);
    expect(getPasswordStrength('abcd1234').label).toBe('Khá mạnh');
    expect(getPasswordStrength('abcd1234efgh').label).toBe('Mạnh');
  });

  it('masks emails', () => {
    expect(maskEmail('minhanh@gmail.com')).toBe('minh••••@gmail.com');
  });
});
