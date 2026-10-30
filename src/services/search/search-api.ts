import { apiRequest } from '@/services/api';
import type { SearchFilters, SearchOptions, SearchResult } from '@/types/search';
import { toSearchQuery } from '@/utils/search-params';

export const SEARCH_OPTIONS_KEY = ['search', 'options'] as const;

function withQuery(path: string, filters: SearchFilters, extra = ''): string {
  const query = [toSearchQuery(filters), extra].filter(Boolean).join('&');
  return query ? `${path}?${query}` : path;
}

/** One page of results. Open to guests. */
export function fetchSearch(
  filters: SearchFilters,
  offset: number,
  token?: string
): Promise<SearchResult> {
  return apiRequest<SearchResult>(
    withQuery('/api/search', filters, offset > 0 ? `offset=${offset}` : ''),
    { token }
  );
}

/** How many listings the filters find, for "Xem N món". */
export function fetchSearchCount(
  filters: SearchFilters,
  token?: string
): Promise<{ total: number }> {
  return apiRequest<{ total: number }>(withQuery('/api/search/count', filters), { token });
}

/** The categories, the viewer's city and their recent searches. */
export function fetchSearchOptions(token?: string): Promise<SearchOptions> {
  return apiRequest<SearchOptions>('/api/search/options', { token });
}

/** Remembers a submitted search for the signed-in user. */
export async function saveSearch(token: string, filters: SearchFilters): Promise<void> {
  const { q, form, category, region, conditions, price, extras } = filters;
  await apiRequest('/api/search/history', {
    token,
    body: { q, form, category, region, conditions, price, extras },
  });
}
