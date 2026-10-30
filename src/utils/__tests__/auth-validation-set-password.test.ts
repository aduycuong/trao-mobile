import { validateSetPassword } from '@/utils/auth-validation';

describe('validateSetPassword', () => {
  it('needs a valid new password that is typed twice', () => {
    expect(validateSetPassword('abc', 'abc').password).toBe('Mật khẩu cần ít nhất 8 ký tự.');
    expect(validateSetPassword('abcdefgh', 'abcdefgh').password).toBe(
      'Mật khẩu cần có cả chữ và số.'
    );
    expect(validateSetPassword('abcd1234', '').confirmPassword).toBe('Nhập lại mật khẩu mới.');
    expect(validateSetPassword('abcd1234', 'abcd12345').confirmPassword).toBe(
      'Hai mật khẩu chưa giống nhau.'
    );
    expect(validateSetPassword('abcd1234', 'abcd1234')).toEqual({});
  });
});
