import { useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getActiveChatInbox } from '@/services/push/active-chat';
import { getNotifications } from '@/services/push/notifications';
import { registerDeviceForPush } from '@/services/push/push-device';
import { chatInboxIdFromData } from '@/services/push/push-routing';

/**
 * Push for the signed-in user: registers the device, keeps a chat's banners quiet while its thread
 * is open, and opens the thread when a chat notification is tapped (also when it started the app).
 * Mount once, inside the router.
 */
export function usePushNotifications() {
  const router = useRouter();
  const navigationKey = useRootNavigationState()?.key;
  const { session, status, getIdToken } = useAuth();
  const signedIn = !!session;
  const handled = useRef<string | null>(null);

  // How a notification that arrives while the app is open is shown.
  useEffect(() => {
    const Notifications = getNotifications();
    if (!Notifications) return;
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const inboxId = chatInboxIdFromData(notification.request.content.data);
        const quiet = inboxId !== null && inboxId === getActiveChatInbox();
        return {
          shouldShowBanner: !quiet,
          shouldShowList: !quiet,
          shouldPlaySound: !quiet,
          shouldSetBadge: false,
        };
      },
    });
  }, []);

  // Launch, sign-in and token changes all register again; the backend treats it as a heartbeat.
  useEffect(() => {
    const Notifications = getNotifications();
    if (!Notifications || !signedIn) return;
    void registerDeviceForPush(getIdToken);
    const subscription = Notifications.addPushTokenListener(() => {
      void registerDeviceForPush(getIdToken);
    });
    return () => subscription.remove();
  }, [signedIn, getIdToken]);

  // A tap opens the thread. Ignored until the user is known and the router is mounted.
  useEffect(() => {
    const Notifications = getNotifications();
    if (!Notifications || !signedIn || status === 'restoring' || !navigationKey) return;

    const open = (response: import('expo-notifications').NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handled.current === id) return;
      const inboxId = chatInboxIdFromData(response.notification.request.content.data);
      if (!inboxId) return;
      handled.current = id;
      router.push({ pathname: '/chat/[inboxId]', params: { inboxId } });
    };

    void Notifications.getLastNotificationResponseAsync().then(open);
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [signedIn, status, navigationKey, router]);
}
