import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NOTIFICATIONS_KEY } from '@/services/notifications/notifications-api';
import { subscribeUserEvent, type UserEventKind } from '@/services/chat/rtdb';

/** What each doorbell makes the open screens read again (the web `UserEventsListener`). */
const QUERY_ROOTS: Record<UserEventKind, readonly QueryKey[]> = {
  deals: [
    ['deals'],
    ['chat', 'deal-index'],
    ['listing-offers'],
    ['listing-page'],
    ['auction-board'],
    ['transactions'],
  ],
  notifications: [NOTIFICATIONS_KEY],
};

const KINDS = Object.keys(QUERY_ROOTS) as UserEventKind[];

/** Rings that come within this time of each other read once. */
const COALESCE_MS = 400;

/**
 * Listens to the signed-in user's doorbells (`user-events/{uid}/{kind}`) and reads the matching
 * queries again, so the deal, transaction and notification screens stay live. Without RTDB the
 * queries still read again when a screen opens and when the app comes back to the front.
 */
export function useUserEvents() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const uid = session?.uid ?? null;

  useEffect(() => {
    if (!uid) return;
    const timers = new Map<UserEventKind, ReturnType<typeof setTimeout>>();
    const unsubscribes = KINDS.map((kind) =>
      subscribeUserEvent(uid, kind, () => {
        clearTimeout(timers.get(kind));
        timers.set(
          kind,
          setTimeout(() => {
            for (const queryKey of QUERY_ROOTS[kind]) {
              void queryClient.invalidateQueries({ queryKey });
            }
          }, COALESCE_MS)
        );
      })
    );
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      for (const unsubscribe of unsubscribes) unsubscribe?.();
    };
  }, [uid, queryClient]);
}
