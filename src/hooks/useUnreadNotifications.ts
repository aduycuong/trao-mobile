import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchUnreadNotifications,
  unreadNotificationsKey,
} from '@/services/notifications/notifications-api';

/** Unread counts of the bell and of the filter chips: one query, so they stay when the filter changes. */
export function useUnreadNotifications() {
  const { session, getIdToken } = useAuth();
  return useQuery({
    queryKey: unreadNotificationsKey(session?.uid),
    queryFn: async () => fetchUnreadNotifications(await getIdToken()),
    enabled: !!session,
    staleTime: 30_000,
  });
}
