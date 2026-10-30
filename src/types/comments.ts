export type CommentView = {
  id: string;
  /** `ok`, or a placeholder kept because replies hang under it: the author removed it or an admin hid it. */
  status: 'ok' | 'deleted' | 'hidden';
  /** Null for a placeholder. */
  body: string | null;
  authorHandle: string | null;
  authorName: string | null;
  avatarUrl: string | null;
  /** Written by the owner of the listing: shown as "Người đăng". */
  byListingOwner: boolean;
  mine: boolean;
  createdAt: string;
  likeCount: number;
  liked: boolean;
  /** Oldest first; empty on a reply (replies are one level deep). */
  replies: CommentView[];
};

export type ListCommentsResult = {
  items: CommentView[];
  /** Every visible comment and reply of the listing. */
  total: number;
  nextOffset: number | null;
};
