import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useQueryClient } from '@tanstack/react-query';
import {
  cacheProfile,
  clearCachedProfile,
  fetchAuthProfile,
  saveOwnAvatar,
  readCachedProfile,
  type AuthProfile,
} from '@/services/auth-profile';
import { getFirebaseAuth } from '@/services/firebase';
import {
  canChangePassword as hasPasswordLogin,
  changeAccountPassword,
  isNetworkAuthError,
  registerWithEmail,
  signInWithEmail,
  signOutFirebase,
  updateAccountProfile,
} from '@/services/firebase-auth';
import { markPresenceOffline } from '@/services/chat/rtdb';
import { unregisterDeviceForPush } from '@/services/push/push-device';

export type AppSession = {
  /** Firebase uid. */
  uid: string;
  email: string;
  displayName: string | null;
  /** Public URL of the profile photo (the Firebase photoURL). */
  avatarUrl: string | null;
};

/**
 * - `restoring`: Firebase is still reading the persisted user (cold start); keep the splash up.
 * - `signedIn`: `session` is set.
 * - `profileError`: Firebase has a user but the profile could not be loaded (offline, no cache).
 * - `signedOut`: show sign-in.
 */
export type AuthStatus = 'restoring' | 'signedIn' | 'profileError' | 'signedOut';

type AuthContextValue = {
  status: AuthStatus;
  session: AppSession | null;
  profileError: Error | null;
  retryProfile: () => Promise<void>;
  /** Current idToken; the Firebase SDK refreshes it when it is about to expire. */
  getIdToken: () => Promise<string>;
  signIn: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Changes the signed-in user's name and/or photo; omitted fields stay as they are. */
  updateProfile: (changes: { displayName?: string; avatarUrl?: string | null }) => Promise<void>;
  /**
   * Reloads the Firebase user and the profile after the backend changed the name or photo
   * (`PATCH /api/me/account`); the renewed token stops the next sync writing the old values back.
   */
  refreshProfile: () => Promise<void>;
  /** False for accounts without an email + password login. */
  canChangePassword: boolean;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>(() =>
    getFirebaseAuth() ? 'restoring' : 'signedOut'
  );
  const [session, setSession] = useState<AppSession | null>(null);
  const [profileError, setProfileError] = useState<Error | null>(null);
  const sessionRef = useRef<AppSession | null>(null);
  const uidRef = useRef<string | null>(null);
  /** Set while a sign-in call owns resolving the new user, so the listener stays out. */
  const signingInRef = useRef(false);

  /** Drops cached server data whenever the Firebase user changes (sign-in, sign-out, switch). */
  const trackUid = useCallback(
    (uid: string | null) => {
      if (uidRef.current === uid) return;
      uidRef.current = uid;
      queryClient.removeQueries();
    },
    [queryClient]
  );

  const applyProfile = useCallback((user: User, profile: AuthProfile) => {
    // Ignore results that arrive after a sign-out or another sign-in.
    if (getFirebaseAuth()?.currentUser?.uid !== user.uid) return;
    const next: AppSession = {
      uid: user.uid,
      email: user.email ?? '',
      displayName: profile.displayName?.trim() || user.displayName || null,
      avatarUrl: profile.avatarUrl || user.photoURL || null,
    };
    sessionRef.current = next;
    setSession(next);
    setProfileError(null);
    setStatus('signedIn');
    void cacheProfile({
      uid: user.uid,
      displayName: next.displayName,
      avatarUrl: next.avatarUrl,
    });
  }, []);

  /** Loads the profile from `/api/me` (source of truth on the backend). */
  const syncProfile = useCallback(
    async (user: User) =>
      applyProfile(user, await fetchAuthProfile(user.uid, await user.getIdToken())),
    [applyProfile]
  );

  /** Background refresh: a cached or hinted profile is already on screen, so failures are fine. */
  const refreshProfileQuietly = useCallback(
    (user: User) => {
      syncProfile(user).catch((error) => console.warn('[auth] profile refresh failed', error));
    },
    [syncProfile]
  );

  const loadProfile = useCallback(
    async (user: User) => {
      try {
        await syncProfile(user);
      } catch (error) {
        if (getFirebaseAuth()?.currentUser?.uid !== user.uid) return;
        setProfileError(
          error instanceof Error && !isNetworkAuthError(error)
            ? error
            : new Error('Không thể kết nối. Hãy kiểm tra mạng và thử lại.')
        );
        setStatus('profileError');
      }
    },
    [syncProfile]
  );

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;

    // Fires once the persisted user is restored (cold start), on sign-in/out, and when the SDK
    // drops a user whose refresh token was revoked or whose account was disabled.
    return onAuthStateChanged(auth, (user) => {
      trackUid(user?.uid ?? null);

      if (!user) {
        sessionRef.current = null;
        setSession(null);
        setProfileError(null);
        setStatus('signedOut');
        return;
      }

      if (signingInRef.current || sessionRef.current?.uid === user.uid) return;

      void (async () => {
        const cached = await readCachedProfile(user.uid);
        if (auth.currentUser?.uid !== user.uid) return;
        if (cached) {
          // Render right away, even offline; confirm with the backend in the background.
          applyProfile(user, cached);
          refreshProfileQuietly(user);
        } else {
          await loadProfile(user);
        }
      })();
    });
  }, [applyProfile, loadProfile, refreshProfileQuietly, trackUid]);

  const retryProfile = useCallback(async () => {
    const user = getFirebaseAuth()?.currentUser;
    if (user) await loadProfile(user);
  }, [loadProfile]);

  const getIdToken = useCallback(async () => {
    const user = getFirebaseAuth()?.currentUser;
    if (!user) throw new Error('Bạn cần đăng nhập để tiếp tục.');
    try {
      return await user.getIdToken();
    } catch (error) {
      if (isNetworkAuthError(error))
        throw new Error('Không thể kết nối. Hãy kiểm tra mạng và thử lại.');
      throw error;
    }
  }, []);

  /** Runs a Firebase sign-in so the app can render immediately; `/api/me` then fills the profile. */
  const runSignIn = useCallback(
    async (signInUser: () => Promise<User>) => {
      signingInRef.current = true;
      try {
        const user = await signInUser();
        trackUid(user.uid);
        applyProfile(user, {
          uid: user.uid,
          displayName: user.displayName,
          avatarUrl: user.photoURL,
        });
        refreshProfileQuietly(user);
      } finally {
        signingInRef.current = false;
      }
    },
    [applyProfile, refreshProfileQuietly, trackUid]
  );

  const signIn = useCallback(
    (email: string, password: string) =>
      runSignIn(() => signInWithEmail(email.trim().toLowerCase(), password)),
    [runSignIn]
  );

  const register = useCallback(
    (displayName: string, email: string, password: string) =>
      runSignIn(() => registerWithEmail(displayName.trim(), email.trim().toLowerCase(), password)),
    [runSignIn]
  );

  const signOut = useCallback(async () => {
    const current = sessionRef.current;
    // Presence rules need the user's auth, so write "offline" before the SDK signs out.
    if (current) await markPresenceOffline(current.uid);
    // Needs the idToken, so drop this device's push token before the SDK signs out.
    const idToken = await getFirebaseAuth()
      ?.currentUser?.getIdToken()
      .catch(() => null);
    if (idToken) await unregisterDeviceForPush(idToken);
    await clearCachedProfile();
    await signOutFirebase();
  }, []);

  const updateProfile = useCallback(
    async (changes: { displayName?: string; avatarUrl?: string | null }) => {
      // A new avatar goes through the backend so the DB and Firebase photo stay in step.
      const newAvatar = changes.avatarUrl || null;
      if (newAvatar) await saveOwnAvatar(await getIdToken(), newAvatar);
      const user = await updateAccountProfile({
        ...(changes.displayName === undefined ? {} : { displayName: changes.displayName }),
        ...(changes.avatarUrl === null ? { photoURL: null } : {}),
      });
      if (newAvatar) await user.reload();
      try {
        // `/api/me` now returns the avatar just saved.
        await syncProfile(user);
      } catch {
        applyProfile(user, {
          uid: user.uid,
          displayName: user.displayName,
          avatarUrl: user.photoURL,
        });
      }
    },
    [applyProfile, getIdToken, syncProfile]
  );

  const refreshProfile = useCallback(async () => {
    const user = getFirebaseAuth()?.currentUser;
    if (!user) return;
    await user.getIdToken(true);
    await user.reload();
    await syncProfile(user);
  }, [syncProfile]);

  const changePassword = useCallback(
    (currentPassword: string, newPassword: string) =>
      changeAccountPassword(currentPassword, newPassword),
    []
  );

  const passwordLogin = session ? hasPasswordLogin() : false;

  const value = useMemo(
    () => ({
      canChangePassword: passwordLogin,
      changePassword,
      getIdToken,
      profileError,
      refreshProfile,
      register,
      retryProfile,
      session,
      signIn,
      signOut,
      status,
      updateProfile,
    }),
    [
      changePassword,
      getIdToken,
      passwordLogin,
      profileError,
      refreshProfile,
      register,
      retryProfile,
      session,
      signIn,
      signOut,
      status,
      updateProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
