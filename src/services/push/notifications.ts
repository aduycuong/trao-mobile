import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

/**
 * Loaded lazily: the native module throws on import when the installed dev client was built
 * before it was added, and that would crash the whole app instead of just skipping push.
 */
export function getNotifications(): NotificationsModule | null {
  if (Platform.OS === 'web') return null;
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
  } catch (error) {
    console.warn('[push] expo-notifications is not available in this build', error);
    cached = null;
  }
  return cached;
}
