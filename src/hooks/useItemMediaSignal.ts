import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeItemMediaSignal } from '@/services/chat/rtdb';

/**
 * Calls `onRing` when the server reports a change in the check of the signed-in user's items, and
 * once right after subscribing. Listens only while `enabled`, i.e. while something on screen is
 * being checked.
 */
export function useItemMediaSignal(enabled: boolean, onRing: () => void) {
  const { session } = useAuth();
  const onRingRef = useRef(onRing);
  useEffect(() => {
    onRingRef.current = onRing;
  }, [onRing]);

  const uid = session?.uid;
  useEffect(() => {
    if (!enabled || !uid) return;
    return subscribeItemMediaSignal(uid, () => onRingRef.current()) ?? undefined;
  }, [enabled, uid]);
}
