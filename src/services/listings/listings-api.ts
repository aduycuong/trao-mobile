import { apiRequest } from '@/services/api';
import type {
  CheckListingResult,
  ListingOwnerDetail,
  ListingPageData,
  ListingRequestBody,
  ListingSegment,
  ListMyListingsResult,
} from '@/types/listings';

export const MY_LISTINGS_QUERY_KEY = ['listings', 'mine'] as const;
export const listingQueryKey = (id: string, uid: string | undefined) =>
  ['listing', id, uid ?? null] as const;
export const listingPageKey = (id: string, uid: string | undefined) =>
  ['listing-page', id, uid ?? null] as const;

export function checkListing(token: string, body: ListingRequestBody): Promise<CheckListingResult> {
  return apiRequest<CheckListingResult>('/api/listings/check', { token, body });
}

export function createListing(
  token: string,
  body: ListingRequestBody
): Promise<{ id: string; status: 'pending_review' }> {
  return apiRequest('/api/listings', { token, body });
}

/** Sends a rejected listing again, posts a closed one again, or edits a live one. */
export function updateListing(
  token: string,
  id: string,
  body: ListingRequestBody
): Promise<{ id: string; status: 'pending_review' | 'published' | 'scheduled' }> {
  return apiRequest(`/api/listings/${encodeURIComponent(id)}`, { token, method: 'PATCH', body });
}

export function fetchMyListings(
  token: string,
  params: { segment: ListingSegment; keyword?: string; offset: number }
): Promise<ListMyListingsResult> {
  const query = new URLSearchParams({ segment: params.segment, offset: String(params.offset) });
  if (params.keyword) query.set('keyword', params.keyword);
  return apiRequest<ListMyListingsResult>(`/api/listings?${query}`, { token });
}

export function fetchMyListing(token: string, id: string): Promise<ListingOwnerDetail> {
  return apiRequest<ListingOwnerDetail>(`/api/listings/${encodeURIComponent(id)}`, { token });
}

export function deleteListing(token: string, id: string): Promise<{ deleted: true }> {
  return apiRequest(`/api/listings/${encodeURIComponent(id)}`, { token, method: 'DELETE' });
}

export function closeListing(
  token: string,
  id: string,
  note?: string
): Promise<{ declinedOffers: number }> {
  return apiRequest(`/api/listings/${encodeURIComponent(id)}/close`, {
    token,
    body: { note },
  });
}

export function refreshListing(
  token: string,
  id: string
): Promise<{ refreshedAt: string; nextRefreshAt: string }> {
  return apiRequest(`/api/listings/${encodeURIComponent(id)}/refresh`, {
    token,
    method: 'POST',
    body: {},
  });
}

/** Open to guests; with a token the answer says whether the viewer is the owner / liked it. */
export function fetchListingPage(id: string, token?: string): Promise<ListingPageData> {
  return apiRequest<ListingPageData>(`/api/listings/${encodeURIComponent(id)}/page`, { token });
}

/** Counts a view; the server decides whether it counts. */
export function recordListingView(id: string, token?: string): Promise<{ counted: boolean }> {
  return apiRequest(`/api/listings/${encodeURIComponent(id)}/view`, {
    token,
    method: 'POST',
    body: {},
  });
}
