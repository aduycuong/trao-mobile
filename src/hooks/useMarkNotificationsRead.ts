import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { countsAfterRead } from '@/services/notifications/notification-rules';
import {
  markNotificationsReadRequest,
  NOTIFICATIONS_KEY,
  unreadNotificationsKey,
} from '@/services/notifications/notifications-api';
import type { NotificationsPage, NotificationUnreadCounts } from '@/types/notifications';

type ListData = InfiniteData<NotificationsPage>;

/**
 * Marks one notification read, or all of them when called without an id. The rows and the unread
 * counts change at once; a failure puts the server's truth back and says so.
 */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  const { session, getIdToken } = useAuth();
  const listKey = [...NOTIFICATIONS_KEY, 'list', session?.uid ?? null] as const;

  return useMutation({
    mutationFn: async (id?: string) => markNotificationsReadRequest(await getIdToken(), id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const target = id
        ? queryClient
            .getQueriesData<ListData>({ queryKey: listKey })
            .flatMap(([, data]) => data?.pages.flatMap((page) => page.items) ?? [])
            .find((item) => item.id === id)
        : undefined;
      // The counts drop first, so a chip never keeps a number its row no longer has.
      queryClient.setQueryData<NotificationUnreadCounts>(
        unreadNotificationsKey(session?.uid),
        (current) => {
          if (!current) return current;
          if (id && !target) return current;
          return countsAfterRead(current, id ? target : undefined);
        }
      );
      queryClient.setQueriesData<ListData>({ queryKey: listKey }, (current) =>
        current
          ? {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  !id || item.id === id ? { ...item, read: true } : item
                ),
              })),
            }
          : current
      );
    },
    onError: (error) => {
      Alert.alert(
        'Không đánh dấu được',
        error instanceof Error ? error.message : 'Bạn thử lại sau nhé.'
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}
