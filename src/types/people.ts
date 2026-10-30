import type { MyProfileWarning } from '@/types/profile';

export const LISTING_TYPES = ['sell', 'auction', 'trade', 'gift'] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

/** Names of the four forms, as filter chips. */
export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  sell: 'Bán',
  auction: 'Đấu giá',
  trade: 'Trao đổi',
  gift: 'Cho tặng',
};

export type PublicListingCounts = Record<ListingType, number> & { all: number };

/** What anyone may see on a profile. No phone, email or exact location. */
export type PublicProfile = {
  id: string;
  handle: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  areaName: string | null;
  /** Đã xác thực: the phone is verified (the number itself is not shown). */
  verified: boolean;
  tenure: { label: string; since: string };
  activityLevel: 'daily' | 'regular' | 'occasional';
  warning: MyProfileWarning | null;
  completedCount: number;
  ratingAverage: number | null;
  ratingCount: number;
  followerCount: number;
  cancelRatePercent: number | null;
  listingCounts: PublicListingCounts;
  /** The viewer is this user: the screen shows the profile as others see it. */
  isSelf: boolean;
  /** The signed-in viewer follows this user. */
  following: boolean;
};

/** What a listing card shows. Prices are VND whole numbers; no exact location. */
export type ListingCardData = {
  id: string;
  ownerId: string;
  type: ListingType;
  title: string;
  /** Slug of the item's category, picks the icon when there is no photo. */
  categorySlug: string | null;
  /** Cover photo resized for a card; null without a photo. */
  coverUrl: string | null;
  videoDurationMs: number | null;
  condition: string;
  /** Sale price, or the current price of a running auction. Null for trade and gift. */
  price: number | null;
  bidCount: number | null;
  /** Auction only: when the round ends, ISO. */
  endsAt: string | null;
  tradeWants: string | null;
  registrationCount: number | null;
  canShip: boolean;
  areaName: string | null;
  /** Rounded distance from the viewer, e.g. "2,5 km". */
  distanceText: string | null;
  likeCount: number;
  liked: boolean;
  /** A sell card whose item is also offered for trade: shown as "+ Đổi". */
  alsoTrade: boolean;
  label: 'verified' | null;
};

export type ListUserListingsResult = {
  items: ListingCardData[];
  nextOffset: number | null;
  total: number;
};

export type ReviewerRole = 'buyer' | 'seller';

export type PublicReview = {
  id: string;
  reviewerName: string | null;
  reviewerHandle: string;
  reviewerAvatarUrl: string | null;
  reviewerRole: ReviewerRole;
  /** What the deal was, e.g. "Mua iPhone 13 128GB". */
  context: string;
  rating: number;
  criteria: string[];
  comment: string | null;
  /** When the review became public, ISO. */
  publishedAt: string;
};

export type ReviewSummary = {
  average: number | null;
  count: number;
  /** Count of reviews with 5, 4, 3, 2 and 1 stars, in that order. */
  distribution: [number, number, number, number, number];
  topCriteria: { label: string; count: number }[];
};

export type ListUserReviewsResult = {
  summary: ReviewSummary;
  items: PublicReview[];
  nextOffset: number | null;
  total: number;
};

export type FollowTab = 'followers' | 'following';

export type FollowPerson = {
  id: string;
  /** Username, else the id: what a profile link uses. */
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  verified: boolean;
  areaName: string | null;
  completedCount: number;
  /** Listings others can see now. */
  listingCount: number;
  /** The viewer follows this person. */
  following: boolean;
};

export type ListFollowPeopleResult = {
  items: FollowPerson[];
  nextOffset: number | null;
  total: number;
  followerCount: number;
  followingCount: number;
};

export type BlockedUser = {
  id: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  blockedAt: string;
};
