import type { ListingCardData } from '@/types/people';

/** A card in the feed, with why it is shown ("Vì sao tôi thấy món này"). */
export type FeedCard = ListingCardData & { reason: string };

export type FeedStripId = 'suggested' | 'auctions' | 'gifts' | 'trades';

export type FeedStripForm = 'sell' | 'trade' | 'gift' | 'auction';

/** A horizontal block of Home with its "Xem tất cả". */
export type FeedStrip = {
  id: FeedStripId;
  title: string;
  /** The form "Xem tất cả" opens in search; none for the suggestions. */
  seeAll: { type: FeedStripForm | null };
  items: FeedCard[];
};

export type FeedCategory = { slug: string; name: string };

export type HomeFeed = {
  categories: FeedCategory[];
  strips: FeedStrip[];
  /** Ids of every card in the blocks, passed to "Tin mới đăng" so it does not repeat them. */
  excludeIds: string[];
};

export type LatestFeedResult = {
  items: FeedCard[];
  /** Pass back to read the next page; null at the end. */
  nextCursor: string | null;
};
