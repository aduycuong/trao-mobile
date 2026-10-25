import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { useChat } from '@/hooks/useChat';
import type { ChatMediaUrlCache } from '@/services/chat/chat-media-url-cache';
import type { ChatMediaVariant } from '@/types/chat';

/**
 * Where image URLs come from outside the kid's chat (the parent's read-only
 * view). Unset, the kid chat's own cache is used.
 */
export const ChatMediaUrlsContext = createContext<ChatMediaUrlCache | null>(null);

type Resolved = {
  id: string;
  variant: ChatMediaVariant;
  attempt: number;
  url: string | null;
};

/**
 * The signed URL of a chat image. Many images asking at once share one batch
 * request. `reload` drops the URL and asks again; use it when the image failed
 * to load (the URL may have expired).
 */
export function useChatMediaUrl(
  id: string | null,
  variant: ChatMediaVariant
): { url: string | null; reload: () => void } {
  const override = useContext(ChatMediaUrlsContext);
  const { mediaUrls: chatMediaUrls } = useChat();
  const mediaUrls = override ?? chatMediaUrls;
  const [attempt, setAttempt] = useState(0);
  const [resolved, setResolved] = useState<Resolved | null>(null);

  useEffect(() => {
    if (!id || !mediaUrls) return;
    let cancelled = false;
    mediaUrls
      .get(id, variant)
      .then((url) => {
        if (!cancelled) setResolved({ id, variant, attempt, url });
      })
      .catch(() => {
        // Offline or refused: the image stays a placeholder and may be retried.
      });
    return () => {
      cancelled = true;
    };
  }, [mediaUrls, id, variant, attempt]);

  const reload = useCallback(() => {
    if (id) mediaUrls?.invalidate(id, variant);
    setAttempt((current) => current + 1);
  }, [mediaUrls, id, variant]);

  if (!id || !mediaUrls) return { url: null, reload };

  const current =
    resolved?.id === id && resolved.variant === variant && resolved.attempt === attempt
      ? resolved.url
      : mediaUrls.peek(id, variant);
  return { url: current, reload };
}

/** Upload progress (0 to 1) of a queued media message, or null when it is not uploading. */
export function useChatMediaProgress(clientMsgId: string): number | null {
  const { engine } = useChat();

  const subscribe = useCallback(
    (onChange: () => void) => (engine ? engine.subscribeMediaProgress(onChange) : () => {}),
    [engine]
  );
  const getSnapshot = useCallback(
    () => engine?.getMediaProgress(clientMsgId) ?? null,
    [engine, clientMsgId]
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
