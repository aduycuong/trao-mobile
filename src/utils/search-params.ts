import {
  SEARCH_EXTRAS,
  SEARCH_FORMS,
  SEARCH_REGIONS,
  type SearchExtra,
  type SearchFilters,
  type SearchForm,
  type SearchHistoryEntry,
  type SearchRegion,
} from '@/types/search';
import { SEARCH_QUERY_MAX_LENGTH, SEARCH_SORTS_BY_FORM } from '@/utils/search-rules';

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const entry = Array.isArray(value) ? value[0] : value;
  return entry === '' ? undefined : entry;
}

function csv(value: string | string[] | undefined): string[] {
  return (first(value) ?? '').split(',').filter(Boolean).slice(0, 10);
}

/** Filters from the params of a search screen; anything invalid falls back to its default. */
export function parseSearchFilters(raw: RawParams): SearchFilters {
  const formParam = first(raw.form);
  const form: SearchForm = SEARCH_FORMS.includes(formParam as SearchForm)
    ? (formParam as SearchForm)
    : 'all';
  const regionParam = first(raw.region);
  const sortParam = first(raw.sort);
  const sort = SEARCH_SORTS_BY_FORM[form].find((option) => option.id === sortParam)?.id ?? 'rel';

  return {
    q: (first(raw.q) ?? '').trim().slice(0, SEARCH_QUERY_MAX_LENGTH),
    form,
    category: first(raw.category)?.slice(0, 60),
    region: SEARCH_REGIONS.includes(regionParam as SearchRegion)
      ? (regionParam as SearchRegion)
      : undefined,
    conditions: csv(raw.conditions),
    price: first(raw.price)?.slice(0, 20),
    extras: csv(raw.extras).filter((entry): entry is SearchExtra =>
      SEARCH_EXTRAS.includes(entry as SearchExtra)
    ),
    sort,
  };
}

/** The params of the filters as `[name, value]` pairs; defaults are left out. */
export function searchParamPairs(filters: SearchFilters): [string, string][] {
  const pairs: [string, string][] = [];
  if (filters.q) pairs.push(['q', filters.q]);
  if (filters.form !== 'all') pairs.push(['form', filters.form]);
  if (filters.category) pairs.push(['category', filters.category]);
  if (filters.region) pairs.push(['region', filters.region]);
  if (filters.conditions.length > 0) pairs.push(['conditions', filters.conditions.join(',')]);
  if (filters.price) pairs.push(['price', filters.price]);
  if (filters.extras.length > 0) pairs.push(['extras', filters.extras.join(',')]);
  if (filters.sort !== 'rel') pairs.push(['sort', filters.sort]);
  return pairs;
}

/** The query string of the filters (no leading `?`), encoded. */
export function toSearchQuery(filters: SearchFilters): string {
  return searchParamPairs(filters)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('&');
}

/** The params of the filters as an object, for `router.push({ params })`. */
export function toSearchRouteParams(filters: SearchFilters): Record<string, string> {
  return Object.fromEntries(searchParamPairs(filters));
}

/** The filters a recent search is repeated with. */
export function filtersFromHistory(entry: SearchHistoryEntry): SearchFilters {
  const base = parseSearchFilters({});
  return {
    ...base,
    ...entry.filters,
    conditions: entry.filters.conditions ?? [],
    extras: entry.filters.extras ?? [],
    q: entry.query,
    sort: 'rel',
  };
}
