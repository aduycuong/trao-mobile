import { socialErrorMessage } from '@/services/social-auth';

jest.mock('firebase/auth', () => ({}));
jest.mock('@/services/firebase', () => ({ getFirebaseAuth: () => null }));

describe('socialErrorMessage', () => {
  it('names the provider to link when the email already has an account', () => {
    expect(
      socialErrorMessage({ code: 'auth/account-exists-with-different-credential' }, 'facebook', 'x')
    ).toContain('liên kết Facebook');
  });

  it('explains a provider that belongs to another Trao account', () => {
    expect(socialErrorMessage({ code: 'auth/credential-already-in-use' }, 'google', 'x')).toBe(
      'Tài khoản này đã liên kết với một tài khoản Trao khác.'
    );
  });

  it('falls back for unknown errors', () => {
    expect(socialErrorMessage(new Error('RNGoogleSignin: boom'), 'google', 'Thử lại.')).toBe(
      'Thử lại.'
    );
  });
});
