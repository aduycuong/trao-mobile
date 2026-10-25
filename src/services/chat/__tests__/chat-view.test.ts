import type { ChatDialog, ChatMessage, OutgoingMediaMessage, OutgoingMessage } from '@/types/chat';
import {
  BLOCKED_MEDIA_TEXT,
  buildThreadItems,
  canUnsendMessage,
  getDialogDisplay,
  getDialogPreview,
  getReplyPreviewText,
  resolveChatAvatar,
  withMyReaction,
} from '../chat-view';

const dialog: ChatDialog = {
  id: 'inbox-1',
  type: 'direct',
  title: null,
  avatar: null,
  memberCount: 2,
  lastSeq: 2,
  lastActivityAt: '2026-10-03T08:00:00.000Z',
  lastReadSeq: 2,
  unreadCount: 0,
  lastMessage: null,
  members: [
    {
      userId: 'me',
      firebaseUid: 'uid-me',
      name: 'Bin',
      avatar: null,
      lastReadSeq: 2,
      lastDeliveredSeq: 2,
    },
    {
      userId: 'peer',
      firebaseUid: 'uid-peer',
      name: 'Hà',
      avatar: '🐨',
      lastReadSeq: 1,
      lastDeliveredSeq: 2,
    },
  ],
};

const message = (seq: number, senderId: string, clientMsgId: string): ChatMessage => ({
  id: `m${seq}`,
  inboxId: 'inbox-1',
  seq,
  senderId,
  clientMsgId,
  type: 'text',
  content: { text: `msg ${seq}` },
  version: 1,
  createdAt: '2026-10-03T08:00:00.000Z',
  editedAt: null,
  deletedAt: null,
});

describe('chat-view', () => {
  it('counts readers of my group messages and leaves direct chats to the status', () => {
    const group: ChatDialog = {
      ...dialog,
      type: 'group',
      title: 'Lớp 4A',
      memberCount: 3,
      members: [
        ...dialog.members,
        {
          userId: 'friend',
          firebaseUid: 'uid-friend',
          name: 'Bi',
          avatar: null,
          lastReadSeq: 2,
          lastDeliveredSeq: 2,
        },
      ],
    };
    const [first, second, theirs] = buildThreadItems(
      group,
      [message(1, 'me', 'c1'), message(2, 'me', 'c2'), message(3, 'peer', 'c3')],
      [],
      [],
      'me'
    );
    expect(first.readCount).toBe(2);
    expect(second.readCount).toBe(1);
    expect(theirs.readCount).toBeNull();

    const [direct] = buildThreadItems(dialog, [message(1, 'me', 'c1')], [], [], 'me');
    expect(direct.readCount).toBeNull();
    expect(direct.status).toBe('read');
  });

  it('shows the peer as the title of a direct chat', () => {
    expect(getDialogDisplay(dialog, 'uid-me')).toMatchObject({
      title: 'Hà',
      avatar: '🐨',
      peerFirebaseUid: 'uid-peer',
    });
  });

  it('keeps image URLs and storage keys so the avatar can render a photo', () => {
    expect(resolveChatAvatar('https://x/y.png', 'hà')).toBe('https://x/y.png');
    expect(resolveChatAvatar('default-avatars/fox_3d.png', 'hà')).toBe(
      'default-avatars/fox_3d.png'
    );
  });

  it('falls back to an initial when the avatar is missing or too long for an emoji', () => {
    expect(resolveChatAvatar(null, 'hà')).toBe('H');
    expect(resolveChatAvatar('not an emoji at all', 'hà')).toBe('H');
  });

  it('describes an empty dialog', () => {
    expect(getDialogPreview(dialog, 'me')).toBe('Chưa có tin nhắn');
  });

  it('derives sent/delivered/read from the peer pointers and appends queued messages', () => {
    const outgoing: OutgoingMessage = {
      clientMsgId: 'c3',
      inboxId: 'inbox-1',
      senderId: 'me',
      type: 'text',
      content: { text: 'queued' },
      createdAtLocal: Date.now(),
      status: 'sending',
    };
    const items = buildThreadItems(
      dialog,
      [message(1, 'me', 'c1'), message(2, 'me', 'c2')],
      [outgoing, { ...outgoing, clientMsgId: 'c2' }],
      [],
      'me'
    );

    expect(items.map((item) => item.status)).toEqual(['read', 'delivered', 'sending']);
    expect(items).toHaveLength(3);
  });

  it('turns sticker messages, sent and queued, into sticker items without text', () => {
    const sticker = {
      id: 's1',
      groupId: 'g1',
      groupName: 'Thú cưng',
      name: 'Mèo',
      imagePath: 'stickers/cat.png',
    };
    const sent: ChatMessage = {
      ...message(1, 'peer', 'c1'),
      type: 'sticker',
      content: { stickerId: 's1' },
      sticker,
    };
    const gone: ChatMessage = { ...sent, id: 'm2', seq: 2, clientMsgId: 'c2', sticker: null };
    const queued: OutgoingMessage = {
      clientMsgId: 'c3',
      inboxId: 'inbox-1',
      senderId: 'me',
      type: 'sticker',
      content: { stickerId: 's1' },
      sticker,
      createdAtLocal: Date.now(),
      status: 'sending',
    };
    const [first, missing, pending] = buildThreadItems(dialog, [sent, gone], [queued], [], 'me');

    expect(first).toMatchObject({ kind: 'sticker', text: null, sticker });
    expect(missing).toMatchObject({ kind: 'sticker', sticker: null });
    expect(pending).toMatchObject({ kind: 'sticker', text: null, sticker, status: 'sending' });

    const recalled = buildThreadItems(
      dialog,
      [{ ...sent, content: null, deletedAt: '2026-10-03T08:01:00.000Z' }],
      [],
      [],
      'me'
    )[0];
    expect(recalled).toMatchObject({ kind: 'text', deleted: true, sticker: null });
  });

  it('previews stickers in the chat list and in replies', () => {
    const withSticker: ChatDialog = {
      ...dialog,
      lastMessage: {
        id: 'm1',
        seq: 1,
        senderId: 'peer',
        type: 'sticker',
        content: { stickerId: 's1' },
        deletedAt: null,
        createdAt: '2026-10-03T08:00:00.000Z',
      },
    };
    expect(getDialogPreview(withSticker, 'me')).toBe('Sticker');
    expect(
      getReplyPreviewText({
        id: 'm1',
        seq: 1,
        senderId: 'peer',
        type: 'sticker',
        deleted: false,
        text: null,
      })
    ).toBe('Sticker');
  });

  it('turns media, blocked and recalled messages into the right items', () => {
    const media: ChatMessage = {
      ...message(1, 'peer', 'c1'),
      type: 'media',
      content: {
        text: 'nhìn này',
        attachments: [{ id: 'a1', width: 800, height: 600 }, { bad: true }],
      },
    };
    const blocked: ChatMessage = {
      ...message(2, 'peer', 'c2'),
      type: 'media',
      censorStatus: 'rejected',
      content: { attachments: [] },
    };
    const recalled: ChatMessage = {
      ...message(3, 'me', 'c3'),
      type: 'media',
      content: null,
      deletedAt: '2026-10-03T09:00:00.000Z',
    };
    const queued: OutgoingMediaMessage = {
      clientMsgId: 'c4',
      inboxId: 'inbox-1',
      senderId: 'me',
      text: '',
      media: [
        {
          localId: 'l1',
          uri: 'file:///full.jpg',
          thumbUri: 'file:///thumb.jpg',
          mime: 'image/jpeg',
          thumbMime: 'image/jpeg',
          size: 10,
          thumbSize: 2,
          width: 10,
          height: 10,
        },
      ],
      createdAtLocal: Date.now(),
      status: 'sending',
    };

    const [first, second, third, fourth] = buildThreadItems(
      dialog,
      [media, blocked, recalled],
      [],
      [queued],
      'me'
    );

    expect(first).toMatchObject({ kind: 'media', text: 'nhìn này', blocked: false });
    expect(first.media).toEqual([expect.objectContaining({ attachmentId: 'a1', width: 800 })]);
    expect(second).toMatchObject({ blocked: true });
    expect(third).toMatchObject({ kind: 'text', deleted: true, media: [] });
    expect(fourth).toMatchObject({ kind: 'media', status: 'uploading', id: null });
    expect(fourth.media[0]).toMatchObject({
      attachmentId: null,
      localThumbUri: 'file:///thumb.jpg',
    });
  });

  it('previews media and blocked last messages', () => {
    const last = {
      id: 'm9',
      seq: 9,
      senderId: 'peer',
      deletedAt: null,
      createdAt: dialog.lastActivityAt,
    };
    expect(
      getDialogPreview(
        {
          ...dialog,
          lastMessage: {
            ...last,
            type: 'media',
            content: { attachments: [{ id: 'a' }, { id: 'b' }] },
          },
        },
        'me'
      )
    ).toBe('📷 2 ảnh');
    expect(
      getDialogPreview(
        {
          ...dialog,
          lastMessage: { ...last, type: 'media', content: null, censorStatus: 'rejected' },
        },
        'me'
      )
    ).toBe(BLOCKED_MEDIA_TEXT);
  });

  it('allows unsending only own messages inside the window', () => {
    const now = Date.parse('2026-10-03T10:00:00.000Z');
    const createdAt = '2026-10-03T09:00:00.000Z';
    expect(canUnsendMessage({ isMine: true, createdAt, unsendWindowSeconds: 7200, now })).toBe(
      true
    );
    expect(canUnsendMessage({ isMine: true, createdAt, unsendWindowSeconds: 1800, now })).toBe(
      false
    );
    expect(canUnsendMessage({ isMine: false, createdAt, unsendWindowSeconds: 7200, now })).toBe(
      false
    );
    // No window from the server: the 48 hour default.
    expect(canUnsendMessage({ isMine: true, createdAt, now })).toBe(true);
  });
  it('lists reactions in picker order and drops them from recalled messages', () => {
    const reacted: ChatMessage = {
      ...message(1, 'peer', 'c1'),
      reactions: { '😂': 1, '👍': 2, '🎉': 1, '❤️': 0 },
      myReaction: '😂',
    };
    const recalled: ChatMessage = {
      ...message(2, 'peer', 'c2'),
      content: null,
      deletedAt: '2026-10-03T09:00:00.000Z',
      reactions: { '👍': 1 },
      myReaction: '👍',
    };
    const [first, second, cachedBefore] = buildThreadItems(
      dialog,
      [reacted, recalled, message(3, 'peer', 'c3')],
      [],
      [],
      'me'
    );
    expect(first.reactions).toEqual([
      { emoji: '😂', count: 1 },
      { emoji: '👍', count: 2 },
      { emoji: '🎉', count: 1 },
    ]);
    expect(first.myReaction).toBe('😂');
    expect(second.reactions).toEqual([]);
    expect(second.myReaction).toBeNull();
    // Messages cached before reactions existed carry no fields at all.
    expect(cachedBefore.reactions).toEqual([]);
    expect(cachedBefore.myReaction).toBeNull();
    expect(cachedBefore.replyTo).toBeNull();
  });

  it('keeps the quote of a reply and marks it recalled when the original is unsent', () => {
    const quote = {
      id: 'm1',
      seq: 1,
      senderId: 'peer',
      type: 'text',
      deleted: false,
      text: 'msg 1',
    };
    const original = message(1, 'peer', 'c1');
    const reply: ChatMessage = { ...message(2, 'me', 'c2'), replyTo: quote };
    const queued: OutgoingMessage = {
      clientMsgId: 'c3',
      inboxId: 'inbox-1',
      senderId: 'me',
      type: 'text',
      content: { text: 'queued' },
      replyTo: quote,
      createdAtLocal: Date.parse('2026-10-03T10:00:00.000Z'),
      status: 'sending',
    };

    const live = buildThreadItems(dialog, [original, reply], [queued], [], 'me');
    expect(live[1].replyTo).toEqual(quote);
    expect(live[2].replyTo).toEqual(quote);

    const unsent = { ...original, content: null, deletedAt: '2026-10-03T09:00:00.000Z' };
    const after = buildThreadItems(dialog, [unsent, reply], [queued], [], 'me');
    expect(after[1].replyTo).toEqual({ ...quote, deleted: true, text: null });
    expect(after[2].replyTo).toMatchObject({ deleted: true, text: null });
  });

  it('words the preview of a quoted message', () => {
    const base = { id: 'm1', seq: 1, senderId: 'peer', type: 'text', deleted: false, text: 'hi' };
    expect(getReplyPreviewText(base)).toBe('hi');
    expect(getReplyPreviewText({ ...base, text: null, type: 'media' })).toBe('📷 Ảnh');
    expect(getReplyPreviewText({ ...base, text: null, deleted: true })).toBe(
      'Tin nhắn đã bị thu hồi'
    );
    expect(getReplyPreviewText({ ...base, text: null })).toBe('Tin nhắn không khả dụng');
  });
  it('applies a reaction change to the counters', () => {
    const base: ChatMessage = {
      ...message(1, 'peer', 'c1'),
      reactions: { '👍': 2 },
      myReaction: '👍',
    };
    expect(withMyReaction(base, '👍')).toBe(base);
    expect(withMyReaction(base, '❤️')).toMatchObject({
      reactions: { '👍': 1, '❤️': 1 },
      myReaction: '❤️',
    });
    expect(withMyReaction(base, null)).toMatchObject({ reactions: { '👍': 1 }, myReaction: null });
    const solo: ChatMessage = {
      ...message(1, 'peer', 'c1'),
      reactions: { '👍': 1 },
      myReaction: '👍',
    };
    expect(withMyReaction(solo, null).reactions).toEqual({});
    expect(withMyReaction(message(1, 'peer', 'c1'), '😂')).toMatchObject({
      reactions: { '😂': 1 },
      myReaction: '😂',
    });
  });
});
