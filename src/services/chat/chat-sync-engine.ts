import { AppState } from 'react-native';
import { randomUUID } from 'expo-crypto';
import type {
  ChatDialog,
  ChatLocalStore,
  ChatMessage,
  ChatMessageDeleteScope,
  ChatMessageSticker,
  ChatReplyTo,
  ChatUpdate,
  LocalMediaItem,
  OutgoingMessage,
  UploadTransport,
} from '@/types/chat';
import { ChatApiError, type ChatApi } from './chat-api';
import type { ChatMediaFiles } from './chat-media-files';
import { ChatMediaSender } from './chat-media-sender';

const FALLBACK_SYNC_INTERVAL_MS = 60_000;
const SIGNAL_LESS_SYNC_INTERVAL_MS = 20_000;
/** After a failed sync (often the network is not back yet right after the app resumes). */
const SYNC_RETRY_DELAY_MS = 3_000;
const OUTGOING_RETRY_INTERVAL_MS = 8_000;
const READ_DEBOUNCE_MS = 400;
/** Image files nothing refers to any more are looked for this often. */
const MEDIA_SWEEP_INTERVAL_MS = 10 * 60_000;

type ChatSyncEngineOptions = {
  store: ChatLocalStore;
  api: ChatApi;
  /** True when the RTDB doorbell is available; otherwise the engine polls faster. */
  hasSignal: boolean;
  /** Uploads image files to storage. */
  uploadTransport: UploadTransport;
  /** Where prepared images of drafts and queued messages are kept. */
  mediaFiles: ChatMediaFiles;
};

/**
 * Keeps the local store in step with the server. Framework independent: it only needs a `ChatLocalStore` and a
 * `ChatApi`, so it matches the web client (Dexie there, expo-sqlite here).
 *
 * - `start()` loads a snapshot (`getDialogs`) on first run, then follows the
 *   user's update log (`getDifference`) whenever the doorbell rings, the app
 *   comes back online/visible, or the fallback timer fires.
 * - Sends are written to the local outgoing queue first and flushed to the
 *   server; `clientMsgId` makes retries safe.
 * - Media messages go through `ChatMediaSender`: they upload straight to
 *   storage, are moderated on the server and arrive like any other message.
 */
export class ChatSyncEngine {
  private readonly store: ChatLocalStore;
  private readonly api: ChatApi;
  private readonly hasSignal: boolean;
  private readonly media: ChatMediaSender;
  private readonly mediaFiles: ChatMediaFiles;

  private stopped = false;
  private syncPromise: Promise<void> | null = null;
  private syncAgain = false;
  private flushPromise: Promise<void> | null = null;
  private flushAgain = false;
  private syncRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private knownServerPts = 0;
  private timers: ReturnType<typeof setInterval>[] = [];
  private readTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingRead = new Map<string, number>();
  private detachListeners: (() => void)[] = [];

  constructor(options: ChatSyncEngineOptions) {
    this.store = options.store;
    this.api = options.api;
    this.hasSignal = options.hasSignal;
    this.mediaFiles = options.mediaFiles;
    this.media = new ChatMediaSender({
      store: options.store,
      api: options.api,
      transport: options.uploadTransport,
      syncNow: () => this.syncNow(),
      isStopped: () => this.stopped,
    });
  }

  start() {
    this.stopped = false;
    const flushAll = () => Promise.all([this.flushOutgoing(), this.media.flush()]);

    // Coming back to the foreground is the mobile equivalent of 'online'.
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void this.syncNow().then(flushAll);
    });
    this.detachListeners.push(() => appStateSubscription.remove());

    this.timers.push(
      setInterval(
        () => void this.syncNow(),
        this.hasSignal ? FALLBACK_SYNC_INTERVAL_MS : SIGNAL_LESS_SYNC_INTERVAL_MS
      ),
      setInterval(() => void flushAll(), OUTGOING_RETRY_INTERVAL_MS),
      setInterval(() => void this.sweepMediaFiles(), MEDIA_SWEEP_INTERVAL_MS)
    );

    void this.syncNow()
      .then(flushAll)
      .then(() => this.sweepMediaFiles());
  }

  private async sweepMediaFiles() {
    if (this.stopped) return;
    try {
      await this.mediaFiles.sweep(this.store);
    } catch (error) {
      console.warn('[chat] media sweep failed', error);
    }
  }

  stop() {
    this.stopped = true;
    for (const timer of this.timers) clearInterval(timer);
    for (const timer of this.readTimers.values()) clearTimeout(timer);
    if (this.syncRetryTimer) clearTimeout(this.syncRetryTimer);
    this.syncRetryTimer = null;
    for (const detach of this.detachListeners) detach();
    this.timers = [];
    this.readTimers.clear();
    this.pendingRead.clear();
    this.detachListeners = [];
  }

  /** Called with the `pts` read from the RTDB doorbell. */
  async handleSignal(serverPts: number) {
    if (serverPts <= this.knownServerPts) return;
    await this.syncNow();
  }

  /** Runs one sync; calls made while one is running trigger exactly one rerun. */
  syncNow(): Promise<void> {
    if (this.syncPromise) {
      this.syncAgain = true;
      return this.syncPromise;
    }
    this.syncPromise = (async () => {
      try {
        do {
          this.syncAgain = false;
          await this.runSync();
        } while (this.syncAgain && !this.stopped);
      } catch (error) {
        console.warn('[chat] sync failed', error);
        this.scheduleSyncRetry();
      } finally {
        this.syncPromise = null;
      }
    })();
    return this.syncPromise;
  }

  /** One quick retry, so a failure at resume does not leave the chat stale until the next poll. */
  private scheduleSyncRetry() {
    if (this.stopped || this.syncRetryTimer) return;
    this.syncRetryTimer = setTimeout(() => {
      this.syncRetryTimer = null;
      if (!this.stopped) void this.syncNow();
    }, SYNC_RETRY_DELAY_MS);
  }

  private async runSync() {
    let pts = await this.store.getPts();

    if (pts === null) {
      await this.loadSnapshot();
      return;
    }

    for (;;) {
      const diff = await this.api.getDifference(pts);
      this.knownServerPts = Math.max(this.knownServerPts, diff.pts);

      if (diff.tooLong) {
        await this.loadSnapshot();
        return;
      }

      const updates = diff.updates ?? [];
      await this.store.applyBatch({
        pts: diff.appliedPts,
        dialogs: diff.dialogs,
        messages: diff.messages,
        removedInboxIds: diff.removedInboxIds,
        removedMessageIds: hiddenMessageIds(updates),
      });
      pts = diff.appliedPts;
      await this.media.applyStatusUpdates(updates);

      if (!diff.hasMore) return;
    }
  }

  private async loadSnapshot() {
    const snapshot = await this.api.getDialogs();
    this.knownServerPts = Math.max(this.knownServerPts, snapshot.pts);
    await this.store.resetFromSnapshot(snapshot);
  }

  /**
   * Loads the newest page of an inbox when a thread opens. Also fetches the
   * chat-list row if it is missing locally (a chat opened before any message).
   */
  async openThread(inboxId: string): Promise<{ hasMore: boolean }> {
    try {
      if (!(await this.store.getDialog(inboxId))) {
        const { dialog } = await this.api.getDialog(inboxId);
        await this.store.applyBatch({ pts: null, dialogs: [dialog], messages: [] });
      }
      const page = await this.api.getHistory(inboxId);
      await this.store.applyBatch({
        pts: null,
        dialogs: [],
        messages: page.messages,
      });
      return { hasMore: page.hasMore };
    } catch (error) {
      if (error instanceof ChatApiError && error.status === 404) {
        // Gone or no longer visible (blocked): drop it with its queue and draft.
        await this.store.applyBatch({
          pts: null,
          dialogs: [],
          messages: [],
          removedInboxIds: [inboxId],
        });
      }
      throw error;
    }
  }

  /** Loads the page of messages older than `beforeSeq`. */
  async loadOlder(inboxId: string, beforeSeq: number): Promise<{ hasMore: boolean }> {
    const page = await this.api.getHistory(inboxId, { beforeSeq });
    await this.store.applyBatch({
      pts: null,
      dialogs: [],
      messages: page.messages,
    });
    return { hasMore: page.hasMore };
  }

  /** Queues a text message locally (it shows up at once) and sends it. */
  async sendText(params: {
    inboxId: string;
    senderId: string;
    text: string;
    replyTo?: ChatReplyTo | null;
  }): Promise<void> {
    const text = params.text.trim();
    if (!text) return;

    await this.store.putOutgoing({
      clientMsgId: randomUUID(),
      inboxId: params.inboxId,
      senderId: params.senderId,
      type: 'text',
      content: { text },
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
      createdAtLocal: Date.now(),
      status: 'sending',
    });
    void this.flushOutgoing();
  }

  /** Queues a sticker of the chat catalog (it shows up at once) and sends it. */
  async sendSticker(params: {
    inboxId: string;
    senderId: string;
    sticker: ChatMessageSticker;
    replyTo?: ChatReplyTo | null;
  }): Promise<void> {
    const { id, groupId, groupName, name, imagePath } = params.sticker;
    await this.store.putOutgoing({
      clientMsgId: randomUUID(),
      inboxId: params.inboxId,
      senderId: params.senderId,
      type: 'sticker',
      content: { stickerId: id },
      sticker: { id, groupId, groupName, name, imagePath },
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
      createdAtLocal: Date.now(),
      status: 'sending',
    });
    void this.flushOutgoing();
  }

  /**
   * Queues a message with images (they are uploaded in the background) and takes
   * over the draft of the inbox. At least one image is required.
   */
  sendMedia(params: {
    inboxId: string;
    senderId: string;
    text: string;
    media: LocalMediaItem[];
  }): Promise<void> {
    return this.media.send(params);
  }

  retryOutgoingMedia(clientMsgId: string) {
    return this.media.retry(clientMsgId);
  }

  async discardOutgoingMedia(clientMsgId: string) {
    const media = await this.media.discard(clientMsgId);
    this.mediaFiles.remove(media);
  }

  /**
   * Stops a media message that is still uploading and deletes its files.
   * False when it is too late (uploaded and being checked): it will be sent.
   */
  async cancelOutgoingMedia(clientMsgId: string): Promise<boolean> {
    const media = await this.media.cancel(clientMsgId);
    if (!media) return false;
    this.mediaFiles.remove(media);
    return true;
  }

  /** Upload progress (0 to 1) of a queued media message, or null when not uploading. */
  getMediaProgress(clientMsgId: string): number | null {
    return this.media.getProgress(clientMsgId);
  }

  subscribeMediaProgress(listener: () => void): () => void {
    return this.media.subscribeProgress(listener);
  }

  /** Puts a failed message back in the queue. */
  async retryOutgoing(clientMsgId: string) {
    await this.store.updateOutgoing(clientMsgId, {
      status: 'sending',
      error: undefined,
    });
    void this.flushOutgoing();
  }

  async discardOutgoing(clientMsgId: string) {
    await this.store.deleteOutgoing(clientMsgId);
  }

  /** Sends queued messages in order, one at a time. Safe to call any time. */
  flushOutgoing(): Promise<void> {
    if (this.flushPromise) {
      this.flushAgain = true;
      return this.flushPromise;
    }
    this.flushPromise = (async () => {
      try {
        do {
          this.flushAgain = false;
          await this.flushQueue();
        } while (this.flushAgain && !this.stopped);
      } finally {
        this.flushPromise = null;
      }
    })();
    return this.flushPromise;
  }

  private async flushQueue() {
    const queue = (await this.store.listOutgoing()).filter(
      (message) => message.status === 'sending'
    );
    // A stuck message blocks later ones of the same inbox to keep their order.
    const blockedInboxes = new Set<string>();

    for (const message of queue) {
      if (this.stopped || blockedInboxes.has(message.inboxId)) continue;
      const ok = await this.sendQueued(message);
      if (!ok) blockedInboxes.add(message.inboxId);
    }
  }

  private async sendQueued(message: OutgoingMessage): Promise<boolean> {
    try {
      const { message: saved } =
        message.type === 'sticker'
          ? await this.api.sendSticker(
              message.inboxId,
              message.clientMsgId,
              message.content.stickerId,
              message.replyTo?.id
            )
          : await this.api.sendText(
              message.inboxId,
              message.clientMsgId,
              message.content.text,
              message.replyTo?.id
            );
      await this.applySentMessage(saved);
      return true;
    } catch (error) {
      if (error instanceof ChatApiError && error.status < 500) {
        // The server refused it (not friends, blocked, invalid): retrying won't help.
        await this.store.updateOutgoing(message.clientMsgId, {
          status: 'failed',
          error: error.message,
        });
        return true;
      }
      // Network or server hiccup: stays queued and is retried later.
      return false;
    }
  }

  /** Stores a confirmed message and moves the chat-list row to match. */
  private async applySentMessage(message: ChatMessage) {
    const dialog = await this.store.getDialog(message.inboxId);
    const dialogs: ChatDialog[] = [];

    if (dialog && message.seq >= dialog.lastSeq) {
      dialogs.push({
        ...dialog,
        lastSeq: message.seq,
        lastActivityAt: message.createdAt,
        lastReadSeq: message.seq,
        unreadCount: 0,
        lastMessage: {
          id: message.id,
          seq: message.seq,
          senderId: message.senderId,
          type: message.type,
          content: message.content,
          censorStatus: message.censorStatus,
          deletedAt: message.deletedAt,
          createdAt: message.createdAt,
        },
        members: dialog.members.map((member) =>
          member.userId === message.senderId
            ? {
                ...member,
                lastReadSeq: message.seq,
                lastDeliveredSeq: message.seq,
              }
            : member
        ),
      });
    }

    await this.store.applyBatch({ pts: null, dialogs, messages: [message] });
  }

  /**
   * Records that the user has seen everything up to `seq`. Updates the local
   * unread count at once and tells the server after a short debounce.
   */
  async markRead(inboxId: string, seq: number) {
    const dialog = await this.store.getDialog(inboxId);
    if (!dialog || seq <= dialog.lastReadSeq) return;

    await this.store.patchDialog(inboxId, {
      lastReadSeq: seq,
      unreadCount: Math.max(dialog.lastSeq - seq, 0),
    });

    this.pendingRead.set(inboxId, Math.max(this.pendingRead.get(inboxId) ?? 0, seq));
    const existing = this.readTimers.get(inboxId);
    if (existing) clearTimeout(existing);
    this.readTimers.set(
      inboxId,
      setTimeout(() => void this.sendRead(inboxId), READ_DEBOUNCE_MS)
    );
  }

  private async sendRead(inboxId: string) {
    this.readTimers.delete(inboxId);
    const seq = this.pendingRead.get(inboxId);
    if (!seq || this.stopped) return;
    this.pendingRead.delete(inboxId);
    try {
      await this.api.markRead(inboxId, seq);
    } catch {
      // The next sync brings the server's pointer back; not worth retrying.
    }
  }

  /** Unsend for everyone, or hide the message on this user's devices. */
  async removeMessage(inboxId: string, messageId: string, scope: ChatMessageDeleteScope) {
    const result = await this.api.deleteMessage(inboxId, messageId, scope);
    await this.store.applyBatch({
      pts: null,
      dialogs: [result.dialog],
      messages: result.message ? [result.message] : [],
      removedMessageIds: result.scope === 'me' ? [messageId] : [],
    });
  }

  /** Reacts to a message with `emoji`, or removes the user's reaction when `null`. */
  async reactToMessage(inboxId: string, messageId: string, emoji: string | null) {
    const { message } = await this.api.setReaction(inboxId, messageId, emoji);
    await this.store.applyBatch({ pts: null, dialogs: [], messages: [message] });
  }

  /** Opens (or creates) the direct chat with a user, given by id or profile handle. */
  async openDirectChat(other: { otherUserId: string } | { handle: string }): Promise<string> {
    const { inboxId } = await this.api.getOrCreateDirectInbox(other);
    return inboxId;
  }

  async createGroup(input: {
    title: string;
    avatar: string;
    memberUserIds: string[];
  }): Promise<string> {
    const { inboxId } = await this.api.createGroupInbox(input);
    // The inbox_joined event arrives through the doorbell; sync now to be quick.
    void this.syncNow();
    return inboxId;
  }
}

/** Message ids this user hid ("xóa ở phía tôi") in this difference page. */
function hiddenMessageIds(updates: ChatUpdate[]) {
  const ids = new Set<string>();
  for (const update of updates) {
    if (update.type !== 'delete_message' || update.payload.scope !== 'me') continue;
    const list = update.payload.ids;
    if (Array.isArray(list)) {
      for (const id of list) {
        if (typeof id === 'string') ids.add(id);
      }
    } else if (update.refId) {
      ids.add(update.refId);
    }
  }
  return [...ids];
}
