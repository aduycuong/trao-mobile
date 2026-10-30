import type { FeedCategory } from '@/types/feed';
import type { ListingCardData } from '@/types/people';

export const SEARCH_FORMS = ['all', 'sell', 'trade', 'gift', 'auction'] as const;
export type SearchForm = (typeof SEARCH_FORMS)[number];

export const SEARCH_REGIONS = ['near', 'city', 'nation'] as const;
export type SearchRegion = (typeof SEARCH_REGIONS)[number];

export const SEARCH_EXTRAS = ['bargain', 'video', 'verified', 'no_bids', 'new_today'] as const;
export type SearchExtra = (typeof SEARCH_EXTRAS)[number];

export const SEARCH_SORTS = ['rel', 'new', 'low', 'bids'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

/** What the search box and the filters set. Also the params of the search screens. */
export type SearchFilters = {
  q: string;
  form: SearchForm;
  /** Slug of a top-level category. */
  category?: string | undefined;
  region?: SearchRegion | undefined;
  conditions: string[];
  /** `SearchPriceBucket.id`. */
  price?: string | undefined;
  extras: SearchExtra[];
  sort: SearchSort;
};

/** A way out of a thin or empty result: drop one filter or widen the area, with how many it finds. */
export type SearchFix = {
  kind: 'price' | 'conditions' | 'extras' | 'category' | 'region';
  label: string;
  count: number;
  /** For `region`: the area to switch to. */
  region?: SearchRegion;
};

export type SearchResult = {
  items: ListingCardData[];
  total: number;
  nextOffset: number | null;
  /** The area actually searched (a guest without a place falls back from "near"). */
  region: SearchRegion;
  cityName: string | null;
  /** First page only: more listings one step wider, when the result is small. */
  widen: SearchFix | null;
  /** First page only, when nothing matched. */
  fixes: SearchFix[];
};

export type SearchHistoryEntry = {
  id: string;
  query: string;
  filters: Partial<
    Pick<SearchFilters, 'form' | 'category' | 'region' | 'conditions' | 'price' | 'extras'>
  >;
};

export type SearchOptions = {
  categories: FeedCategory[];
  cityName: string | null;
  /** Recent searches; empty for a guest. */
  history: SearchHistoryEntry[];
};
