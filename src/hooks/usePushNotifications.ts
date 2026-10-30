import { useQueryClient } from '@tanstack/react-query';
import { useRootNavigationState, useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { getActiveChatInbox } from '@/services/push/active-chat';
import { getNotifications } from '@/services/push/notifications';
import { registerDeviceForPush } from '@/services/push/push-device';
import { NOTIFICATIONS_KEY } from '@/services/notifications/notifications-api';
import { chatInboxIdFromData, routeForNotificationData } from '@/services/push/push-routing';

/**
 * Push for the signed-in user: registers the device, keeps a chat's banners quiet while its thread
 * is open, opens the place a tapped notification is about (also when it started the app), and keeps
 * the notification list and the bell's unread count fresh: a push that arrives while the app is open
 * and coming back to the foreground both refresh them. Mount once, inside the router.
 */
export function usePushNotifications() {
  const router = useRouter();
  const queryClient = useQueryClient();
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

  // A push that arrives while the app is open means a new row in the list; chat has none.
  useEffect(() => {
    const Notifications = getNotifications();
    if (!Notifications || !signedIn) return;
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      if (chatInboxIdFromData(notification.request.content.data)) return;
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    });
    return () => subscription.remove();
  }, [signedIn, queryClient]);

  // Coming back to the app: pushes may have arrived while it was in the background.
  useEffect(() => {
    if (!signedIn) return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    });
    return () => subscription.remove();
  }, [signedIn, queryClient]);

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

  // A tap opens the place the push is about. Ignored until the user is known and the router is mounted.
  useEffect(() => {
    const Notifications = getNotifications();
    if (!Notifications || !signedIn || status === 'restoring' || !navigationKey) return;

    const open = (response: import('expo-notifications').NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handled.current === id) return;
      const route = routeForNotificationData(response.notification.request.content.data);
      if (!route) return;
      handled.current = id;
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      router.push(route as Href);
    };

    void Notifications.getLastNotificationResponseAsync().then(open);
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [signedIn, status, navigationKey, router, queryClient]);
}
