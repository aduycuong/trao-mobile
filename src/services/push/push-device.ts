import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ApiError, apiRequest } from '@/services/api';
import { getNotifications } from './notifications';

/** Matches `PUSH_CHANNELS` on the backend; a push for a missing channel is not shown. */
const CHANNELS = [
  { id: 'chat', name: 'Tin nhắn', importance: 'HIGH' },
] as const;

/** Token this device registered in the current session, so sign-out can remove it. */
let registeredToken: string | null = null;

async function ensureAndroidChannels() {
  const Notifications = getNotifications();
  if (!Notifications || Platform.OS !== 'android') return;

  await Promise.all(
    CHANNELS.map((channel) =>
      Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: Notifications.AndroidImportance[channel.importance],
      })
    )
  );
}

async function ensurePermission(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return requested.granted;
}

/** Sends the token to the backend; calling it on every launch is the heartbeat it expects. */
async function registerPushToken(token: string, idToken: string) {
  await apiRequest('/api/push/devices', {
    body: {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      appVersion: Constants.expoConfig?.version,
    },
    token: idToken,
  });
  registeredToken = token;
}

let inFlight: Promise<void> | null = null;

async function registerOnce(getIdToken: () => Promise<string>) {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await ensureAndroidChannels();
    if (!(await ensurePermission())) return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {});
    await registerPushToken(data, await getIdToken());
  } catch (error) {
    // Simulators, offline or a build without push credentials; the next launch retries.
    const status = error instanceof ApiError ? ` (HTTP ${error.status})` : '';
    console.warn(`[push] registration failed${status}`, error);
  }
}

/**
 * Asks for permission, reads the Expo push token and registers it. Never throws. Launch, sign-in
 * and token changes all trigger it at once; overlapping token fetches cancel each other, so
 * callers share the run that is already going.
 */
export function registerDeviceForPush(getIdToken: () => Promise<string>): Promise<void> {
  inFlight ??= registerOnce(getIdToken).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Removes this device's token on sign-out so the next user of the device gets none of ours. */
export async function unregisterDeviceForPush(idToken: string) {
  const token = registeredToken;
  if (!token) return;

  try {
    await apiRequest('/api/push/devices', { method: 'DELETE', body: { token }, token: idToken });
  } catch (error) {
    console.warn('[push] unregister failed', error);
  }
  registeredToken = null;
}

/** Clears the notifications of a chat from the tray once the thread is open. */
export async function dismissChatNotifications(inboxId: string) {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented
        .filter((item) => {
          const data = item.request.content.data as { inboxId?: unknown } | undefined;
          return data?.inboxId === inboxId;
        })
        .map((item) => Notifications.dismissNotificationAsync(item.request.identifier))
    );
  } catch {
    // Best effort; stale notifications in the tray are harmless.
  }
}
