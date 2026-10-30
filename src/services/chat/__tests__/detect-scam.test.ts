import { detectScamSigns } from '../detect-scam';

describe('detectScamSigns', () => {
  it('is quiet for an ordinary message', () => {
    expect(detectScamSigns('Chào bạn, máy còn không ạ?')).toEqual([]);
  });

  it('spots a deposit request, with or without accents', () => {
    expect(detectScamSigns('Bạn chuyển khoản trước giúp mình nhé')).toEqual(['deposit']);
    expect(detectScamSigns('dat coc truoc di')).toEqual(['deposit']);
  });

  it('spots a one-time code', () => {
    expect(detectScamSigns('Gửi mình mã OTP vừa nhận')).toEqual(['otp']);
  });

  it('spots links and moves to another app', () => {
    expect(detectScamSigns('xem tại https://abc.xyz/x')).toContain('link');
    expect(detectScamSigns('kết bạn zalo nhé')).toEqual(['off_platform']);
    expect(detectScamSigns('gọi 0901234567')).toEqual(['off_platform']);
  });

  it('ignores the app host', () => {
    expect(detectScamSigns('tin này trao.vn/l/1', 'trao.vn')).toEqual([]);
  });
});
