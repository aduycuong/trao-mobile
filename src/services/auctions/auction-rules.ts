import { formatVnd } from '@/utils/format';

/** The lowest bid now: the starting price before the first bid, else the price plus the step. */
export function bidMinimum(auction: {
  bidCount: number;
  startPrice: number;
  currentPrice: number;
  minIncrement: number;
}): number {
  return auction.bidCount === 0 ? auction.startPrice : auction.currentPrice + auction.minIncrement;
}

/** The message under the bid box, or null when the amount can be sent. */
export function bidError(digits: string, minimum: number): string | null {
  if (digits === '') return null;
  return Number(digits) < minimum ? `Giá đặt tối thiểu là ${formatVnd(minimum)}.` : null;
}

/** Quick picks of the bid sheet: the lowest bid, one step above, four steps above. */
export function quickBids(minimum: number, step: number): number[] {
  return [0, 1, 4].map((steps) => minimum + steps * step);
}

/** Whether the viewer may bid: some auctions take only verified accounts (`minBidderLevel` 2). */
export function canBid(minBidderLevel: number, accountLevel: 'member' | 'verified' | undefined) {
  return !(minBidderLevel >= 2 && accountLevel !== undefined && accountLevel !== 'verified');
}

/** The round is over for new bids: not running, or the clock ran out. */
export function auctionIsOver(auction: { running: boolean; endsAt: string }, now: number): boolean {
  return !auction.running || new Date(auction.endsAt).getTime() <= now;
}
