import { auctionIsOver, bidError, bidMinimum, canBid, quickBids } from '../auction-rules';

describe('bidMinimum', () => {
  it('is the starting price before the first bid', () => {
    expect(
      bidMinimum({
        bidCount: 0,
        startPrice: 1_000_000,
        currentPrice: 1_000_000,
        minIncrement: 50_000,
      })
    ).toBe(1_000_000);
  });

  it('is the price plus the step after that', () => {
    expect(
      bidMinimum({
        bidCount: 3,
        startPrice: 1_000_000,
        currentPrice: 1_200_000,
        minIncrement: 50_000,
      })
    ).toBe(1_250_000);
  });
});

describe('bidError', () => {
  it('flags a bid under the minimum, not an empty box', () => {
    expect(bidError('', 1_250_000)).toBeNull();
    expect(bidError('1200000', 1_250_000)).toBe('Giá đặt tối thiểu là 1.250.000đ.');
    expect(bidError('1250000', 1_250_000)).toBeNull();
  });
});

describe('quickBids', () => {
  it('offers the minimum, one step and four steps above', () => {
    expect(quickBids(1_250_000, 50_000)).toEqual([1_250_000, 1_300_000, 1_450_000]);
  });
});

describe('canBid', () => {
  it('lets everyone bid on an open auction', () => {
    expect(canBid(1, 'member')).toBe(true);
  });

  it('keeps a member out of a verified-only auction, with the profile still unknown it lets the server decide', () => {
    expect(canBid(2, 'member')).toBe(false);
    expect(canBid(2, 'verified')).toBe(true);
    expect(canBid(2, undefined)).toBe(true);
  });
});

describe('auctionIsOver', () => {
  const now = new Date('2026-10-20T08:00:00.000Z').getTime();
  it('is over when not running or when the clock ran out', () => {
    expect(auctionIsOver({ running: true, endsAt: '2026-10-20T09:00:00.000Z' }, now)).toBe(false);
    expect(auctionIsOver({ running: true, endsAt: '2026-10-20T07:59:00.000Z' }, now)).toBe(true);
    expect(auctionIsOver({ running: false, endsAt: '2026-10-20T09:00:00.000Z' }, now)).toBe(true);
  });
});
