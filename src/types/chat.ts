export type ChatInboxType = 'direct' | 'group';

export type ChatMessageContent = Record<string, unknown> | null;

/** `rejected`: media blocked by moderation. Show a placeholder, never the content. */
export type ChatCensorStatus = 'clean' | 'censored' | 'rejected' | (string & {});

/**
 * Preview of the message a message replies to, joined live by the server.
 * `text` is absent when the original is unsent, blocked or has no text (media: use `type`).
 */
export type ChatReplyTo = {
  id: string;
  seq: number;
  senderId: string;
  type: string;
  deleted: boolean;
  text: string | null;
};

/** A sticker of a chat sticker group, resolved by the server from `content.stickerId`. */
export type ChatMessageSticker = {
  id: string;
  groupId: string;
  groupName: string;
  name: string;
  /** Storage key on the public media host (or a full URL). */
  imagePath: string;
};

/** Message as returned by the API. Dates are ISO strings. */
export type ChatMessage = {
  id: string;
  inboxId: string;
  seq: number;
  senderId: string;
  clientMsgId: string;
  type: string;
  content: ChatMessageContent;
  /** Set on `sticker` messages; null when the sticker no longer exists. Missing on older caches. */
  sticker?: ChatMessageSticker | null;
  censorStatus?: ChatCensorStatus;
  /** Users per emoji, e.g. `{"👍":2}`. Missing on messages cached before reactions existed. */
  reactions?: Record<string, number>;
  /** The emoji the current user reacted with, if any. */
  myReaction?: string | null;
  /** The message this one replies to; null when none or hidden from this user. */
  replyTo?: ChatReplyTo | null;
  version: number;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
};

export type ChatDialogMember = {
  userId: string;
  firebaseUid: string;
  name: string;
  avatar: string | null;
  lastReadSeq: number;
  lastDeliveredSeq: number;
};

export type ChatDialogLastMessage = {
  id: string;
  seq: number;
  senderId: string;
  type: string;
  content: ChatMessageContent;
  censorStatus?: ChatCensorStatus;
  deletedAt: string | null;
  createdAt: string;
};

/** One row of the chat list for the current user. */
export type ChatDialog = {
  id: string;
  type: ChatInboxType;
  title: string | null;
  avatar: string | null;
  memberCount: number;
  lastSeq: number;
  lastActivityAt: string;
  /** Current user's read pointer. */
  lastReadSeq: number;
  unreadCount: number;
  lastMessage: ChatDialogLastMessage | null;
  members: ChatDialogMember[];
  /** Messages cannot be sent right now (a parent locked the conversation). */
  sendLocked?: boolean;
  /**
   * Seconds after sending during which the sender can unsend for everyone.
   * Resolved from the inbox settings, or the app default.
   */
  unsendWindowSeconds?: number;
};

/** One entry of the user's update log. */
export type ChatUpdate = {
  pts: number;
  type: string;
  inboxId: string | null;
  refId: string | null;
  payload: Record<string, unknown>;
};

/** `everyone` recalls the message for all members. `me` hides it from this user. */
export type ChatMessageDeleteScope = 'everyone' | 'me';

export type GetDialogsResult = { pts: number; dialogs: ChatDialog[] };
export type GetDialogResult = { dialog: ChatDialog };
export type GetHistoryResult = {
  pts: number;
  /** Ascending by `seq`. */
  messages: ChatMessage[];
  hasMore: boolean;
};
export type GetDifferenceResult = {
  /** Current `pts` of the user on the server. */
  pts: number;
  /** `pts` of the last update included (equals `pts` when `hasMore` is false). */
  appliedPts: number;
  /** Local state is too far behind or ahead; reload with `getDialogs`. */
  tooLong: boolean;
  hasMore: boolean;
  updates: ChatUpdate[];
  messages: ChatMessage[];
  dialogs: ChatDialog[];
  /** Direct inboxes to drop: the other member blocked this user. */
  removedInboxIds?: string[];
};
export type SendMessageResult = { message: ChatMessage };

/** A sticker of the chat catalog. */
export type ChatStickerItem = ChatMessageSticker & { description: string };
export type ChatStickerGroup = { id: string; name: string };
export type ListChatStickersResult = {
  /** Enabled chat sticker groups, by name. */
  groups: ChatStickerGroup[];
  /** The group of `items`: the requested one, or the first group when none or unknown. */
  groupId: string | null;
  items: ChatStickerItem[];
};
export type SetChatMessageReactionResult = { message: ChatMessage };
export type DeleteChatMessageResult = {
  scope: ChatMessageDeleteScope;
  /** Tombstone after an unsend. Null when the message was hidden for this user. */
  message: ChatMessage | null;
  dialog: ChatDialog;
};
export type MarkInboxReadResult = { lastReadSeq: number | null };
export type GetOrCreateDirectInboxResult = { inboxId: string };
export type CreateGroupInboxResult = { inboxId: string };

/** One image of a media message, as the server is told about it before uploading. */
export type ChatMediaFileInput = {
  contentType: string;
  contentLength: number;
  thumbContentType: string;
  thumbContentLength: number;
  width: number;
  height: number;
  blurhash?: string;
};

export type ChatPendingMessageStatus =
  'uploading' | 'moderating' | 'sent' | 'rejected' | 'failed' | 'expired';

export type ChatMediaUploadTarget = {
  url: string;
  /** Unix ms when the presigned URL expires. */
  expiresAt: number;
};

export type ChatPendingAttachment = {
  id: string;
  status: string;
  width: number | null;
  height: number | null;
  /** Set only while the full image still has to be uploaded. */
  upload: ChatMediaUploadTarget | null;
  /** Set only while the thumbnail still has to be uploaded. */
  thumbUpload: ChatMediaUploadTarget | null;
};

/** A media message that is uploading or being moderated; visible to its sender only. */
export type ChatPendingMessage = {
  id: string;
  inboxId: string;
  clientMsgId: string;
  status: ChatPendingMessageStatus;
  text: string | null;
  expiresAt: string;
  attachments: ChatPendingAttachment[];
};

export type CreatePendingMediaMessageResult = { pending: ChatPendingMessage };
export type GetPendingMediaUploadUrlsResult = { pending: ChatPendingMessage };
export type CompletePendingMediaUploadResult = {
  pending: ChatPendingMessage;
  /** Attachments with a missing file; ask for new upload URLs and upload them. */
  missingAttachmentIds: string[];
};

export type ChatMediaVariant = 'thumb' | 'full';
export type GetChatMediaUrlsResult = {
  /** Ids the user may not see are left out. */
  urls: Record<string, { url: string; expiresAt: number }>;
};

export type FriendListItem = {
  userId: string;
  firebaseUid: string;
  name: string;
  avatar: string | null;
};
export type ListFriendsResult = { items: FriendListItem[]; total: number };

/** A message the user sent that the server has not confirmed yet. */
export type OutgoingMessage = {
  clientMsgId: string;
  inboxId: string;
  senderId: string;
  /** The message this one answers; sent as `replyToId`. */
  replyTo?: ChatReplyTo;
  /** Local creation time (ms); orders pending messages. */
  createdAtLocal: number;
  /** `sending` retries automatically; `failed` was rejected and needs the user. */
  status: 'sending' | 'failed';
  error?: string;
} & (
  | { type: 'text'; content: { text: string } }
  | {
      type: 'sticker';
      content: { stickerId: string };
      /** Shown while the message is still queued. */
      sticker: ChatMessageSticker;
    }
);

/**
 * One image picked for a message, kept on the device until it is uploaded.
 * `uri` and `thumbUri` are files in the app's document directory (see
 * `chat-media-files.ts`), so they survive restarts and cache clean-ups.
 */
export type LocalMediaItem = {
  localId: string;
  uri: string;
  thumbUri: string;
  mime: string;
  thumbMime: string;
  size: number;
  thumbSize: number;
  width: number;
  height: number;
  blurhash?: string;
};

/** What the user is typing in one inbox and has not sent yet. */
export type ChatDraft = {
  inboxId: string;
  text: string;
  media: LocalMediaItem[];
  updatedAt: number;
};

/**
 * A media message the user sent that the server has not confirmed yet.
 * `media[i]` is the same image as `attachments[i]` of the server's pending
 * message (the server keeps the order of the files).
 *
 * - `sending`: creating the message or uploading; retried automatically.
 * - `moderating`: uploaded; waiting for the verdict. It leaves the queue when
 *   the message (sent or blocked) arrives with the same `clientMsgId`.
 * - `failed`: the server refused it, moderation could not run or it expired.
 */
export type OutgoingMediaMessage = {
  clientMsgId: string;
  inboxId: string;
  senderId: string;
  text: string;
  media: LocalMediaItem[];
  createdAtLocal: number;
  status: 'sending' | 'moderating' | 'failed';
  /** Server id of the pending message, once it exists. */
  pendingMessageId?: string;
  error?: string;
};

/** Uploads one local file to a presigned URL (PUT, raw body). */
export type UploadTransport = {
  put(params: {
    url: string;
    uri: string;
    contentType: string;
    onProgress?: (loadedBytes: number) => void;
    /** Aborting it cancels the upload (the promise rejects). */
    signal?: AbortSignal;
  }): Promise<void>;
};

/** A failed upload; `status` is the HTTP status when the storage answered. */
export class UploadTransportError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'UploadTransportError';
  }
}

export type ChatSnapshot = { pts: number; dialogs: ChatDialog[] };

export type ChatStoreBatch = {
  /** New `pts` to persist in the same transaction; null leaves it unchanged. */
  pts: number | null;
  dialogs: ChatDialog[];
  messages: ChatMessage[];
  /** Direct chats to drop because the other person blocked this user. */
  removedInboxIds?: string[];
  /** Messages hidden for this user ("xóa ở phía tôi"). */
  removedMessageIds?: string[];
};

/**
 * Local cache of the server state (expo-sqlite on mobile). Every write is
 * atomic and `subscribe` listeners run after any change.
 */
export interface ChatLocalStore {
  /** `null` when nothing has been synced yet. */
  getPts(): Promise<number | null>;
  listDialogs(): Promise<ChatDialog[]>;
  getDialog(inboxId: string): Promise<ChatDialog | undefined>;
  /** Newest `limit` messages with `seq < beforeSeq`, ascending by `seq`. */
  listMessages(
    inboxId: string,
    options: { beforeSeq?: number; limit: number }
  ): Promise<ChatMessage[]>;
  listOutgoing(inboxId?: string): Promise<OutgoingMessage[]>;
  listOutgoingMedia(inboxId?: string): Promise<OutgoingMediaMessage[]>;
  getDraft(inboxId: string): Promise<ChatDraft | undefined>;
  /** Every stored draft; used to find image files nothing points to any more. */
  listDrafts(): Promise<ChatDraft[]>;

  /** Drops cached dialogs/messages and stores the snapshot. Keeps the outgoing queue. */
  resetFromSnapshot(snapshot: ChatSnapshot): Promise<void>;
  /**
   * Upserts dialogs and messages (a message only replaces a stored one with
   * `version` <=), removes outgoing entries whose `clientMsgId` matches a
   * stored message (text and media), drops `removedInboxIds` with their queued
   * messages and drafts, drops `removedMessageIds`, and persists `pts`.
   */
  applyBatch(batch: ChatStoreBatch): Promise<void>;
  patchDialog(inboxId: string, patch: Partial<ChatDialog>): Promise<void>;

  putOutgoing(message: OutgoingMessage): Promise<void>;
  updateOutgoing(clientMsgId: string, patch: Partial<OutgoingMessage>): Promise<void>;
  deleteOutgoing(clientMsgId: string): Promise<void>;

  /** Queues a media message; it takes over the draft of its inbox, which is deleted. */
  putOutgoingMedia(message: OutgoingMediaMessage): Promise<void>;
  updateOutgoingMedia(clientMsgId: string, patch: Partial<OutgoingMediaMessage>): Promise<void>;
  deleteOutgoingMedia(clientMsgId: string): Promise<void>;

  /** Stores the draft of an inbox; an empty draft (no text, no media) deletes it. */
  putDraft(draft: ChatDraft): Promise<void>;
  deleteDraft(inboxId: string): Promise<void>;

  subscribe(listener: () => void): () => void;
  close(): Promise<void>;
}
