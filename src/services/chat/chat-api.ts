import type {
  ChatMediaFileInput,
  ChatMediaVariant,
  ChatMessageDeleteScope,
  CompletePendingMediaUploadResult,
  CreateGroupInboxResult,
  CreatePendingMediaMessageResult,
  DeleteChatMessageResult,
  GetChatMediaUrlsResult,
  GetDialogResult,
  GetDialogsResult,
  GetDifferenceResult,
  GetHistoryResult,
  GetOrCreateDirectInboxResult,
  GetPendingMediaUploadUrlsResult,
  ListChatStickersResult,
  ListFriendsResult,
  MarkInboxReadResult,
  SendMessageResult,
  SetChatMessageReactionResult,
} from '@/types/chat';
import { apiRequest } from '@/services/api';

export { ApiError as ChatApiError } from '@/services/api';

/** `getToken` returns a fresh Firebase idToken for every request. */
export function createChatApi(getToken: () => Promise<string>) {
  async function request<T>(path: string, body?: unknown, method?: 'GET' | 'POST' | 'PATCH') {
    return apiRequest<T>(path, { body, method, token: await getToken() });
  }

  return {
    getDialogs: () => request<GetDialogsResult>('/api/chat/dialogs'),

    getDialog: (inboxId: string) => request<GetDialogResult>(`/api/chat/inboxes/${inboxId}`),

    getDifference: (pts: number) => request<GetDifferenceResult>(`/api/chat/difference?pts=${pts}`),

    getHistory: (inboxId: string, options: { beforeSeq?: number; limit?: number } = {}) => {
      const query = new URLSearchParams();
      if (options.beforeSeq) query.set('beforeSeq', String(options.beforeSeq));
      if (options.limit) query.set('limit', String(options.limit));
      return request<GetHistoryResult>(`/api/chat/inboxes/${inboxId}/messages?${query.toString()}`);
    },

    sendText: (inboxId: string, clientMsgId: string, text: string, replyToId?: string) =>
      request<SendMessageResult>(`/api/chat/inboxes/${inboxId}/messages`, {
        clientMsgId,
        type: 'text',
        text,
        replyToId,
      }),

    sendSticker: (inboxId: string, clientMsgId: string, stickerId: string, replyToId?: string) =>
      request<SendMessageResult>(`/api/chat/inboxes/${inboxId}/messages`, {
        clientMsgId,
        type: 'sticker',
        stickerId,
        replyToId,
      }),

    /** Chat sticker groups and the stickers of one group (the first one when omitted). */
    listChatStickers: (groupId?: string) =>
      request<ListChatStickersResult>(
        `/api/chat/stickers${groupId ? `?groupId=${encodeURIComponent(groupId)}` : ''}`
      ),

    /** `emoji: null` removes the user's reaction. */
    setReaction: (inboxId: string, messageId: string, emoji: string | null) =>
      request<SetChatMessageReactionResult>(
        `/api/chat/inboxes/${inboxId}/messages/${messageId}/reaction`,
        { emoji }
      ),

    /** Unsend for everyone, or hide the message for this user only. */
    deleteMessage: (inboxId: string, messageId: string, scope: ChatMessageDeleteScope) =>
      request<DeleteChatMessageResult>(`/api/chat/inboxes/${inboxId}/messages/${messageId}`, {
        scope,
      }),

    /** Idempotent by `clientMsgId`: a repeat call returns fresh upload URLs for what is still missing. */
    createPendingMedia: (input: {
      inboxId: string;
      clientMsgId: string;
      text?: string;
      files: ChatMediaFileInput[];
    }) => request<CreatePendingMediaMessageResult>('/api/chat/media/messages', input),

    getPendingMediaState: (pendingMessageId: string) =>
      request<GetPendingMediaUploadUrlsResult>(
        `/api/chat/media/messages/${pendingMessageId}/upload-urls`,
        undefined,
        'POST'
      ),

    completePendingMedia: (pendingMessageId: string) =>
      request<CompletePendingMediaUploadResult>(
        `/api/chat/media/messages/${pendingMessageId}/complete`,
        undefined,
        'POST'
      ),

    getMediaUrls: (ids: string[], variant: ChatMediaVariant) =>
      request<GetChatMediaUrlsResult>('/api/chat/media/urls', { ids, variant }),

    markRead: (inboxId: string, seq: number) =>
      request<MarkInboxReadResult>(`/api/chat/inboxes/${inboxId}/read`, { seq }),

    getOrCreateDirectInbox: (friendUserId: string) =>
      request<GetOrCreateDirectInboxResult>('/api/chat/inboxes', {
        type: 'direct',
        friendUserId,
      }),

    createGroupInbox: (input: { title: string; avatar: string; memberUserIds: string[] }) =>
      request<CreateGroupInboxResult>('/api/chat/inboxes', { type: 'group', ...input }),

    listFriends: () => request<ListFriendsResult>('/api/connections'),
  };
}

export type ChatApi = ReturnType<typeof createChatApi>;
