import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAT_TYPING_EXPIRE_MS, CHAT_TYPING_REFRESH_MS } from '@/services/chat/constants';
import {
  clearChatTyping,
  sendChatTyping,
  subscribeChatPresence,
  subscribeChatTyping,
} from '@/services/chat/rtdb';

/** Whether another user is online (false while unknown or when RTDB is off). */
export function usePeerPresence(firebaseUid: string | null | undefined) {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!firebaseUid) return;
    const unsubscribe = subscribeChatPresence(firebaseUid, setOnline);
    return () => {
      unsubscribe?.();
      setOnline(false);
    };
  }, [firebaseUid]);

  return online;
}

/** Firebase uids of the other users who are typing in the inbox right now. */
export function useTypingUids(inboxId: string | null, selfFirebaseUid: string | null) {
  const [lastSeen, setLastSeen] = useState<Record<string, number>>({});
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!inboxId) return;
    const unsubscribe = subscribeChatTyping(inboxId, setLastSeen);
    return () => {
      unsubscribe?.();
      setLastSeen({});
    };
  }, [inboxId]);

  const hasEntries = Object.keys(lastSeen).length > 0;
  useEffect(() => {
    if (!hasEntries) return;
    // Re-evaluate staleness: nothing else changes when someone just stops typing.
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [hasEntries, lastSeen]);

  return Object.entries(lastSeen)
    .filter(([uid, seenAt]) => uid !== selfFirebaseUid && now - seenAt < CHAT_TYPING_EXPIRE_MS)
    .map(([uid]) => uid);
}

/** `notifyTyping` is throttled to one write per refresh interval. */
export function useTypingNotifier(inboxId: string | null, selfFirebaseUid: string | null) {
  const lastSentRef = useRef(0);

  const notifyTyping = useCallback(() => {
    if (!inboxId || !selfFirebaseUid) return;
    const now = Date.now();
    if (now - lastSentRef.current < CHAT_TYPING_REFRESH_MS) return;
    lastSentRef.current = now;
    void sendChatTyping(inboxId, selfFirebaseUid);
  }, [inboxId, selfFirebaseUid]);

  const stopTyping = useCallback(() => {
    if (!inboxId || !selfFirebaseUid) return;
    lastSentRef.current = 0;
    void clearChatTyping(inboxId, selfFirebaseUid);
  }, [inboxId, selfFirebaseUid]);

  useEffect(() => stopTyping, [stopTyping]);

  return { notifyTyping, stopTyping };
}

/** Which of these users are online right now (one presence subscription per uid). */
export function useOnlineUids(firebaseUids: string[]) {
  const [online, setOnline] = useState<Record<string, boolean>>({});
  // A stable key so a new array with the same uids doesn't resubscribe.
  const key = [...new Set(firebaseUids)].sort().join('|');

  useEffect(() => {
    if (!key) return;
    const unsubscribers = key
      .split('|')
      .map((uid) =>
        subscribeChatPresence(uid, (value) =>
          setOnline((current) => (current[uid] === value ? current : { ...current, [uid]: value }))
        )
      );
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe?.());
      setOnline({});
    };
  }, [key]);

  return new Set(Object.keys(online).filter((uid) => online[uid]));
}
