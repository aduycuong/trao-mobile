import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  clearGuestPreferences,
  loadGuestPreferences,
} from '@/services/onboarding/guest-preferences';
import { fetchOnboarded, postOnboarding } from '@/services/onboarding/onboarding-api';
import type { GuestPreferences } from '@/types/onboarding';

export const ONBOARDING_QUERY_KEY = ['me', 'onboarded'] as const;

export type OnboardingState = {
  /** Still working it out: auth restoring, the account, or moving a guest's picks over. */
  loading: boolean;
  onboarded: boolean;
};

/**
 * Whether the start flow is done. A guest keeps the answer on this device; a signed-in user keeps
 * it on the account. When a guest who already picked signs in to an account that has none, the
 * picks move to the account.
 */
export function useOnboardingState(): OnboardingState {
  const { status, session, getIdToken } = useAuth();
  const queryClient = useQueryClient();
  const uid = session?.uid;
  const [guestPrefs, setGuestPrefs] = useState<GuestPreferences | null | undefined>(undefined);
  const [moveSettled, setMoveSettled] = useState(false);

  useEffect(() => {
    if (status === 'restoring') return;
    let cancelled = false;
    loadGuestPreferences().then((prefs) => {
      if (!cancelled) setGuestPrefs(prefs);
    });
    return () => {
      cancelled = true;
    };
  }, [status, uid]);

  const me = useQuery({
    queryKey: [...ONBOARDING_QUERY_KEY, uid],
    queryFn: async () => fetchOnboarded(await getIdToken()),
    enabled: !!uid,
  });

  useEffect(() => {
    if (me.data === undefined || guestPrefs === undefined) return;
    if (me.data) {
      if (guestPrefs) clearGuestPreferences();
      return;
    }
    if (!guestPrefs) return;

    let cancelled = false;
    getIdToken()
      .then((token) =>
        postOnboarding(token, {
          location: guestPrefs.location,
          categoryIds: guestPrefs.categoryIds,
        })
      )
      .then(() => {
        clearGuestPreferences();
        return queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
      })
      .catch(() => {
        // Keep the picks on this device; the next launch tries again.
      })
      .finally(() => {
        if (!cancelled) setMoveSettled(true);
      });
    return () => {
      cancelled = true;
    };
  }, [me.data, guestPrefs, getIdToken, queryClient]);

  if (status === 'restoring' || guestPrefs === undefined)
    return { loading: true, onboarded: false };
  if (!uid) return { loading: false, onboarded: guestPrefs !== null };
  if (me.isLoading) return { loading: true, onboarded: false };
  // Offline or a failed read must not trap the user in the start flow.
  if (me.isError) return { loading: false, onboarded: true };
  if (me.data === false && guestPrefs && !moveSettled) return { loading: true, onboarded: false };
  return { loading: false, onboarded: me.data ?? true };
}
