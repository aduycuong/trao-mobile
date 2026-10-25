import { randomUUID } from 'expo-crypto';
import {
  UploadTransportError,
  type ChatLocalStore,
  type ChatMediaFileInput,
  type ChatPendingMessage,
  type ChatUpdate,
  type LocalMediaItem,
  type OutgoingMediaMessage,
  type UploadTransport,
} from '@/types/chat';
import { ChatApiError, type ChatApi } from './chat-api';

/** Files of one message uploaded at the same time. */
const UPLOAD_CONCURRENCY = 3;
/** Tries to get every file in the bucket before giving the run up for a later retry. */
const MAX_UPLOAD_ROUNDS = 3;
/** A message waiting for its verdict longer than this is checked against the server. */
const MODERATING_RECHECK_MS = 45_000;

type ChatMediaSenderOptions = {
  store: ChatLocalStore;
  api: ChatApi;
  transport: UploadTransport;
  /** Pulls the update log: a sent or blocked message arrives through it. */
  syncNow: () => Promise<void>;
  isStopped: () => boolean;
};

/** An upload URL was refused (expired or already used): ask for new ones. */
class UploadUrlRejected extends Error {}

/** The image file is gone from the device; the message cannot be sent any more. */
class LocalFileMissing extends Error {}

/** The user cancelled the message while it was uploading. */
class SendCancelled extends Error {}

/**
 * Sends media messages: creates the pending message on the server, uploads each
 * image and thumbnail straight to storage, then reports them as done. Every
 * step can be repeated: `clientMsgId` makes creation idempotent and the server
 * only hands out upload URLs for files it does not have yet, so a message that
 * was interrupted (app killed, lost network) simply continues.
 *
 * It does not decide when a message is sent or blocked. The verdict arrives as
 * a normal message with the same `clientMsgId`, which removes the queue entry
 * (see `ChatLocalStore.applyBatch`). Same flow as the web client.
 */
export class ChatMediaSender {
  private readonly progress = new Map<string, number>();
  private readonly progressListeners = new Set<() => void>();
  private readonly checkedAt = new Map<string, number>();
  /** Messages the user cancelled; a run still in flight for them stops at its next step. */
  private readonly cancelled = new Set<string>();
  /** Aborts the uploads in flight, per message. */
  private readonly uploads = new Map<string, AbortController>();
  /** Messages whose upload is being reported as done: too late to cancel. */
  private readonly completing = new Set<string>();
  private flushPromise: Promise<void> | null = null;
  private flushAgain = false;

  constructor(private readonly options: ChatMediaSenderOptions) {}

  /** Queues a media message (taking over the inbox draft) and starts sending. */
  async send(params: {
    inboxId: string;
    senderId: string;
    text: string;
    media: LocalMediaItem[];
  }): Promise<void> {
    if (params.media.length === 0) return;
    await this.options.store.putOutgoingMedia({
      clientMsgId: randomUUID(),
      inboxId: params.inboxId,
      senderId: params.senderId,
      text: params.text.trim(),
      media: params.media,
      createdAtLocal: Date.now(),
      status: 'sending',
    });
    void this.flush();
  }

  /**
   * Sends a failed message again. The server keeps a failed or expired pending
   * message under its `clientMsgId`, so the retry gets a new one.
   */
  async retry(clientMsgId: string): Promise<void> {
    const message = (await this.options.store.listOutgoingMedia()).find(
      (item) => item.clientMsgId === clientMsgId
    );
    if (!message) return;

    await this.options.store.deleteOutgoingMedia(clientMsgId);
    await this.options.store.putOutgoingMedia({
      ...message,
      clientMsgId: randomUUID(),
      status: 'sending',
      pendingMessageId: undefined,
      error: undefined,
    });
    void this.flush();
  }

  /** Drops a queued message; returns its images so their files can be deleted. */
  async discard(clientMsgId: string): Promise<LocalMediaItem[]> {
    this.setProgress(clientMsgId, null);
    const message = (await this.options.store.listOutgoingMedia()).find(
      (item) => item.clientMsgId === clientMsgId
    );
    await this.options.store.deleteOutgoingMedia(clientMsgId);
    return message?.media ?? [];
  }

  /**
   * Stops a message that is still uploading and drops it. Returns its images
   * (so their files can be deleted), or null when it is too late: the files are
   * all uploaded and the server is checking them, so the message will arrive.
   *
   * The server's pending message is left as it is; it expires (and its stored
   * files are deleted) after `CHAT_MEDIA_PENDING_TTL_SECONDS`.
   */
  async cancel(clientMsgId: string): Promise<LocalMediaItem[] | null> {
    const message = (await this.options.store.listOutgoingMedia()).find(
      (item) => item.clientMsgId === clientMsgId
    );
    if (!message || message.status !== 'sending' || this.completing.has(clientMsgId)) return null;

    this.cancelled.add(clientMsgId);
    this.uploads.get(clientMsgId)?.abort();
    this.setProgress(clientMsgId, null);
    await this.options.store.deleteOutgoingMedia(clientMsgId);
    return message.media;
  }

  /** Upload progress of a message, 0 to 1, or null when it is not uploading. */
  getProgress(clientMsgId: string): number | null {
    return this.progress.get(clientMsgId) ?? null;
  }

  subscribeProgress(listener: () => void): () => void {
    this.progressListeners.add(listener);
    return () => {
      this.progressListeners.delete(listener);
    };
  }

  /** Applies `message_status` updates the server sent about messages of this user. */
  async applyStatusUpdates(updates: ChatUpdate[]): Promise<void> {
    const statuses = updates.filter((update) => update.type === 'message_status');
    if (statuses.length === 0) return;

    const queued = await this.options.store.listOutgoingMedia();
    for (const update of statuses) {
      const message = queued.find((item) => item.pendingMessageId === update.refId);
      if (!message) continue;

      const status = update.payload.status;
      if (status === 'failed' || status === 'expired') {
        await this.fail(message.clientMsgId, reasonText(status, update.payload.reason));
      }
      // 'sent' and 'rejected' arrive as the message itself in the same update batch.
    }
  }

  /** Works through the queue; calls made while it runs trigger exactly one more pass. */
  flush(): Promise<void> {
    if (this.flushPromise) {
      this.flushAgain = true;
      return this.flushPromise;
    }
    this.flushPromise = (async () => {
      try {
        do {
          this.flushAgain = false;
          await this.flushQueue();
        } while (this.flushAgain && !this.options.isStopped());
      } catch (error) {
        console.warn('[chat] media flush failed', error);
      } finally {
        this.flushPromise = null;
      }
    })();
    return this.flushPromise;
  }

  private async flushQueue() {
    const queue = await this.options.store.listOutgoingMedia();

    for (const message of queue) {
      if (this.options.isStopped()) return;
      if (this.cancelled.has(message.clientMsgId)) continue;

      if (message.status === 'sending') {
        await this.run(message);
      } else if (message.status === 'moderating') {
        await this.recheck(message);
      }
    }
  }

  private async run(message: OutgoingMediaMessage) {
    try {
      await this.upload(message);
    } catch (error) {
      // Already dropped from the queue by `cancel`.
      if (error instanceof SendCancelled) return;
      if (error instanceof LocalFileMissing) {
        await this.fail(message.clientMsgId, 'Ảnh không còn trên máy. Hãy chọn lại ảnh nhé.');
        return;
      }
      if (error instanceof ChatApiError && error.status < 500 && error.status !== 429) {
        // The server refused it (not allowed, invalid, expired): retrying won't help.
        await this.fail(message.clientMsgId, error.message);
        return;
      }
      // Network or server hiccup, or too many messages at once: tried again later.
    } finally {
      this.setProgress(message.clientMsgId, null);
    }
  }

  private async upload(message: OutgoingMediaMessage) {
    const { store, api } = this.options;
    const files: ChatMediaFileInput[] = message.media.map((item) => ({
      contentType: item.mime,
      contentLength: item.size,
      thumbContentType: item.thumbMime,
      thumbContentLength: item.thumbSize,
      width: item.width,
      height: item.height,
      blurhash: item.blurhash,
    }));

    for (let round = 0; round < MAX_UPLOAD_ROUNDS; round += 1) {
      // Repeating this call is how a message resumes and how URLs are renewed.
      const { pending } = await api.createPendingMedia({
        inboxId: message.inboxId,
        clientMsgId: message.clientMsgId,
        text: message.text || undefined,
        files,
      });
      this.assertActive(message.clientMsgId);
      if (message.pendingMessageId !== pending.id) {
        await store.updateOutgoingMedia(message.clientMsgId, { pendingMessageId: pending.id });
        message.pendingMessageId = pending.id;
      }

      if (pending.status !== 'uploading') {
        await this.settle(message, pending);
        return;
      }

      try {
        await this.uploadFiles(message, pending);
      } catch (error) {
        if (error instanceof UploadUrlRejected) continue;
        throw error;
      }

      this.assertActive(message.clientMsgId);
      this.completing.add(message.clientMsgId);
      try {
        const result = await api.completePendingMedia(pending.id);
        if (result.missingAttachmentIds.length === 0) {
          await this.settle(message, result.pending);
          return;
        }
      } finally {
        this.completing.delete(message.clientMsgId);
      }
    }
    // Still incomplete after several rounds; the next pass starts again.
  }

  /** Uploads every file the server still lacks, a few at a time, tracking progress. */
  private async uploadFiles(message: OutgoingMediaMessage, pending: ChatPendingMessage) {
    const tasks: { url: string; uri: string; size: number; contentType: string }[] = [];
    for (const [index, attachment] of pending.attachments.entries()) {
      const item = message.media[index];
      if (!item) continue;
      if (attachment.upload) {
        tasks.push({
          url: attachment.upload.url,
          uri: item.uri,
          size: item.size,
          contentType: item.mime.toLowerCase(),
        });
      }
      if (attachment.thumbUpload) {
        tasks.push({
          url: attachment.thumbUpload.url,
          uri: item.thumbUri,
          size: item.thumbSize,
          contentType: item.thumbMime.toLowerCase(),
        });
      }
    }

    const totalBytes = tasks.reduce((sum, task) => sum + task.size, 0);
    const loaded = new Array<number>(tasks.length).fill(0);
    const report = () => {
      if (totalBytes === 0) return;
      const done = loaded.reduce((sum, bytes) => sum + bytes, 0);
      this.setProgress(message.clientMsgId, Math.min(done / totalBytes, 1));
    };
    this.setProgress(message.clientMsgId, 0);

    const controller = new AbortController();
    this.uploads.set(message.clientMsgId, controller);

    let next = 0;
    let rejected = false;
    const worker = async () => {
      while (next < tasks.length && !this.options.isStopped() && !controller.signal.aborted) {
        const index = next;
        next += 1;
        const task = tasks[index];
        try {
          await this.options.transport.put({
            url: task.url,
            uri: task.uri,
            contentType: task.contentType,
            signal: controller.signal,
            onProgress: (bytes) => {
              loaded[index] = Math.min(bytes, task.size);
              report();
            },
          });
        } catch (error) {
          if (controller.signal.aborted) throw new SendCancelled();
          if (error instanceof UploadTransportError && error.status === 403) {
            rejected = true;
            return;
          }
          if (error instanceof UploadTransportError && error.status === 410) {
            throw new LocalFileMissing();
          }
          throw error;
        }
      }
    };

    try {
      await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, tasks.length) }, worker));
    } finally {
      this.uploads.delete(message.clientMsgId);
    }
    this.assertActive(message.clientMsgId);
    if (rejected) throw new UploadUrlRejected();
  }

  /** Moves the queue entry to where the server says the message is. */
  private async settle(message: OutgoingMediaMessage, pending: ChatPendingMessage) {
    switch (pending.status) {
      case 'moderating':
        this.checkedAt.set(message.clientMsgId, Date.now());
        await this.options.store.updateOutgoingMedia(message.clientMsgId, {
          status: 'moderating',
          error: undefined,
        });
        return;
      case 'sent':
      case 'rejected':
        // The message is on the server: syncing brings it in and clears the entry.
        await this.options.store.updateOutgoingMedia(message.clientMsgId, { status: 'moderating' });
        await this.options.syncNow();
        return;
      case 'failed':
      case 'expired':
        await this.fail(message.clientMsgId, reasonText(pending.status));
        return;
      default:
        return;
    }
  }

  /** A message waiting for its verdict is asked about now and then, in case a signal was missed. */
  private async recheck(message: OutgoingMediaMessage) {
    if (!message.pendingMessageId) return;
    const last = this.checkedAt.get(message.clientMsgId) ?? message.createdAtLocal;
    if (Date.now() - last < MODERATING_RECHECK_MS) return;
    this.checkedAt.set(message.clientMsgId, Date.now());

    try {
      const { pending } = await this.options.api.getPendingMediaState(message.pendingMessageId);
      await this.settle(message, pending);
    } catch (error) {
      if (error instanceof ChatApiError && error.status === 404) {
        await this.fail(message.clientMsgId, reasonText('expired'));
      }
      // Otherwise try again at the next pass.
    }
  }

  private assertActive(clientMsgId: string) {
    if (this.cancelled.has(clientMsgId)) throw new SendCancelled();
  }

  private async fail(clientMsgId: string, error: string) {
    this.setProgress(clientMsgId, null);
    await this.options.store.updateOutgoingMedia(clientMsgId, { status: 'failed', error });
  }

  private setProgress(clientMsgId: string, value: number | null) {
    if (value === null) {
      if (!this.progress.has(clientMsgId)) return;
      this.progress.delete(clientMsgId);
    } else {
      this.progress.set(clientMsgId, value);
    }
    for (const listener of this.progressListeners) listener();
  }
}

function reasonText(status: string, reason?: unknown): string {
  if (status === 'expired') return 'Tin nhắn đã hết hạn tải lên. Gửi lại nhé.';
  if (reason === 'cannot_send') return 'Bạn không thể gửi tin nhắn này nữa.';
  return 'Chưa kiểm tra được ảnh. Gửi lại nhé.';
}
