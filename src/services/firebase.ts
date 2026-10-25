import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  inMemoryPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { getAsyncStorage } from '@/utils/async-storage';

/**
 * One Firebase app shared by Auth and RTDB, so the database connection is always
 * authenticated as whoever is signed in (and follows the SDK's token refreshes).
 */
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL?.trim() || undefined,
};

export function isFirebaseConfigured() {
  return !!(config.apiKey && config.projectId);
}

export function isRtdbConfigured() {
  return isFirebaseConfigured() && !!config.databaseURL;
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  return getApps()[0] ?? initializeApp(config);
}

function getPersistence() {
  try {
    return getReactNativePersistence(getAsyncStorage());
  } catch (error) {
    // Dev client built without the AsyncStorage module: still works, but signs out on restart.
    console.warn('[auth] AsyncStorage unavailable, session will not persist', error);
    return inMemoryPersistence;
  }
}

let auth: Auth | null = null;

/** Firebase Auth with the session persisted in AsyncStorage (restored on cold start). */
export function getFirebaseAuth(): Auth | null {
  if (auth) return auth;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    auth = initializeAuth(app, { persistence: getPersistence() });
  } catch {
    // Already initialized (fast refresh keeps the app instance alive).
    auth = getAuth(app);
  }
  return auth;
}
