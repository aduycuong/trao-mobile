import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { PenaltyBlockedSheet } from '@/components/penalties/penalty-blocked-sheet';
import { useAuth } from '@/hooks/useAuth';
import { activeCardKey, fetchActiveCard } from '@/services/penalties/penalties-api';
import { isBlocked } from '@/services/penalties/penalty-rules';
import type { ActiveCard, PenaltyAction } from '@/types/penalties';

/** The card the signed-in user is under, if any; read again when it may have changed. */
export function useActiveCard(): ActiveCard | null {
  const { session, getIdToken } = useAuth();
  const { data } = useQuery({
    queryKey: activeCardKey(session?.uid),
    queryFn: async () => fetchActiveCard(await getIdToken()),
    enabled: !!session,
    staleTime: 60_000,
  });
  return session ? (data?.card ?? null) : null;
}

/**
 * Asks before a blocked action: `guard('post')` or `guard('trade')` answers whether the action may
 * go on; when a card blocks it, the blocked sheet opens (render `sheet` in the screen) and the
 * answer is false. The server refuses the same actions (`ERR_PENALIZED`), so this only makes the
 * reason clear before the tap does nothing.
 */
export function usePenaltyGuard() {
  const card = useActiveCard();
  const [blocked, setBlocked] = useState<{ action: PenaltyAction; onChat?: () => void } | null>(
    null
  );

  function guard(action: PenaltyAction, options?: { onChat?: () => void }): boolean {
    if (!card || !isBlocked(card, action)) return true;
    setBlocked({ action, onChat: options?.onChat });
    return false;
  }

  const sheet =
    blocked && card ? (
      <PenaltyBlockedSheet
        card={card}
        action={blocked.action}
        onChat={blocked.onChat}
        onClose={() => setBlocked(null)}
      />
    ) : null;
  return { guard, sheet };
}
