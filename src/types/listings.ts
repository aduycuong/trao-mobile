import type { ItemPhotoView, ItemVideoView } from '@/types/stock';
import type { ListingType } from '@/types/people';
import type { OnboardingLocation } from '@/types/onboarding';

export const HANDOVER_METHODS = ['meet', 'ship'] as const;
export type HandoverMethod = (typeof HANDOVER_METHODS)[number];

export const LISTING_AUCTION_DURATIONS = [1, 3, 7] as const;
export const LISTING_AUCTION_MIN_LEAD_MINUTES = 10;
export const LISTING_AUCTION_MAX_LEAD_DAYS = 7;
export const LISTING_PRICE_MIN = 1_000;
export const LISTING_PRICE_MAX = 9_999_999_999;
export const LISTING_TRADE_WANTS_MAX_LENGTH = 200;
export const LISTING_HANDOVER_NOTE_MAX_LENGTH = 300;
export const LISTING_CLOSE_NOTE_MAX_LENGTH = 200;
export const LISTING_REFRESH_INTERVAL_DAYS = 3;

/** The four forms in the order the canvas lists them in the posting step. */
export const FORM_CHOICES: { type: ListingType; label: string; sub: string }[] = [
  { type: 'sell', label: 'Bán', sub: 'Đặt giá, có thể cho trả giá' },
  { type: 'trade', label: 'Trao đổi', sub: 'Đổi lấy món bạn cần' },
  { type: 'gift', label: 'Cho tặng', sub: 'Tặng miễn phí cho người cần' },
  { type: 'auction', label: 'Đấu giá', sub: 'Ai trả cao nhất thì mua' },
];

/** The fields the posting step fills, one set for the four forms (the API takes a union by `type`). */
export type ListingFields = {
  itemId: string;
  type: ListingType;
  price: number | null;
  allowOffers: boolean;
  tradeWants: string;
  minIncrement: number | null;
  durationDays: 1 | 3 | 7;
  minBidderLevel: 1 | 2;
  /** ISO time, or null to start when approved. */
  startsAt: string | null;
  handoverMethods: HandoverMethod[];
  handoverNote: string;
  /** A new area picked in the flow; null keeps the profile's (or the listing's) own. */
  area: OnboardingLocation | null;
};

/** The body of `POST /api/listings/check`, `POST /api/listings` and `PATCH /api/listings/:id`. */
export type ListingRequestBody = {
  itemId: string;
  type: ListingType;
  handoverMethods: HandoverMethod[];
  handoverNote?: string;
  area?: OnboardingLocation;
  price?: number;
  allowOffers?: boolean;
  minIncrement?: number;
  durationDays?: number;
  minBidderLevel?: number;
  startsAt?: string | null;
  tradeWants?: string;
  listingId?: string;
  confirmed?: true;
};

/** One line of "Trao đã kiểm tra". `block` stops posting; `hint` never does. */
export type ListingCheck = {
  code: string;
  result: 'pass' | 'block' | 'hint';
  title: string;
  detail: string;
};

export type CheckListingResult = { checks: ListingCheck[]; blocked: boolean };

export type ListingReviewError = {
  code: string;
  field: string;
  message: string;
  fix: string;
};

export type ListingPillTone = 'review' | 'bad' | 'live' | 'sched' | 'done' | 'off';
export type ListingGroup = 'rejected' | 'review' | ListingType;
export type ListingSegment = 'draft' | 'open' | 'closed';

export type ListingMineRow = {
  id: string;
  itemId: string;
  title: string;
  type: ListingType;
  status: string;
  group: ListingGroup;
  coverUrl: string | null;
  categorySlug: string | null;
  main: string;
  pill: { text: string; tone: ListingPillTone };
  who: string;
  badge: number;
};

export type ListMyListingsResult = {
  items: ListingMineRow[];
  nextOffset: number | null;
  counts: Record<ListingSegment, number>;
};

export type ListingFormFields = {
  price: number | null;
  allowOffers: boolean;
  tradeWants: string | null;
  minIncrement: number | null;
  durationDays: number | null;
  minBidderLevel: number | null;
  startsAt: string | null;
  handoverMethods: string[];
  handoverNote: string | null;
  areaName: string | null;
};

export type ListingOwnerDetail = {
  id: string;
  itemId: string;
  type: ListingType;
  status: string;
  title: string;
  coverUrl: string | null;
  categorySlug: string | null;
  priceText: string;
  rejection: { at: string; errors: ListingReviewError[] } | null;
  reviewFailed: boolean;
  editPending: boolean;
  closed: { reason: string; at: string; note: string | null } | null;
  stats: { views: number; likes: number; offers: number };
  pendingOffers: number;
  auction: { round: number; maxRounds: number } | null;
  fields: ListingFormFields;
  canEdit: boolean;
  editBlockedReason: string | null;
  canClose: boolean;
  closeBlockedReason: string | null;
  canRefresh: boolean;
  nextRefreshAt: string | null;
  canRepost: boolean;
  repostFrom: string | null;
  repostBlockedReason: string | null;
};

export type ListingPageSeller = {
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  completedCount: number;
  verified: boolean;
  tenureLabel: string;
  activityLevel: 'daily' | 'regular' | 'occasional';
  otherListingCount: number;
  following: boolean;
};

export type ListingPageAuction = {
  startPrice: number;
  minIncrement: number;
  durationDays: number;
  currentPrice: number;
  bidCount: number;
  startsAt: string;
  endsAt: string;
  minBidderLevel: number;
  running: boolean;
};

export type ListingPageData =
  | { available: false; isOwner: boolean }
  | {
      available: true;
      isOwner: boolean;
      id: string;
      type: ListingType;
      status: 'published' | 'scheduled';
      dealState: 'open' | 'in_transaction' | 'completed';
      updating: boolean;
      title: string;
      conditionLabel: string;
      categoryName: string | null;
      areaName: string | null;
      distanceText: string | null;
      photos: ItemPhotoView[];
      videos: ItemVideoView[];
      description: string | null;
      attributes: { key: string; value: string }[];
      story: string | null;
      price: number | null;
      allowOffers: boolean;
      tradeWants: string | null;
      auction: ListingPageAuction | null;
      offerCount: number;
      likeCount: number;
      liked: boolean;
      viewCount: number;
      also: { id: string; type: ListingType }[];
      handoverMethods: string[];
      handoverNote: string | null;
      seller: ListingPageSeller;
      ownerTools: ListingOwnerDetail | null;
    };
