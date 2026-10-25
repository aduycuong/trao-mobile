import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useChat } from '@/hooks/useChat';
import { buildThreadItems, findMeInDialog, withMyReaction } from '@/services/chat/chat-view';
import { CHAT_HISTORY_PAGE_SIZE } from '@/services/chat/constants';
import type {
  ChatMessage,
  ChatMessageDeleteScope,
  ChatMessageSticker,
  ChatReplyTo,
  LocalMediaItem,
  OutgoingMediaMessage,
  OutgoingMessage,
} from '@/types/chat';

type ThreadData = {
  messages: ChatMessage[];
  outgoing: OutgoingMessage[];
  outgoingMedia: OutgoingMediaMessage[];
};

/** A reaction shown before the server confirmed it; stale once the message `version` moves on. */
type PendingReaction = { emoji: string | null; version: number };

/** State and actions of one open chat thread, read from the local cache. */
export function useChatThread(inboxId: string) {
  const { engine, store, allDialogs, firebaseUid } = useChat();
  const [limit, setLimit] = useState(CHAT_HISTORY_PAGE_SIZE);
  const [data, setData] = useState<ThreadData>({
    messages: [],
    outgoing: [],
    outgoingMedia: [],
  });
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [pendingReactions, setPendingReactions] = useState<Record<string, PendingReaction>>({});
  const [opened, setOpened] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  const dialog = allDialogs.find((item) => item.id === inboxId) ?? null;
  const me = dialog && firebaseUid ? findMeInDialog(dialog, firebaseUid) : null;
  const meUserId = me?.userId ?? null;

  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    const load = async () => {
      const [messages, outgoing, outgoingMedia] = await Promise.all([
        store.listMessages(inboxId, { limit }),
        store.listOutgoing(inboxId),
        store.listOutgoingMedia(inboxId),
      ]);
      if (!cancelled) setData({ messages, outgoing, outgoingMedia });
    };
    void load();
    const unsubscribe = store.subscribe(() => void load());
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [store, inboxId, limit]);

  useEffect(() => {
    if (!engine) return;
    let cancelled = false;
    engine
      .openThread(inboxId)
      .then((result) => {
        if (cancelled) return;
        setHasMoreOlder(result.hasMore);
        setOpenError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Offline: the cached messages still show; only reported when nothing is cached.
        setOpenError(error instanceof Error ? error.message : 'Không tải được tin nhắn.');
      })
      .finally(() => {
        if (!cancelled) setOpened(true);
      });
    return () => {
      cancelled = true;
    };
  }, [engine, inboxId]);

  const newestSeq = data.messages.at(-1)?.seq ?? 0;
  const lastReadSeq = dialog?.lastReadSeq ?? 0;
  useEffect(() => {
    if (!engine || newestSeq <= lastReadSeq || AppState.currentState !== 'active') return;
    void engine.markRead(inboxId, newestSeq);
  }, [engine, inboxId, newestSeq, lastReadSeq]);

  const items = useMemo(() => {
    if (!dialog || !meUserId) return [];
    const messages = data.messages.map((message) => {
      const pending = pendingReactions[message.id];
      return pending && pending.version === message.version && !message.deletedAt
        ? withMyReaction(message, pending.emoji)
        : message;
    });
    return buildThreadItems(dialog, messages, data.outgoing, data.outgoingMedia, meUserId);
  }, [dialog, data, meUserId, pendingReactions]);

  const loadOlder = useCallback(async () => {
    const oldest = data.messages[0]?.seq;
    if (!engine || !oldest || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const result = await engine.loadOlder(inboxId, oldest);
      setHasMoreOlder(result.hasMore);
      setLimit((current) => current + CHAT_HISTORY_PAGE_SIZE);
    } finally {
      setLoadingOlder(false);
    }
  }, [engine, inboxId, data.messages, loadingOlder]);

  const send = useCallback(
    async (text: string, replyTo?: ChatReplyTo | null) => {
      if (!engine || !meUserId) return;
      await engine.sendText({ inboxId, senderId: meUserId, text, replyTo });
    },
    [engine, inboxId, meUserId]
  );

  const sendSticker = useCallback(
    async (sticker: ChatMessageSticker, replyTo?: ChatReplyTo | null) => {
      if (!engine || !meUserId) return;
      await engine.sendSticker({ inboxId, senderId: meUserId, sticker, replyTo });
    },
    [engine, inboxId, meUserId]
  );

  const sendMedia = useCallback(
    async (text: string, media: LocalMediaItem[]) => {
      if (!engine || !meUserId) return;
      await engine.sendMedia({ inboxId, senderId: meUserId, text, media });
    },
    [engine, inboxId, meUserId]
  );

  const isMedia = useCallback(
    (clientMsgId: string) =>
      data.outgoingMedia.some((message) => message.clientMsgId === clientMsgId),
    [data.outgoingMedia]
  );
  const retry = useCallback(
    (clientMsgId: string) =>
      void (isMedia(clientMsgId)
        ? engine?.retryOutgoingMedia(clientMsgId)
        : engine?.retryOutgoing(clientMsgId)),
    [engine, isMedia]
  );
  const discard = useCallback(
    (clientMsgId: string) =>
      void (isMedia(clientMsgId)
        ? engine?.discardOutgoingMedia(clientMsgId)
        : engine?.discardOutgoing(clientMsgId)),
    [engine, isMedia]
  );

  /** Stops a media message that is still uploading; false when it is too late. */
  const cancelMedia = useCallback(
    async (clientMsgId: string) => (engine ? engine.cancelOutgoingMedia(clientMsgId) : false),
    [engine]
  );

  /** Unsend for everyone, or hide for this user only. Rejects with the server message. */
  const removeMessage = useCallback(
    async (messageId: string, scope: ChatMessageDeleteScope) => {
      if (!engine) return;
      await engine.removeMessage(inboxId, messageId, scope);
    },
    [engine, inboxId]
  );

  /** Reacts with `emoji`, or removes the user's reaction when `null`. Rejects with the server message. */
  const react = useCallback(
    async (messageId: string, emoji: string | null) => {
      if (!engine) return;
      const message = data.messages.find((item) => item.id === messageId);
      if (message) {
        setPendingReactions((current) => ({
          ...current,
          [messageId]: { emoji, version: message.version },
        }));
      }
      try {
        await engine.reactToMessage(inboxId, messageId, emoji);
      } catch (error) {
        setPendingReactions((current) => {
          const { [messageId]: _dropped, ...rest } = current;
          return rest;
        });
        throw error;
      }
    },
    [engine, inboxId, data.messages]
  );

  return {
    dialog,
    items,
    meUserId,
    firebaseUid,
    opened,
    openError,
    hasMoreOlder,
    loadingOlder,
    loadOlder,
    send,
    sendSticker,
    sendMedia,
    retry,
    discard,
    cancelMedia,
    removeMessage,
    react,
  };
}
