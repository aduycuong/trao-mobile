import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import {
  acceptBidOfferRequest,
  declineBidOfferRequest,
  placeBidRequest,
} from '@/services/auctions/auctions-api';
import {
  acceptOfferRequest,
  declineOfferRequest,
  sendOfferRequest,
  withdrawOfferRequest,
} from '@/services/deals/deals-api';
import type { OfferBody } from '@/types/deals';

/** Everything that shows an agreement is read again after an action, whether it worked or not. */
export const DEAL_QUERY_ROOTS = [
  'deals',
  'deal-index',
  'listing-offers',
  'listing-page',
  'auction-board',
  'items',
  'item',
  'listings',
  'transactions',
  'chat',
] as const;

/**
 * What a person can do to an agreement: send, withdraw, accept or decline an offer, bid, answer
 * the offer to the next bidder. Each action answers whether it worked; a failure is told in an
 * alert (the agreement may have changed even then, so the queries are read again).
 */
export function useDealActions() {
  const queryClient = useQueryClient();
  const { getIdToken } = useAuth();
  const [pending, setPending] = useState(0);
  const running = useRef(0);

  async function run(action: (token: string) => Promise<unknown>, fallback: string) {
    running.current += 1;
    setPending(running.current);
    try {
      await action(await getIdToken());
      return true;
    } catch (error) {
      Alert.alert(fallback, error instanceof Error ? error.message : 'Thử lại sau.');
      return false;
    } finally {
      await Promise.all(
        DEAL_QUERY_ROOTS.map((queryKey) => queryClient.invalidateQueries({ queryKey: [queryKey] }))
      );
      running.current -= 1;
      setPending(running.current);
    }
  }

  return {
    busy: pending > 0,
    send: (listingId: string, body: OfferBody) =>
      run((token) => sendOfferRequest(token, listingId, body), 'Không gửi được đề nghị'),
    withdraw: (offerId: string) =>
      run((token) => withdrawOfferRequest(token, offerId), 'Không rút được đề nghị'),
    accept: (offerId: string) =>
      run((token) => acceptOfferRequest(token, offerId), 'Không đồng ý được'),
    decline: (offerId: string, reason?: string) =>
      run((token) => declineOfferRequest(token, offerId, reason), 'Không từ chối được'),
    bid: (listingId: string, amount: number) =>
      run((token) => placeBidRequest(token, listingId, amount), 'Không đặt giá được'),
    acceptBidOffer: (bidId: string) =>
      run((token) => acceptBidOfferRequest(token, bidId), 'Không đồng ý được'),
    declineBidOffer: (bidId: string) =>
      run((token) => declineBidOfferRequest(token, bidId), 'Không từ chối được'),
  };
}
