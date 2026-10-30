import type { ListingType } from '@/types/people';

/** The five condition levels, best to worst (web `lib/items/constants`). */
export const ITEM_CONDITIONS = [
  { code: 'new_sealed', label: 'Mới nguyên seal', hint: 'Chưa mở hộp' },
  { code: 'like_new', label: 'Như mới', hint: 'Đã dùng, không dấu vết' },
  { code: 'good', label: 'Tốt', hint: 'Có dấu hiệu sử dụng nhẹ' },
  { code: 'fair', label: 'Khá', hint: 'Có lỗi thẩm mỹ, hoạt động bình thường' },
  { code: 'needs_repair', label: 'Cần sửa', hint: 'Hỏng một phần, bán theo hiện trạng' },
] as const;

export type ItemCondition = (typeof ITEM_CONDITIONS)[number]['code'];

export const ITEM_DESCRIPTION_MAX_LENGTH = 2000;
export const ITEM_CAPTION_MAX_LENGTH = 100;
export const ITEM_NOTE_MAX_LENGTH = 500;
export const ITEM_TAG_MAX_LENGTH = 40;
export const ITEM_TAGS_MAX_COUNT = 10;
export const ITEM_PAGE_MAX_SIZE = 50;

/** Photos and videos together, and at most three of them videos. */
export const ITEM_MEDIA_MAX_COUNT = 10;
export const ITEM_VIDEO_MAX_COUNT = 3;
export const ITEM_VIDEO_MIN_SECONDS = 5;
export const ITEM_VIDEO_MAX_SECONDS = 30;
export const PHOTO_MAX_EDGE = 1600;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 80 * 1024 * 1024;
export const VIDEO_MAX_MB = VIDEO_MAX_BYTES / (1024 * 1024);

/** `available` (ready), `in_auction`, `in_transaction`. */
export type ItemStatus = 'available' | 'in_auction' | 'in_transaction';

/** `checking` while a photo or video is still being checked after the upload. */
export type ItemMediaStatus = 'ok' | 'checking';

export type ItemTagView = { tag: string; color: string };

export type ItemTagCount = ItemTagView & { count: number };

export type ItemPhotoView = {
  mediaId: string;
  url: string;
  thumbUrl: string;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  caption: string | null;
};

export type ItemVideoView = {
  mediaId: string;
  caption: string | null;
  posterUrl: string;
  playbackUrl: string;
  durationMs: number | null;
};

export type ItemNoteTone = 'live' | 'soon' | 'deal' | 'bad';

/** One line of the Kho đồ list. */
export type ItemListRow = {
  id: string;
  title: string;
  condition: string;
  categoryName: string | null;
  categorySlug: string | null;
  coverUrl: string | null;
  status: ItemStatus;
  mediaStatus: ItemMediaStatus;
  tags: ItemTagView[];
  note: { text: string; tone: ItemNoteTone } | null;
  /** Forms with a listing that is not closed. */
  openListingTypes: ListingType[];
  origin: string | null;
};

export type ListMyItemsResult = {
  items: ItemListRow[];
  nextOffset: number | null;
  total: number;
  allCount: number;
  tags: ItemTagCount[];
};

export type ItemListingSummary = {
  id: string;
  type: ListingType;
  /** `draft`, `pending_review`, `scheduled`, `published`, `closed`. */
  status: string;
  main: string;
  meta: string;
  offerCount: number;
  closedAt: string | null;
  closedReason: string | null;
};

export type ItemHistoryEvent = { title: string; detail: string; at: string };

export type ItemDetail = {
  id: string;
  title: string;
  condition: ItemCondition;
  conditionLabel: string;
  categoryName: string | null;
  categorySlug: string | null;
  status: ItemStatus;
  mediaStatus: ItemMediaStatus;
  since: string;
  owners: string | null;
  tags: ItemTagView[];
  photos: ItemPhotoView[];
  videos: ItemVideoView[];
  description: string | null;
  story: string | null;
  attributes: { key: string; value: string }[];
  sourceDescription: string | null;
  note: string | null;
  listings: ItemListingSummary[];
  history: ItemHistoryEvent[];
  /** Offers waiting that an edit of the content would decline. */
  waitingOffers: number;
  locked: boolean;
  deleteBlockedReason: string | null;
};

/** What the LLM reads out of the description (`POST /api/items/preview`). */
export type PreviewItemContent = {
  title: string;
  categorySlug: string | null;
  categoryName: string | null;
  attributes: { key: string; value: string }[];
  description: string;
  story: string | null;
};

/** A photo or video as the API takes it. */
export type ItemMediaInput = { mediaId: string; caption?: string };

export type CreateItemBody = {
  description: string;
  condition: ItemCondition;
  photos: ItemMediaInput[];
  videos: ItemMediaInput[];
  tags: string[];
};

export type MediaKind = 'photo' | 'video';

/** What the server says about an uploaded file. */
export type MediaFileSummary = {
  id: string;
  kind: 'image' | 'video';
  status: 'pending_upload' | 'processing' | 'ready' | 'failed' | 'deleted';
  durationMs: number | null;
};
