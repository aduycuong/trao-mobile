import { apiRequest } from '@/services/api';
import type { HomeFeed, LatestFeedResult } from '@/types/feed';

export const HOME_FEED_KEY = ['feed', 'home'] as const;
export const LATEST_FEED_KEY = ['feed', 'latest'] as const;

/** Home's blocks and category row. Open to guests (no token). */
export function fetchHomeFeed(token?: string): Promise<HomeFeed> {
  return apiRequest<HomeFeed>('/api/feed/home', { token });
}

/** "Tin mới đăng", one page; `exclude` are the cards already shown in the blocks. */
export function fetchLatestFeed(
  params: { cursor?: string; exclude: string[] },
  token?: string
): Promise<LatestFeedResult> {
  const query: string[] = [];
  if (params.cursor) query.push(`cursor=${encodeURIComponent(params.cursor)}`);
  if (params.exclude.length > 0) query.push(`exclude=${params.exclude.join(',')}`);
  return apiRequest<LatestFeedResult>(
    `/api/feed/latest${query.length ? `?${query.join('&')}` : ''}`,
    {
      token,
    }
  );
}

/** "Không quan tâm" hides one listing, "Ẩn người bán" every listing of its seller. */
export async function hideFeedItem(
  token: string,
  kind: 'listing' | 'seller',
  listingId: string
): Promise<void> {
  await apiRequest('/api/feed/hidden', { token, method: 'POST', body: { kind, listingId } });
}

export async function unhideFeedItem(
  token: string,
  kind: 'listing' | 'seller',
  listingId: string
): Promise<void> {
  await apiRequest('/api/feed/hidden', { token, method: 'DELETE', body: { kind, listingId } });
}
