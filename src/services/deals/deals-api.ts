import { apiRequest } from '@/services/api';
import type { DealView, ListingOffersResult, OfferBody, PendingAction } from '@/types/deals';

export const DEALS_QUERY_KEY = ['deals'] as const;

export function fetchDeals(
  token: string,
  params: { inboxId?: string; listingId?: string; scope?: 'all' | 'active'; limit?: number } = {}
): Promise<{ items: DealView[] }> {
  const query = new URLSearchParams();
  if (params.inboxId) query.set('inboxId', params.inboxId);
  if (params.listingId) query.set('listingId', params.listingId);
  if (params.scope) query.set('scope', params.scope);
  if (params.limit) query.set('limit', String(params.limit));
  return apiRequest(`/api/deals?${query}`, { token });
}

export function fetchListingOffers(token: string, listingId: string): Promise<ListingOffersResult> {
  return apiRequest(`/api/listings/${encodeURIComponent(listingId)}/offers`, { token });
}

/** "Nhắn tin" from a listing: opens the chat and the agreement about it. */
export function openListingDeal(
  token: string,
  listingId: string
): Promise<{ dealId: string | null; inboxId: string }> {
  return apiRequest(`/api/listings/${encodeURIComponent(listingId)}/deal`, {
    token,
    method: 'POST',
  });
}

export function sendOfferRequest(
  token: string,
  listingId: string,
  body: OfferBody
): Promise<{ offerId: string; dealId: string }> {
  return apiRequest(`/api/listings/${encodeURIComponent(listingId)}/offers`, { token, body });
}

export async function withdrawOfferRequest(token: string, offerId: string): Promise<void> {
  await apiRequest(`/api/offers/${encodeURIComponent(offerId)}`, { token, method: 'DELETE' });
}

export function acceptOfferRequest(
  token: string,
  offerId: string
): Promise<{ transactionId: string }> {
  return apiRequest(`/api/offers/${encodeURIComponent(offerId)}/accept`, {
    token,
    method: 'POST',
  });
}

export async function declineOfferRequest(
  token: string,
  offerId: string,
  reason?: string
): Promise<void> {
  await apiRequest(`/api/offers/${encodeURIComponent(offerId)}/decline`, {
    token,
    method: 'POST',
    body: { reason: reason || undefined },
  });
}

export function fetchPendingActions(token: string): Promise<{ items: PendingAction[] }> {
  return apiRequest('/api/deals/pending', { token });
}
