import { validateLogin, validateRegistration } from '@/utils/auth-validation';

describe('auth validation', () => {
  it('validates login fields', () => {
    expect(validateLogin('not-an-email', '123')).toEqual({
      email: 'Email chưa đúng định dạng.',
      password: 'Mật khẩu cần có ít nhất 6 ký tự.',
    });
    expect(validateLogin('parent@example.com', 'secret1')).toEqual({});
  });

  it('validates registration name and password confirmation', () => {
    expect(validateRegistration('A', 'parent@example.com', 'secret1', 'secret2')).toMatchObject({
      displayName: 'Tên cần có ít nhất 2 ký tự.',
      confirmPassword: 'Mật khẩu nhập lại chưa khớp.',
    });
  });
});
