import { apiRequest } from '@/services/api';
import type { CommentView, ListCommentsResult } from '@/types/comments';

export const COMMENT_MAX_LENGTH = 500;

export const listingCommentsKey = (listingId: string, uid: string | undefined) =>
  ['listing-comments', listingId, uid ?? null] as const;

/** Top comments, newest first, each with its replies. Open to guests. */
export function fetchComments(
  listingId: string,
  offset: number,
  token?: string
): Promise<ListCommentsResult> {
  return apiRequest<ListCommentsResult>(
    `/api/listings/${encodeURIComponent(listingId)}/comments?offset=${offset}`,
    { token }
  );
}

export function postComment(
  token: string,
  listingId: string,
  body: { body: string; parentId?: string }
): Promise<CommentView> {
  return apiRequest<CommentView>(`/api/listings/${encodeURIComponent(listingId)}/comments`, {
    token,
    body,
  });
}

export async function removeComment(token: string, commentId: string): Promise<void> {
  await apiRequest(`/api/comments/${encodeURIComponent(commentId)}`, { token, method: 'DELETE' });
}

export function setCommentLiked(
  token: string,
  commentId: string,
  liked: boolean
): Promise<{ liked: boolean; likeCount: number }> {
  return apiRequest(`/api/comments/${encodeURIComponent(commentId)}/like`, {
    token,
    method: liked ? 'POST' : 'DELETE',
  });
}
