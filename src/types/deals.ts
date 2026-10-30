import type { ListingType } from '@/types/people';

export type DealOfferKind = 'price_offer' | 'buy_now' | 'swap' | 'gift_request';

export type DealStatus =
  'asking' | 'offered' | 'declined' | 'in_transaction' | 'completed' | 'cancelled';

export type Person = { handle: string; name: string | null; avatarUrl: string | null };

export type DealOfferView = {
  id: string;
  kind: DealOfferKind;
  /** VND, for a price offer or a buy now. */
  amount: number | null;
  /** The asker's item, for a swap. */
  offeredItem: { id: string; title: string; coverUrl: string | null } | null;
  status: 'pending' | 'withdrawn' | 'superseded' | 'declined' | 'auto_declined' | 'accepted';
  declineReason: string | null;
  createdAt: string;
};

export type DealTransactionView = {
  id: string;
  status: 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  price: number | null;
  confirmedByMe: boolean;
  confirmedByThem: boolean;
  reviewedByMe: boolean;
  cancelledByMe: boolean;
};

export type DealAuctionView = {
  roundStatus: 'scheduled' | 'running' | 'ended' | 'failed' | 'cancelled';
  currentPrice: number;
  endsAt: string;
  myBid: number | null;
  leading: boolean;
  offerForMe: { bidId: string; amount: number; expiresAt: string | null } | null;
};

/** One agreement as the viewer sees it (`GET /api/deals`, `GET /api/chat/deal-index`). */
export type DealView = {
  id: string;
  inboxId: string | null;
  listing: {
    id: string;
    type: ListingType;
    title: string;
    coverUrl: string | null;
    price: number | null;
    allowOffers: boolean;
    status: string;
    tradeWants: string | null;
    offerCount: number;
  };
  role: 'owner' | 'asker';
  status: DealStatus;
  counterpart: Person;
  offer: DealOfferView | null;
  awaiting: 'me' | 'them' | null;
  transactionId: string | null;
  transaction: DealTransactionView | null;
  itemLocked: boolean;
  /** "Đang giao dịch": the listing is still on the market, or the deal is in progress. */
  active: boolean;
  updatedAt: string;
  auction: DealAuctionView | null;
  bidder: DealAuctionView | null;
};

export type ListingOfferEntry = {
  offer: DealOfferView;
  dealId: string;
  inboxId: string | null;
  asker: Person;
  isNew: boolean;
};

export type ListingOffersResult = { items: ListingOfferEntry[] };

export type OfferBody =
  | { kind: 'price_offer'; amount: number }
  | { kind: 'buy_now' }
  | { kind: 'swap'; offeredItemId: string; message?: string }
  | { kind: 'gift_request'; message?: string };

export type AuctionBoardEntry = {
  rank: number;
  name: string;
  amount: number;
  isMe: boolean;
  at: string;
};

export type AuctionBoardData = {
  status: 'scheduled' | 'running' | 'ended' | 'failed' | 'cancelled';
  currentPrice: number;
  bidCount: number;
  bidderCount: number;
  endsAt: string;
  entries: AuctionBoardEntry[];
  me: { rank: number; amount: number; leading: boolean } | null;
};

export type PlaceBidResult = {
  amount: number;
  currentPrice: number;
  endsAt: string;
  extended: boolean;
};

export type TransactionCancelReason = 'no_show' | 'not_as_described' | 'changed_mind' | 'other';

export type TransactionDetail = {
  id: string;
  type: ListingType;
  status: 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  role: 'seller' | 'buyer';
  listing: { id: string; title: string };
  item: { id: string; title: string; coverUrl: string | null };
  counterItem: { id: string; title: string; coverUrl: string | null } | null;
  price: number | null;
  tradeWants: string | null;
  counterpart: Person;
  inboxId: string | null;
  handover: { methods: string[]; note: string | null };
  step: number;
  meConfirmed: boolean;
  themConfirmed: boolean;
  createdAt: string;
  completedAt: string | null;
  review: { mineSent: boolean; theirsSent: boolean };
  cancel: {
    byMe: boolean;
    reason: TransactionCancelReason | null;
    reasonLabel: string | null;
    note: string | null;
    at: string;
  } | null;
};

export type PendingAction = {
  key: string;
  kind: 'offer' | 'confirm' | 'bid_offer';
  title: string;
  status: string;
  cta: string;
  href: string;
  counterpart: Person;
};

export type ReviewChoice = { code: string; label: string };

export type ReviewContext = {
  transactionId: string;
  inboxId: string | null;
  role: 'buyer' | 'seller';
  type: ListingType;
  item: { title: string; coverUrl: string | null };
  agreed: string;
  counterpart: Person;
  completedAt: string;
  publishAt: string;
  mine: { rating: number; criteria: string[]; comment: string | null; published: boolean } | null;
  theirsSent: boolean;
  rewardAmount: number;
  praise: ReviewChoice[];
  complaints: ReviewChoice[];
};

export type SubmitReviewResult = { published: boolean; rewardAmount: number };
