import {
  createUserWithEmailAndPassword,
  signInWithCustomToken as firebaseSignInWithCustomToken,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  updatePassword,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

const errorMessages: Record<string, string> = {
  'auth/custom-token-mismatch': 'Phiên đăng nhập không hợp lệ. Vui lòng thử lại.',
  'auth/email-already-in-use': 'Email này đã được sử dụng.',
  'auth/invalid-credential': 'Email hoặc mật khẩu chưa đúng.',
  'auth/invalid-custom-token': 'Phiên đăng nhập không hợp lệ. Vui lòng thử lại.',
  'auth/invalid-email': 'Email chưa đúng định dạng.',
  'auth/missing-password': 'Vui lòng nhập mật khẩu.',
  'auth/network-request-failed': 'Không thể kết nối. Hãy kiểm tra mạng và thử lại.',
  'auth/operation-not-allowed': 'Đăng nhập bằng email chưa được bật.',
  'auth/too-many-requests': 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.',
  'auth/user-disabled': 'Tài khoản này đã bị vô hiệu hóa.',
  'auth/user-not-found': 'Email hoặc mật khẩu chưa đúng.',
  'auth/weak-password': 'Mật khẩu cần có ít nhất 6 ký tự.',
  'auth/wrong-password': 'Email hoặc mật khẩu chưa đúng.',
};

export function isNetworkAuthError(error: unknown) {
  return (error as { code?: unknown } | null)?.code === 'auth/network-request-failed';
}

function requireAuth(): Auth {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase chưa được cấu hình. Hãy thêm EXPO_PUBLIC_FIREBASE_API_KEY.');
  }
  return auth;
}

/** Runs a Firebase call and turns its error codes into Vietnamese messages. */
async function withAuthErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    if (typeof code === 'string') {
      throw new Error(errorMessages[code] ?? 'Không thể xác thực. Vui lòng thử lại.');
    }
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const auth = requireAuth();
  return withAuthErrors(async () => (await signInWithEmailAndPassword(auth, email, password)).user);
}

export async function signInWithCustomToken(token: string): Promise<User> {
  const auth = requireAuth();
  return withAuthErrors(async () => (await firebaseSignInWithCustomToken(auth, token)).user);
}

export async function registerWithEmail(
  displayName: string,
  email: string,
  password: string
): Promise<User> {
  const auth = requireAuth();
  return withAuthErrors(async () => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    try {
      await updateProfile(user, { displayName });
      // The backend reads the name from the idToken when it first creates the user row.
      await user.getIdToken(true);
    } catch (error) {
      // The account exists and is signed in; a missing name must not fail the whole sign-up.
      console.warn('[auth] could not set display name', error);
    }
    return user;
  });
}

export async function signOutFirebase() {
  await getFirebaseAuth()?.signOut();
}

/** Name and photo live on the Firebase user; the backend copies them from the next idToken. */
export async function updateAccountProfile(profile: {
  displayName?: string;
  photoURL?: string | null;
}): Promise<User> {
  const user = requireAuth().currentUser;
  if (!user) throw new Error('Bạn cần đăng nhập để cập nhật tài khoản.');
  await withAuthErrors(async () => {
    await updateProfile(user, profile);
    await user.getIdToken(true);
  });
  return user;
}

export function canChangePassword(): boolean {
  return !!getFirebaseAuth()?.currentUser?.providerData.some(
    (info) => info.providerId === 'password'
  );
}

export async function changeAccountPassword(currentPassword: string, newPassword: string) {
  const user = requireAuth().currentUser;
  if (!user?.email) throw new Error('Tài khoản này không đổi được mật khẩu.');

  try {
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email, currentPassword)
    );
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential')
      throw new Error('Mật khẩu hiện tại chưa đúng.');
    return withAuthErrors(() => Promise.reject(error));
  }
  await withAuthErrors(() => updatePassword(user, newPassword));
}
