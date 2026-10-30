import { apiRequest } from '@/services/api';
import type { AuctionBoardData, PlaceBidResult } from '@/types/deals';

/** Open to guests: the token is sent only when there is one. */
export function fetchAuctionBoard(listingId: string, token?: string): Promise<AuctionBoardData> {
  return apiRequest(`/api/listings/${encodeURIComponent(listingId)}/bids`, { token });
}

export function placeBidRequest(
  token: string,
  listingId: string,
  amount: number
): Promise<PlaceBidResult> {
  return apiRequest(`/api/listings/${encodeURIComponent(listingId)}/bids`, {
    token,
    body: { amount },
  });
}

export function acceptBidOfferRequest(
  token: string,
  bidId: string
): Promise<{ transactionId: string | null }> {
  return apiRequest(`/api/bids/${encodeURIComponent(bidId)}/accept`, { token, method: 'POST' });
}

export function declineBidOfferRequest(
  token: string,
  bidId: string
): Promise<{ transactionId: string | null }> {
  return apiRequest(`/api/bids/${encodeURIComponent(bidId)}/decline`, { token, method: 'POST' });
}
