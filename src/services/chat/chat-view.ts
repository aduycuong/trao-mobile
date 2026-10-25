import type {
  ChatDialog,
  ChatDialogMember,
  ChatMessage,
  ChatMessageSticker,
  ChatReplyTo,
  OutgoingMediaMessage,
  OutgoingMessage,
} from '@/types/chat';
import { isImageAvatar } from '@/utils/avatar';
import { CHAT_REACTIONS, CHAT_UNSEND_WINDOW_SECONDS } from './constants';

export type ChatMessageStatus =
  | 'sending'
  /** A media message whose images are still uploading. */
  | 'uploading'
  /** A media message waiting for the check of its images. */
  | 'moderating'
  | 'failed'
  | 'sent'
  | 'delivered'
  | 'read';

/** One image of a message: a stored attachment, or a picked file not uploaded yet. */
export type ChatThreadMedia = {
  key: string;
  /** Server id, used to ask for a view URL. Null for a file still on this device. */
  attachmentId: string | null;
  /** Files of an image still on this device. */
  localUri: string | null;
  localThumbUri: string | null;
  width: number | null;
  height: number | null;
  blurhash: string | null;
};

export type ChatThreadReaction = { emoji: string; count: number };

/** A message ready to render, whether confirmed or still queued. */
export type ChatThreadItem = {
  key: string;
  kind: 'text' | 'media' | 'sticker';
  /** Images of a media message, in the order they were picked. */
  media: ChatThreadMedia[];
  /** Media blocked as unsuitable: show a placeholder, never the content. */
  blocked: boolean;
  seq: number | null;
  /** Server id. Null while the message is still only on this device. */
  id: string | null;
  clientMsgId: string;
  senderId: string;
  isMine: boolean;
  text: string | null;
  /** Set when `kind` is `sticker`; null when the sticker is no longer available. */
  sticker: ChatMessageSticker | null;
  deleted: boolean;
  /** Reactions on the message, in the order of `CHAT_REACTIONS`. */
  reactions: ChatThreadReaction[];
  /** The emoji the current user reacted with. */
  myReaction: string | null;
  /** The message this one answers; null when none or no longer visible. */
  replyTo: ChatReplyTo | null;
  /** Only set on messages sent by the current user. */
  status: ChatMessageStatus | null;
  /** Group messages sent by the current user: how many other members have read them. */
  readCount: number | null;
  /** Why a queued message failed, when it did. */
  error: string | null;
  createdAt: string;
};

export function findMember(dialog: ChatDialog, userId: string) {
  return dialog.members.find((member) => member.userId === userId);
}

export function findMeInDialog(dialog: ChatDialog, firebaseUid: string) {
  return dialog.members.find((member) => member.firebaseUid === firebaseUid);
}

/** Resolves the current user's id from any dialog (all of them contain the user). */
export function findMeUserId(dialogs: ChatDialog[], firebaseUid: string) {
  for (const dialog of dialogs) {
    const me = findMeInDialog(dialog, firebaseUid);
    if (me) return me.userId;
  }
  return null;
}

export function getPeerMember(
  dialog: ChatDialog,
  firebaseUid: string
): ChatDialogMember | undefined {
  return dialog.members.find((member) => member.firebaseUid !== firebaseUid);
}

/** Image URL, group emoji, or a name initial when the avatar is missing. */
export function resolveChatAvatar(avatar: string | null, name: string) {
  const value = avatar?.trim() ?? '';
  if (isImageAvatar(value)) return value;
  if (value && value.length <= 8) return value;
  return name.trim().charAt(0).toUpperCase() || '🙂';
}

export function getDialogDisplay(dialog: ChatDialog, firebaseUid: string) {
  if (dialog.type === 'direct') {
    const peer = getPeerMember(dialog, firebaseUid);
    const name = peer?.name ?? 'Bạn';
    return {
      title: name,
      avatar: resolveChatAvatar(peer?.avatar ?? null, name),
      peerFirebaseUid: peer?.firebaseUid ?? null,
    };
  }
  const title = dialog.title ?? 'Nhóm';
  return {
    title,
    avatar: resolveChatAvatar(dialog.avatar, title),
    peerFirebaseUid: null,
  };
}

/** Reactions with a count, known emoji first in picker order. Messages cached before reactions existed have none. */
function listReactions(reactions: ChatMessage['reactions']): ChatThreadReaction[] {
  if (!reactions) return [];
  const known: string[] = CHAT_REACTIONS.map((reaction) => reaction.emoji);
  const rank = (emoji: string) => {
    const index = known.indexOf(emoji);
    return index === -1 ? known.length : index;
  };
  return Object.entries(reactions)
    .filter(([, count]) => count > 0)
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => rank(a.emoji) - rank(b.emoji));
}

/** The message as it will look once `emoji` (or none) is the current user's reaction. */
export function withMyReaction(message: ChatMessage, emoji: string | null): ChatMessage {
  const previous = message.myReaction ?? null;
  if (previous === emoji) return message;
  const reactions = { ...message.reactions };
  if (previous) {
    const left = (reactions[previous] ?? 0) - 1;
    if (left > 0) reactions[previous] = left;
    else delete reactions[previous];
  }
  if (emoji) reactions[emoji] = (reactions[emoji] ?? 0) + 1;
  return { ...message, reactions, myReaction: emoji };
}

/** One-line text for the quoted message of a reply. */
export function getReplyPreviewText(reply: ChatReplyTo) {
  if (reply.deleted) return 'Tin nhắn đã bị thu hồi';
  if (reply.text) return reply.text;
  if (reply.type === 'media') return '📷 Ảnh';
  if (reply.type === 'sticker') return STICKER_PREVIEW_TEXT;
  return 'Tin nhắn không khả dụng';
}

/** How a sticker message reads in previews; the server quotes replies to stickers the same way. */
export const STICKER_PREVIEW_TEXT = 'Sticker';

function textOf(content: ChatMessage['content']) {
  const text = content?.text;
  return typeof text === 'string' ? text : null;
}

/** Images listed in the content of a media message; entries that are not valid are skipped. */
export function readAttachments(content: ChatMessage['content']): {
  id: string;
  width: number | null;
  height: number | null;
  blurhash: string | null;
}[] {
  const list = content?.attachments;
  if (!Array.isArray(list)) return [];

  const attachments = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const { id, width, height, blurhash } = entry as Record<string, unknown>;
    if (typeof id !== 'string') continue;
    attachments.push({
      id,
      width: typeof width === 'number' ? width : null,
      height: typeof height === 'number' ? height : null,
      blurhash: typeof blurhash === 'string' ? blurhash : null,
    });
  }
  return attachments;
}

export const BLOCKED_MEDIA_TEXT = 'Một tệp đã bị chặn do nội dung không phù hợp';
export const BLOCKED_OWN_MEDIA_TEXT = 'Ảnh của bạn không được gửi vì nội dung không phù hợp';

/** True while the sender can still unsend the message for everyone. */
export function canUnsendMessage(input: {
  isMine: boolean;
  createdAt: string;
  unsendWindowSeconds?: number;
  now?: number;
}) {
  if (!input.isMine) return false;
  const sentAt = Date.parse(input.createdAt);
  if (!Number.isFinite(sentAt)) return false;
  const windowMs = (input.unsendWindowSeconds ?? CHAT_UNSEND_WINDOW_SECONDS) * 1000;
  return (input.now ?? Date.now()) - sentAt < windowMs;
}

export function getDialogPreview(dialog: ChatDialog, meUserId: string | null) {
  const last = dialog.lastMessage;
  if (!last) return 'Chưa có tin nhắn';
  if (last.deletedAt) return 'Tin nhắn đã bị thu hồi';

  const sender =
    dialog.type === 'group' && last.senderId !== meUserId
      ? `${findMember(dialog, last.senderId)?.name ?? 'Bạn'}: `
      : '';

  if (last.censorStatus === 'rejected') {
    const text = last.senderId === meUserId ? BLOCKED_OWN_MEDIA_TEXT : BLOCKED_MEDIA_TEXT;
    return `${sender}${text}`;
  }
  if (last.type === 'media') {
    const count = readAttachments(last.content).length;
    return `${sender}📷 ${count > 1 ? `${count} ảnh` : 'Ảnh'}`;
  }
  if (last.type === 'sticker') return `${sender}${STICKER_PREVIEW_TEXT}`;
  return `${sender}${textOf(last.content) ?? 'Tin nhắn'}`;
}

export function getMessageStatus(
  dialog: ChatDialog,
  message: ChatMessage,
  meUserId: string
): ChatMessageStatus {
  if (dialog.type !== 'direct') return 'sent';
  const peer = dialog.members.find((member) => member.userId !== meUserId);
  if (peer && peer.lastReadSeq >= message.seq) return 'read';
  if (peer && peer.lastDeliveredSeq >= message.seq) return 'delivered';
  return 'sent';
}

/** Confirmed messages (ascending by seq) followed by queued ones, oldest first. */
export function buildThreadItems(
  dialog: ChatDialog,
  messages: ChatMessage[],
  outgoing: OutgoingMessage[],
  outgoingMedia: OutgoingMediaMessage[],
  meUserId: string
): ChatThreadItem[] {
  const byId = new Map(messages.map((message) => [message.id, message]));
  // The server joins the quoted preview when it sends a message, so an unsend
  // that arrives later reaches the cache only as the original's tombstone.
  const resolveReplyTo = (reply: ChatReplyTo | null | undefined) => {
    if (!reply) return null;
    if (!byId.get(reply.id)?.deletedAt) return reply;
    return { ...reply, deleted: true, text: null };
  };

  const confirmed = messages.map<ChatThreadItem>((message) => {
    const isMine = message.senderId === meUserId;
    const deleted = message.deletedAt !== null;
    const isSticker = !deleted && message.type === 'sticker';
    return {
      key: message.id,
      kind: deleted ? 'text' : message.type === 'media' ? 'media' : isSticker ? 'sticker' : 'text',
      media: deleted
        ? []
        : readAttachments(message.content).map((attachment) => ({
            key: attachment.id,
            attachmentId: attachment.id,
            localUri: null,
            localThumbUri: null,
            width: attachment.width,
            height: attachment.height,
            blurhash: attachment.blurhash,
          })),
      blocked: !deleted && message.censorStatus === 'rejected',
      seq: message.seq,
      id: message.id,
      clientMsgId: message.clientMsgId,
      senderId: message.senderId,
      isMine,
      text: isSticker ? null : textOf(message.content),
      sticker: isSticker ? (message.sticker ?? null) : null,
      deleted,
      reactions: deleted ? [] : listReactions(message.reactions),
      myReaction: deleted ? null : (message.myReaction ?? null),
      replyTo: deleted ? null : resolveReplyTo(message.replyTo),
      status: isMine ? getMessageStatus(dialog, message, meUserId) : null,
      readCount:
        isMine && dialog.type === 'group'
          ? dialog.members.filter(
              (member) => member.userId !== meUserId && member.lastReadSeq >= message.seq
            ).length
          : null,
      error: null,
      createdAt: message.createdAt,
    };
  });

  const confirmedClientIds = new Set(messages.map((m) => m.clientMsgId));
  const pendingText = outgoing
    .filter((message) => !confirmedClientIds.has(message.clientMsgId))
    .map((message) => ({
      createdAtLocal: message.createdAtLocal,
      item: {
        key: `local-${message.clientMsgId}`,
        kind: message.type,
        media: [],
        blocked: false,
        seq: null,
        id: null,
        clientMsgId: message.clientMsgId,
        senderId: message.senderId,
        isMine: true,
        text: message.type === 'text' ? message.content.text : null,
        sticker: message.type === 'sticker' ? message.sticker : null,
        deleted: false,
        reactions: [],
        myReaction: null,
        replyTo: resolveReplyTo(message.replyTo),
        status: message.status,
        readCount: null,
        error: message.error ?? null,
        createdAt: new Date(message.createdAtLocal).toISOString(),
      } satisfies ChatThreadItem,
    }));

  const pendingMedia = outgoingMedia
    .filter((message) => !confirmedClientIds.has(message.clientMsgId))
    .map((message) => ({
      createdAtLocal: message.createdAtLocal,
      item: {
        key: `local-${message.clientMsgId}`,
        kind: 'media',
        media: message.media.map((file) => ({
          key: file.localId,
          attachmentId: null,
          localUri: file.uri,
          localThumbUri: file.thumbUri,
          width: file.width,
          height: file.height,
          blurhash: file.blurhash ?? null,
        })),
        blocked: false,
        seq: null,
        id: null,
        clientMsgId: message.clientMsgId,
        senderId: message.senderId,
        isMine: true,
        text: message.text || null,
        sticker: null,
        deleted: false,
        reactions: [],
        myReaction: null,
        replyTo: null,
        status: message.status === 'sending' ? 'uploading' : message.status,
        readCount: null,
        error: message.error ?? null,
        createdAt: new Date(message.createdAtLocal).toISOString(),
      } satisfies ChatThreadItem,
    }));

  // Queued messages in the order they were sent.
  const pending = [...pendingText, ...pendingMedia]
    .sort((a, b) => a.createdAtLocal - b.createdAtLocal)
    .map(({ item }) => item);

  return [...confirmed, ...pending];
}

export function formatChatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Chat-list timestamp: time today, 'Hôm qua', otherwise day/month. */
export function formatChatListTime(iso: string, now: Date = new Date()) {
  const date = new Date(iso);
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000));

  if (dayDiff <= 0) return formatChatMessageTime(iso);
  if (dayDiff === 1) return 'Hôm qua';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export function messageStatusLabel(status: ChatMessageStatus | null) {
  switch (status) {
    case 'sending':
      return 'Đang gửi…';
    case 'uploading':
      return 'Đang tải ảnh lên…';
    case 'moderating':
      return 'Đang kiểm tra ảnh…';
    case 'failed':
      return 'Gửi lỗi';
    case 'read':
      return 'Đã xem';
    case 'delivered':
      return 'Đã nhận';
    case 'sent':
      return 'Đã gửi';
    default:
      return null;
  }
}
