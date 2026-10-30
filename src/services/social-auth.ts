import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  unlink,
  type AuthCredential,
} from 'firebase/auth';
import { Platform } from 'react-native';
import { getFirebaseAuth } from './firebase';

export type SocialProvider = 'google' | 'facebook';

export const SOCIAL_PROVIDER_IDS: Record<SocialProvider, string> = {
  google: 'google.com',
  facebook: 'facebook.com',
};

export const SOCIAL_PROVIDER_NAMES: Record<SocialProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
};

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

/** A message already written for the user, safe to show as it is. */
class SocialAuthError extends Error {}

async function googleCredential(): Promise<AuthCredential | null> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new SocialAuthError(
      'Chưa cấu hình đăng nhập Google. Thêm EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID vào .env.'
    );
  }
  // Loaded on demand so a dev client built before this module existed still starts.
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (response.type !== 'success') return null;
  const idToken = response.data.idToken;
  if (!idToken) throw new SocialAuthError('Không lấy được thông tin từ Google. Thử lại sau.');
  // Drop the native session so the next tap offers the account picker again.
  await GoogleSignin.signOut().catch(() => {});
  return GoogleAuthProvider.credential(idToken);
}

async function facebookCredential(): Promise<AuthCredential | null> {
  const { AccessToken, LoginManager } = await import('react-native-fbsdk-next');
  const permissions = ['public_profile', 'email'];
  const result =
    Platform.OS === 'ios'
      ? await LoginManager.logInWithPermissions(permissions, 'enabled')
      : await LoginManager.logInWithPermissions(permissions);
  if (result.isCancelled) return null;
  const token = await AccessToken.getCurrentAccessToken();
  if (!token?.accessToken)
    throw new SocialAuthError('Không lấy được thông tin từ Facebook. Thử lại sau.');
  LoginManager.logOut();
  return FacebookAuthProvider.credential(token.accessToken);
}

/** Opens the provider's native sign-in; null when the user closes it. */
export async function getSocialCredential(
  provider: SocialProvider
): Promise<AuthCredential | null> {
  try {
    return provider === 'google' ? await googleCredential() : await facebookCredential();
  } catch (error) {
    throw new Error(socialErrorMessage(error, provider, 'Không đăng nhập được. Thử lại sau.'));
  }
}

/** Same wording as the web `getClientAuthErrorMessage` for the cases a native sign-in can hit. */
export function socialErrorMessage(error: unknown, provider: SocialProvider, fallback: string) {
  const name = SOCIAL_PROVIDER_NAMES[provider];
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  switch (code) {
    case 'auth/account-exists-with-different-credential':
      return `Email này đã có tài khoản Trao, đăng ký bằng cách khác (Google, Facebook hoặc mật khẩu). Hãy đăng nhập bằng cách đó, rồi vào Tôi → Tài khoản để liên kết ${name}. Lần sau đăng nhập bằng cách nào cũng được.`;
    case 'auth/credential-already-in-use':
      return 'Tài khoản này đã liên kết với một tài khoản Trao khác.';
    case 'auth/requires-recent-login':
      return 'Vì bảo mật, hãy đăng xuất và đăng nhập lại, sau đó thử lại.';
    case 'auth/network-request-failed':
      return 'Không có kết nối mạng. Vui lòng thử lại.';
    case 'auth/user-disabled':
      return 'Tài khoản này đã bị vô hiệu hóa.';
    case 'auth/too-many-requests':
      return 'Quá nhiều lần thử. Vui lòng thử lại sau.';
    case 'auth/operation-not-allowed':
      return 'Phương thức đăng nhập này chưa được bật.';
    case 'PLAY_SERVICES_NOT_AVAILABLE':
      return 'Máy chưa có Google Play Services để đăng nhập Google.';
    default:
      return error instanceof SocialAuthError ? error.message : fallback;
  }
}

/** Providers on the signed-in Firebase user, e.g. `password`, `google.com`. */
export function getLinkedProviders() {
  return getFirebaseAuth()?.currentUser?.providerData ?? [];
}

/** Adds Google or Facebook to the signed-in account. Resolves false when the user backs out. */
export async function linkSocialProvider(provider: SocialProvider): Promise<boolean> {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) throw new Error('Bạn cần đăng nhập lại.');
  const credential = await getSocialCredential(provider);
  if (!credential) return false;
  try {
    await linkWithCredential(user, credential);
    await user.reload();
  } catch (error) {
    throw new Error(socialErrorMessage(error, provider, 'Không liên kết được. Thử lại sau.'));
  }
  return true;
}

/**
 * Removes Google or Facebook from the account. At least one sign-in method must stay,
 * otherwise the user could lock themselves out.
 */
export async function unlinkSocialProvider(provider: SocialProvider): Promise<void> {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) throw new Error('Bạn cần đăng nhập lại.');
  if (user.providerData.length <= 1) {
    throw new Error(
      'Cần giữ ít nhất một cách đăng nhập. Hãy đặt mật khẩu hoặc liên kết cách khác trước.'
    );
  }
  try {
    await unlink(user, SOCIAL_PROVIDER_IDS[provider]);
    await user.reload();
  } catch (error) {
    throw new Error(socialErrorMessage(error, provider, 'Không bỏ liên kết được. Thử lại sau.'));
  }
}
