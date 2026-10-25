import {
  UploadTransportError,
  type ChatLocalStore,
  type ChatPendingMessage,
  type LocalMediaItem,
  type OutgoingMediaMessage,
  type UploadTransport,
} from '@/types/chat';
import type { ChatApi } from '../chat-api';
import { ChatMediaSender } from '../chat-media-sender';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'client-1' }));

const image: LocalMediaItem = {
  localId: 'l1',
  uri: 'file:///full.jpg',
  thumbUri: 'file:///thumb.jpg',
  mime: 'image/jpeg',
  thumbMime: 'image/jpeg',
  size: 100,
  thumbSize: 10,
  width: 10,
  height: 10,
};

const target = (url: string) => ({ url, expiresAt: Date.now() + 60_000 });

function pending(status: ChatPendingMessage['status'], uploads = true): ChatPendingMessage {
  return {
    id: 'pending-1',
    inboxId: 'inbox-1',
    clientMsgId: 'client-1',
    status,
    text: null,
    expiresAt: '2026-10-08T00:00:00.000Z',
    attachments: [
      {
        id: 'a1',
        status: 'pending_upload',
        width: 10,
        height: 10,
        upload: uploads ? target('https://r2/full') : null,
        thumbUpload: uploads ? target('https://r2/thumb') : null,
      },
    ],
  };
}

/** Just enough of the store for the sender: the media queue. */
function memoryStore() {
  const queue = new Map<string, OutgoingMediaMessage>();
  return {
    queue,
    store: {
      listOutgoingMedia: async () => [...queue.values()],
      putOutgoingMedia: async (message: OutgoingMediaMessage) => {
        queue.set(message.clientMsgId, message);
      },
      updateOutgoingMedia: async (id: string, patch: Partial<OutgoingMediaMessage>) => {
        const current = queue.get(id);
        if (current) queue.set(id, { ...current, ...patch });
      },
      deleteOutgoingMedia: async (id: string) => {
        queue.delete(id);
      },
    } as unknown as ChatLocalStore,
  };
}

function setup(transport: UploadTransport) {
  const { store, queue } = memoryStore();
  const api = {
    createPendingMedia: jest.fn(async () => ({ pending: pending('uploading') })),
    completePendingMedia: jest.fn(async () => ({
      pending: pending('moderating', false),
      missingAttachmentIds: [],
    })),
    getPendingMediaState: jest.fn(),
  };
  const sender = new ChatMediaSender({
    store,
    api: api as unknown as ChatApi,
    transport,
    syncNow: async () => {},
    isStopped: () => false,
  });
  return { sender, api, queue };
}

describe('ChatMediaSender', () => {
  it('uploads the image and its thumbnail, then waits for moderation', async () => {
    const put = jest.fn(async () => {});
    const { sender, api, queue } = setup({ put });

    await sender.send({ inboxId: 'inbox-1', senderId: 'me', text: ' hi ', media: [image] });
    await sender.flush();

    expect(api.createPendingMedia).toHaveBeenCalledWith(
      expect.objectContaining({ clientMsgId: 'client-1', text: 'hi' })
    );
    expect(put.mock.calls.map(([call]) => (call as { uri: string }).uri)).toEqual([
      image.uri,
      image.thumbUri,
    ]);
    expect(queue.get('client-1')).toMatchObject({
      status: 'moderating',
      pendingMessageId: 'pending-1',
    });
  });

  it('asks for new upload URLs when storage refuses one', async () => {
    let refused = false;
    const put = jest.fn(async () => {
      if (!refused) {
        refused = true;
        throw new UploadTransportError('expired', 403);
      }
    });
    const { sender, api, queue } = setup({ put });

    await sender.send({ inboxId: 'inbox-1', senderId: 'me', text: '', media: [image] });
    await sender.flush();

    expect(api.createPendingMedia).toHaveBeenCalledTimes(2);
    expect(queue.get('client-1')?.status).toBe('moderating');
  });

  it('fails the message when its file is gone from the device', async () => {
    const put = jest.fn(async () => {
      throw new UploadTransportError('missing', 410);
    });
    const { sender, queue } = setup({ put });

    await sender.send({ inboxId: 'inbox-1', senderId: 'me', text: '', media: [image] });
    await sender.flush();

    expect(queue.get('client-1')).toMatchObject({ status: 'failed' });
  });

  it('stops an upload the user cancels and drops the message', async () => {
    let started!: () => void;
    const uploading = new Promise<void>((resolve) => (started = resolve));
    const put = jest.fn(
      ({ signal }: { signal?: AbortSignal }) =>
        new Promise<void>((_, reject) => {
          started();
          signal?.addEventListener('abort', () => reject(new UploadTransportError('aborted')));
        })
    );
    const { sender, api, queue } = setup({ put });

    await sender.send({ inboxId: 'inbox-1', senderId: 'me', text: '', media: [image] });
    const flushing = sender.flush();
    await uploading;

    await expect(sender.cancel('client-1')).resolves.toEqual([image]);
    await flushing;

    expect(queue.has('client-1')).toBe(false);
    expect(api.completePendingMedia).not.toHaveBeenCalled();
  });

  it('does not cancel a message whose images are already being checked', async () => {
    const { sender, queue } = setup({ put: jest.fn(async () => {}) });

    await sender.send({ inboxId: 'inbox-1', senderId: 'me', text: '', media: [image] });
    await sender.flush();

    await expect(sender.cancel('client-1')).resolves.toBeNull();
    expect(queue.get('client-1')?.status).toBe('moderating');
  });
});
