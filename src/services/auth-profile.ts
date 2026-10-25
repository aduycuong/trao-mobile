import { apiRequest } from './api';
import { getAsyncStorage } from '@/utils/async-storage';

/** What the app needs beyond Firebase Auth: the profile lives in the backend DB. */
export type AuthProfile = {
  uid: string;
  displayName: string | null;
  /** Avatar saved in the backend (photo URL or storage key); the source of truth for the photo. */
  avatarUrl: string | null;
};

type MeResponse = {
  id: string;
  displayName: string | null;
  avatarUrl?: string | null;
};

/**
 * Saves the avatar for the signed-in user: the backend updates both the Firebase photo and the
 * users table, so everyone else sees it too.
 */
export async function saveOwnAvatar(token: string, avatarUrl: string) {
  await apiRequest('/api/parent/profile', { method: 'PATCH', body: { avatarUrl }, token });
}

export async function fetchAuthProfile(uid: string, token: string): Promise<AuthProfile> {
  const me = await apiRequest<MeResponse>('/api/me', { token });
  return {
    uid,
    displayName: me.displayName,
    avatarUrl: me.avatarUrl ?? null,
  };
}

/**
 * Last profile of the signed-in user, so a cold start can render before (or without) reaching
 * `/api/me`. Cleared on sign-out.
 */
const PROFILE_STORAGE_KEY = 'trao.auth-profile';

export async function readCachedProfile(uid: string): Promise<AuthProfile | null> {
  try {
    const value = await getAsyncStorage().getItem(PROFILE_STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<AuthProfile>;
    if (parsed.uid !== uid) return null;
    return {
      uid,
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : null,
      avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : null,
    };
  } catch {
    return null;
  }
}

export async function cacheProfile(profile: AuthProfile) {
  try {
    await getAsyncStorage().setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Without the cache the next cold start just waits for `/api/me`.
  }
}

export async function clearCachedProfile() {
  try {
    await getAsyncStorage().removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // Ignore; a stale entry is keyed by uid and never matches another user.
  }
}
