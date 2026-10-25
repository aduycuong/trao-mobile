import React, { createContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { createChatApi, type ChatApi } from '@/services/chat/chat-api';
import { ChatMediaFiles } from '@/services/chat/chat-media-files';
import { ChatMediaUrlCache } from '@/services/chat/chat-media-url-cache';
import { ChatSyncEngine } from '@/services/chat/chat-sync-engine';
import { findMeUserId } from '@/services/chat/chat-view';
import { setRtdbConnected, startChatPresence, subscribeChatSyncSignal } from '@/services/chat/rtdb';
import { isRtdbConfigured } from '@/services/firebase';
import { fileUploadTransport } from '@/services/chat/file-upload-transport';
import { SqliteChatStore } from '@/services/chat/sqlite-chat-store';
import type { ChatDialog, ChatLocalStore } from '@/types/chat';

export type ChatContextValue = {
  /** True once the local cache has been read at least once. */
  ready: boolean;
  firebaseUid: string | null;
  meUserId: string | null;
  engine: ChatSyncEngine | null;
  store: ChatLocalStore | null;
  api: ChatApi | null;
  /** Signed view URLs of chat images, requested in batches. */
  mediaUrls: ChatMediaUrlCache | null;
  /** Folder of the images in drafts and queued messages. */
  mediaFiles: ChatMediaFiles | null;
  /** Every cached dialog, including direct chats that have no message yet. */
  allDialogs: ChatDialog[];
  /** Dialogs for the chat list: groups, and direct chats with messages. */
  dialogs: ChatDialog[];
  unreadTotal: number;
};

const emptyValue: ChatContextValue = {
  ready: false,
  firebaseUid: null,
  meUserId: null,
  engine: null,
  store: null,
  api: null,
  mediaUrls: null,
  mediaFiles: null,
  allDialogs: [],
  dialogs: [],
  unreadTotal: 0,
};

export const ChatContext = createContext<ChatContextValue>(emptyValue);

type Runtime = {
  engine: ChatSyncEngine;
  store: ChatLocalStore;
  api: ChatApi;
  mediaUrls: ChatMediaUrlCache;
  mediaFiles: ChatMediaFiles;
};

/** Runs the chat sync for the signed-in user. */
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { getIdToken, session } = useAuth();
  const firebaseUid = session?.uid ?? null;

  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [allDialogs, setAllDialogs] = useState<ChatDialog[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!firebaseUid) return;

    const store = new SqliteChatStore(firebaseUid);
    const api = createChatApi(getIdToken);
    const mediaFiles = new ChatMediaFiles(firebaseUid);
    let cancelled = false;

    const reload = async () => {
      const dialogs = await store.listDialogs();
      if (cancelled) return;
      setAllDialogs(dialogs);
      setReady(true);
    };
    const unsubscribeStore = store.subscribe(() => void reload());
    void reload();

    // RTDB shares the signed-in Firebase app, so it is authenticated already, including after
    // a cold start restored the session. Without RTDB the engine just polls faster.
    const engine = new ChatSyncEngine({
      store,
      api,
      hasSignal: isRtdbConfigured(),
      uploadTransport: fileUploadTransport,
      mediaFiles,
    });
    const stopSignal = subscribeChatSyncSignal(firebaseUid, (pts) => void engine.handleSignal(pts));
    const stopPresence = startChatPresence(firebaseUid);
    engine.start();
    // Published from a callback, like the store's dialogs, not during the effect body.
    void Promise.resolve().then(() => {
      if (!cancelled)
        setRuntime({ engine, store, api, mediaUrls: new ChatMediaUrlCache(api), mediaFiles });
    });

    // Backgrounded: drop the socket so presence flips offline now instead of when the OS
    // eventually kills it. ('inactive' is just the app switcher / a system sheet on iOS.)
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setRtdbConnected(true);
      else if (state === 'background') setRtdbConnected(false);
    });

    return () => {
      cancelled = true;
      appStateSubscription.remove();
      setRtdbConnected(true);
      unsubscribeStore();
      stopSignal?.();
      stopPresence?.();
      engine.stop();
      void store.close();
      setRuntime(null);
      setAllDialogs([]);
      setReady(false);
    };
  }, [firebaseUid, getIdToken]);

  const value = useMemo<ChatContextValue>(() => {
    const dialogs = allDialogs.filter((dialog) => dialog.type === 'group' || dialog.lastSeq > 0);
    return {
      ready,
      firebaseUid,
      meUserId: firebaseUid ? findMeUserId(allDialogs, firebaseUid) : null,
      engine: runtime?.engine ?? null,
      store: runtime?.store ?? null,
      api: runtime?.api ?? null,
      mediaUrls: runtime?.mediaUrls ?? null,
      mediaFiles: runtime?.mediaFiles ?? null,
      allDialogs,
      dialogs,
      unreadTotal: dialogs.reduce((sum, dialog) => sum + dialog.unreadCount, 0),
    };
  }, [ready, firebaseUid, runtime, allDialogs]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
