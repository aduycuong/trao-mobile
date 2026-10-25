import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useChat } from '@/hooks/useChat';
import { CHAT_MEDIA_MAX_FILES } from '@/services/chat/constants';
import { ChatImageError, prepareChatImage } from '@/services/chat/prepare-chat-image';
import type { LocalMediaItem } from '@/types/chat';

type DraftState = { text: string; media: LocalMediaItem[] };

const EMPTY_DRAFT: DraftState = { text: '', media: [] };
/** Typing is saved after the user pauses this long; picked images are saved at once. */
const TEXT_SAVE_DELAY_MS = 500;

/**
 * The unsent text and images of one inbox. They are kept on the device (the
 * images as files), so they come back when the user returns to this inbox,
 * even after the app was closed, and every inbox has its own. Mount the
 * component using it with `key={inboxId}`.
 */
export function useChatDraft(inboxId: string) {
  const { store, mediaFiles } = useChat();
  const [state, setState] = useState<DraftState>(EMPTY_DRAFT);
  const [processing, setProcessing] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stateRef = useRef<DraftState>(EMPTY_DRAFT);
  const processingRef = useRef(0);
  const loadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveNow = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    // Saving before the stored draft was read would overwrite it.
    if (!store || !loadedRef.current) return;
    const { text, media } = stateRef.current;
    void store.putDraft({ inboxId, text, media, updatedAt: Date.now() });
  }, [store, inboxId]);

  const update = useCallback(
    (change: (current: DraftState) => DraftState, saveImmediately: boolean) => {
      const next = change(stateRef.current);
      stateRef.current = next;
      setState(next);

      if (saveImmediately) {
        saveNow();
        return;
      }
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(saveNow, TEXT_SAVE_DELAY_MS);
    },
    [saveNow]
  );

  // Read the stored draft once the store is ready.
  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    void store.getDraft(inboxId).then((draft) => {
      if (cancelled) return;
      loadedRef.current = true;
      const current = stateRef.current;
      if (current.text || current.media.length > 0) {
        // The user already typed while it loaded: keep that and save it.
        saveNow();
        return;
      }
      if (!draft) return;
      const restored = { text: draft.text, media: draft.media };
      stateRef.current = restored;
      setState(restored);
    });
    return () => {
      cancelled = true;
    };
  }, [store, inboxId, saveNow]);

  // Save a pending change when leaving the inbox or when the app goes to the background
  // (the OS may kill it there without warning).
  useEffect(() => {
    const flush = () => {
      if (saveTimerRef.current) saveNow();
    };
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') flush();
    });
    return () => {
      subscription.remove();
      flush();
    };
  }, [saveNow]);

  const setText = useCallback(
    (text: string) => update((current) => ({ ...current, text }), false),
    [update]
  );

  /** Prepares picked photos (resize, thumbnail, blurhash) and adds them to the draft. */
  const addImages = useCallback(
    async (uris: string[]) => {
      if (uris.length === 0 || !mediaFiles) return;

      const room = CHAT_MEDIA_MAX_FILES - stateRef.current.media.length - processingRef.current;
      const accepted = uris.slice(0, Math.max(room, 0));
      setError(
        accepted.length < uris.length ? `Mỗi tin gửi tối đa ${CHAT_MEDIA_MAX_FILES} ảnh.` : null
      );
      if (accepted.length === 0) return;

      processingRef.current += accepted.length;
      setProcessing(processingRef.current);

      // One at a time: decoding several full-size photos at once can run a phone out of memory.
      const items: LocalMediaItem[] = [];
      for (const uri of accepted) {
        try {
          items.push(await prepareChatImage(uri, mediaFiles));
        } catch (caught) {
          setError(caught instanceof ChatImageError ? caught.message : 'Không đọc được ảnh này.');
        }
        processingRef.current -= 1;
        setProcessing(processingRef.current);
      }

      if (items.length > 0) {
        update((current) => ({ ...current, media: [...current.media, ...items] }), true);
      }
    },
    [mediaFiles, update]
  );

  const removeMedia = useCallback(
    (localId: string) => {
      setError(null);
      const removed = stateRef.current.media.filter((item) => item.localId === localId);
      update(
        (current) => ({
          ...current,
          media: current.media.filter((item) => item.localId !== localId),
        }),
        true
      );
      mediaFiles?.remove(removed);
    },
    [mediaFiles, update]
  );

  /** Empties the draft in memory and in the store (after a text message was sent). */
  const clear = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    stateRef.current = EMPTY_DRAFT;
    setState(EMPTY_DRAFT);
    setError(null);
    void store?.deleteDraft(inboxId);
  }, [store, inboxId]);

  /**
   * Empties the draft in memory only. A media message takes over the stored
   * draft itself when it is queued (`ChatLocalStore.putOutgoingMedia`).
   */
  const handOff = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    stateRef.current = EMPTY_DRAFT;
    setState(EMPTY_DRAFT);
    setError(null);
  }, []);

  return {
    text: state.text,
    media: state.media,
    /** Images still being prepared (resized, thumbnail made). */
    processing,
    error,
    setText,
    addImages,
    removeMedia,
    clear,
    handOff,
  };
}
