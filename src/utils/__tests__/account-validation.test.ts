import { validateBio, validateDisplayName, validateUsername } from '@/utils/account-validation';

describe('account validation', () => {
  it('validates the display name like the web schema', () => {
    expect(validateDisplayName('  ')).toBe('Nhập tên hiển thị.');
    expect(validateDisplayName('a'.repeat(51))).toBe('Tên hiển thị tối đa 50 ký tự.');
    expect(validateDisplayName('Minh Anh')).toBeUndefined();
  });

  it('validates the username like the web schema', () => {
    expect(validateUsername('ab')).toBe('Tên người dùng tối thiểu 3 ký tự.');
    expect(validateUsername('a'.repeat(31))).toBe('Tên người dùng tối đa 30 ký tự.');
    expect(validateUsername('minh anh')).toBe('Chỉ dùng chữ không dấu, số, dấu chấm và gạch dưới.');
    expect(validateUsername(' Minh.Anh_9 ')).toBeUndefined();
  });

  it('lets the bio be empty but not too long', () => {
    expect(validateBio('')).toBeUndefined();
    expect(validateBio('a'.repeat(201))).toBe('Giới thiệu tối đa 200 ký tự.');
  });
});
