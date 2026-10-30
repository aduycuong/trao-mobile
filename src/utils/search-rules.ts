import { ITEM_CONDITIONS } from '@/types/stock';
import type {
  SearchExtra,
  SearchFilters,
  SearchForm,
  SearchRegion,
  SearchSort,
} from '@/types/search';

// Same rules as the web app (`lib/search/constants.ts`, `docs/features.md` section 9.2).

export const SEARCH_FORM_LABELS: Record<SearchForm, string> = {
  all: 'Tất cả',
  sell: 'Bán',
  trade: 'Trao đổi',
  gift: 'Cho tặng',
  auction: 'Đấu giá',
};

/** Placeholder of the search box, by form (canvas Main). */
export const SEARCH_PLACEHOLDERS: Record<SearchForm, string> = {
  all: 'Tìm đồ quanh bạn…',
  sell: 'Tìm “iphone 13 dưới 8tr”…',
  trade: 'Tìm đồ bạn muốn đổi…',
  gift: 'Tìm đồ đang được tặng…',
  auction: 'Tìm phiên đấu giá…',
};

export const SEARCH_QUERY_MAX_LENGTH = 120;

/** Region when none is chosen: auctions look everywhere, the rest start near the viewer. */
export function defaultSearchRegion(form: SearchForm): SearchRegion {
  return form === 'auction' ? 'nation' : 'near';
}

export type SearchPriceBucket = {
  id: string;
  label: string;
  min: number | null;
  max: number | null;
};

const M = 1_000_000;
const K = 1_000;

/** Price ranges of the forms that have the filter. */
export const SEARCH_PRICE_BUCKETS: Partial<Record<SearchForm, SearchPriceBucket[]>> = {
  sell: [
    { id: 'lt500k', label: 'Dưới 500k', min: null, max: 500 * K },
    { id: '500k-2m', label: '500k – 2tr', min: 500 * K, max: 2 * M },
    { id: '2m-8m', label: '2 – 8tr', min: 2 * M, max: 8 * M },
    { id: 'gt8m', label: 'Trên 8tr', min: 8 * M, max: null },
  ],
  auction: [
    { id: 'lt1m', label: 'Dưới 1tr', min: null, max: 1 * M },
    { id: '1m-5m', label: '1 – 5tr', min: 1 * M, max: 5 * M },
    { id: '5m-20m', label: '5 – 20tr', min: 5 * M, max: 20 * M },
    { id: 'gt20m', label: 'Trên 20tr', min: 20 * M, max: null },
  ],
};

export const SEARCH_EXTRA_LABELS: Record<SearchExtra, string> = {
  bargain: 'Cho trả giá',
  video: 'Có video',
  verified: 'Người bán đã xác minh',
  no_bids: 'Chưa có lượt đặt',
  new_today: 'Mới mở hôm nay',
};

/** Extra filters of each form. */
export const SEARCH_EXTRAS_BY_FORM: Record<SearchForm, SearchExtra[]> = {
  all: [],
  sell: ['bargain', 'video', 'verified'],
  trade: [],
  gift: [],
  auction: ['no_bids', 'new_today', 'verified'],
};

export type SearchSortOption = { id: SearchSort; label: string; sub: string };

export const SEARCH_SORTS_BY_FORM: Record<SearchForm, SearchSortOption[]> = {
  all: [
    { id: 'rel', label: 'Phù hợp', sub: 'Khớp từ khoá, gần bạn, mới đăng' },
    { id: 'new', label: 'Mới đăng', sub: 'Tin mới nhất lên trước' },
  ],
  sell: [
    { id: 'rel', label: 'Phù hợp', sub: 'Khớp từ khoá, gần bạn, mới đăng' },
    { id: 'new', label: 'Mới đăng', sub: 'Tin mới nhất lên trước' },
    { id: 'low', label: 'Giá thấp trước', sub: 'Rẻ nhất lên trước' },
  ],
  trade: [
    { id: 'rel', label: 'Phù hợp', sub: 'Khớp từ khoá, gần bạn, mới đăng' },
    { id: 'new', label: 'Mới đăng', sub: 'Tin mới nhất lên trước' },
  ],
  gift: [
    { id: 'rel', label: 'Phù hợp', sub: 'Khớp từ khoá, gần bạn' },
    { id: 'new', label: 'Mới đăng', sub: 'Tin mới nhất lên trước' },
  ],
  auction: [
    { id: 'rel', label: 'Phù hợp', sub: 'Khớp từ khoá' },
    { id: 'new', label: 'Mới mở', sub: 'Phiên mới bắt đầu lên trước' },
    { id: 'bids', label: 'Nhiều lượt đặt', sub: 'Phiên sôi nổi lên trước' },
  ],
};

export const CONDITION_LABELS: Record<string, string> = Object.fromEntries(
  ITEM_CONDITIONS.map((condition) => [condition.code, condition.label])
);

/** Empty filters: every form, near the viewer, most relevant first. */
export const EMPTY_SEARCH_FILTERS: SearchFilters = {
  q: '',
  form: 'all',
  conditions: [],
  extras: [],
  sort: 'rel',
};

/** Price, extras and sort belong to a form, and the area goes back to that form's default. */
export function withForm(filters: SearchFilters, form: SearchForm): SearchFilters {
  return { ...filters, form, region: undefined, price: undefined, extras: [], sort: 'rel' };
}

/** An active filter as a removable chip: its label and what removing it changes. */
export type FilterChip = { key: string; label: string; remove: Partial<SearchFilters> };

/** The chips of the filters that narrow a search (not the form, area or sort). */
export function describeFilters(
  filters: SearchFilters,
  categories: { slug: string; name: string }[]
): FilterChip[] {
  const chips: FilterChip[] = [];
  const category = categories.find((entry) => entry.slug === filters.category);
  if (filters.category && category) {
    chips.push({ key: 'category', label: category.name, remove: { category: undefined } });
  }

  const bucket = filters.price
    ? SEARCH_PRICE_BUCKETS[filters.form]?.find((entry) => entry.id === filters.price)
    : undefined;
  if (bucket) chips.push({ key: 'price', label: bucket.label, remove: { price: undefined } });

  if (filters.conditions.length > 0) {
    chips.push({
      key: 'conditions',
      label: filters.conditions.map((code) => CONDITION_LABELS[code] ?? code).join(', '),
      remove: { conditions: [] },
    });
  }
  for (const extra of filters.extras) {
    chips.push({
      key: `extra:${extra}`,
      label: SEARCH_EXTRA_LABELS[extra],
      remove: { extras: filters.extras.filter((entry) => entry !== extra) },
    });
  }
  return chips;
}

/** Name of an area for chips and summaries; `long` adds the hint the filter list shows. */
export function regionLabel(region: SearchRegion, cityName: string | null, long = false): string {
  if (region === 'near') return long ? 'Gần tôi (≤ 5 km)' : 'Gần tôi';
  if (region === 'city') return `Cả ${cityName ?? 'thành phố'}`;
  return long ? 'Toàn quốc · có giao' : 'Toàn quốc';
}

/** Adds the value to the list, or takes it out when it is already there. */
export function toggleInList<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}
