import type { DealView } from '@/types/deals';
import { dealChipStatus, describeDealBanner, describeDealTerms } from '../deal-banner';
import { priceOfferError, priceSuggestions } from '../offer-rules';

const NOW = new Date('2026-10-20T08:00:00.000Z');

function deal(over: Partial<DealView> = {}): DealView {
  return {
    id: 'd1',
    inboxId: 'i1',
    listing: {
      id: 'l1',
      type: 'sell',
      title: 'iPhone 13',
      coverUrl: null,
      price: 7_500_000,
      allowOffers: true,
      status: 'published',
      tradeWants: null,
      offerCount: 0,
    },
    role: 'asker',
    status: 'asking',
    counterpart: { handle: 'nam', name: 'Hoàng Nam', avatarUrl: null },
    offer: null,
    awaiting: null,
    transactionId: null,
    transaction: null,
    itemLocked: false,
    active: true,
    updatedAt: '2026-10-20T07:00:00.000Z',
    auction: null,
    bidder: null,
    ...over,
  };
}

const offer = (
  over: Partial<NonNullable<DealView['offer']>> = {}
): NonNullable<DealView['offer']> => ({
  id: 'o1',
  kind: 'price_offer',
  amount: 7_000_000,
  offeredItem: null,
  status: 'pending',
  declineReason: null,
  createdAt: '2026-10-20T07:00:00.000Z',
  ...over,
});

const tx = (
  over: Partial<NonNullable<DealView['transaction']>> = {}
): NonNullable<DealView['transaction']> => ({
  id: 't1',
  status: 'in_progress',
  price: 7_000_000,
  confirmedByMe: false,
  confirmedByThem: false,
  reviewedByMe: false,
  cancelledByMe: false,
  ...over,
});

describe('describeDealBanner (sell)', () => {
  it('asking: the buyer can bid a price or buy now', () => {
    const banner = describeDealBanner(deal(), NOW);
    expect(banner.main).toBe('Giá 7.500.000đ · cho trả giá');
    expect(banner.status).toBe('Đang hỏi');
    expect(banner.actions.map((a) => a.key)).toEqual(['offer', 'buy']);
  });

  it('asking: no price offer when the owner does not allow it', () => {
    const banner = describeDealBanner(
      deal({ listing: { ...deal().listing, allowOffers: false } }),
      NOW
    );
    expect(banner.actions.map((a) => a.key)).toEqual(['buy']);
  });

  it('offered: the asker waits and may withdraw or offer again', () => {
    const banner = describeDealBanner(deal({ status: 'offered', offer: offer() }), NOW);
    expect(banner.main).toBe('Trả giá 7.000.000đ');
    expect(banner.status).toBe('Chờ trả lời');
    expect(banner.tone).toBe('offer');
    expect(banner.actions.map((a) => a.key)).toEqual(['withdraw', 'reoffer']);
  });

  it('offered: the owner is asked to answer', () => {
    const banner = describeDealBanner(
      deal({ role: 'owner', status: 'offered', offer: offer(), awaiting: 'me' }),
      NOW
    );
    expect(banner.main).toBe('Hoàng Nam trả giá 7.000.000đ');
    expect(banner.status).toBe('Chờ bạn trả lời');
    expect(banner.tone).toBe('act');
    expect(banner.actions.map((a) => a.key)).toEqual(['decline', 'agree']);
  });

  it('offered: buy now says "Chờ bạn đồng ý" and the owner cannot agree while the item is locked', () => {
    const buy = deal({
      role: 'owner',
      status: 'offered',
      offer: offer({ kind: 'buy_now', amount: 7_500_000 }),
    });
    expect(describeDealBanner(buy, NOW).status).toBe('Chờ bạn đồng ý');
    const locked = describeDealBanner({ ...buy, itemLocked: true }, NOW);
    expect(locked.status).toBe('Món đang giao dịch với người khác');
    expect(locked.actions.map((a) => a.key)).toEqual(['decline']);
  });

  it('declined: the asker may try again', () => {
    const banner = describeDealBanner(
      deal({ status: 'declined', offer: offer({ status: 'declined' }) }),
      NOW
    );
    expect(banner.status).toBe('Hoàng Nam đã từ chối');
    expect(banner.tone).toBe('live');
    expect(banner.actions.map((a) => a.key)).toEqual(['offer', 'buy']);
  });

  it('in transaction: confirm and cancel, then wait for the other side', () => {
    const base = deal({
      status: 'in_transaction',
      offer: offer({ status: 'accepted' }),
      transaction: tx(),
    });
    const mine = describeDealBanner(base, NOW);
    expect(mine.status).toBe('Chờ bạn xác nhận');
    expect(mine.actions.map((a) => a.key)).toEqual(['cancelTransaction', 'confirmTransaction']);
    const waiting = describeDealBanner({ ...base, transaction: tx({ confirmedByMe: true }) }, NOW);
    expect(waiting.status).toBe('Chờ Hoàng Nam xác nhận');
    expect(waiting.actions).toEqual([]);
  });

  it('completed: review until the viewer has reviewed', () => {
    const base = deal({ status: 'completed', transaction: tx({ status: 'completed' }) });
    expect(describeDealBanner(base, NOW).actions.map((a) => a.key)).toEqual(['review']);
    const reviewed = describeDealBanner(
      { ...base, transaction: tx({ status: 'completed', reviewedByMe: true }) },
      NOW
    );
    expect(reviewed.status).toBe('Giao dịch thành công · bạn đã đánh giá');
    expect(reviewed.actions).toEqual([]);
  });

  it('cancelled: grey, and says who cancelled', () => {
    const base = deal({
      status: 'cancelled',
      transaction: tx({ status: 'cancelled', cancelledByMe: true }),
    });
    const mine = describeDealBanner(base, NOW);
    expect(mine.cancelled).toBe(true);
    expect(mine.status).toBe('Bạn đã huỷ giao dịch này');
    const theirs = describeDealBanner({ ...base, transaction: tx({ status: 'cancelled' }) }, NOW);
    expect(theirs.status).toBe('Hoàng Nam đã huỷ giao dịch này');
  });
});

describe('describeDealBanner (other forms)', () => {
  it('gift: one sign-up, withdrawn by "Huỷ đăng ký"', () => {
    const gift = deal({ listing: { ...deal().listing, type: 'gift', price: null } });
    expect(describeDealBanner(gift, NOW).actions.map((a) => a.label)).toEqual(['Đăng ký nhận']);
    const signed = describeDealBanner(
      { ...gift, status: 'offered', offer: offer({ kind: 'gift_request', amount: null }) },
      NOW
    );
    expect(signed.main).toBe('Đã đăng ký nhận');
    expect(signed.actions.map((a) => a.label)).toEqual(['Huỷ đăng ký']);
  });

  it('trade: the offered item is named', () => {
    const trade = deal({
      listing: { ...deal().listing, type: 'trade', price: null, tradeWants: 'Lego' },
      status: 'offered',
      offer: offer({
        kind: 'swap',
        amount: null,
        offeredItem: { id: 'i', title: 'Canon AE-1', coverUrl: null },
      }),
    });
    expect(describeDealBanner(trade, NOW).main).toBe('Đổi bằng Canon AE-1');
    expect(describeDealBanner(trade, NOW).actions.map((a) => a.label)).toEqual([
      'Huỷ',
      'Đổi món khác',
    ]);
  });

  const round = (over: object = {}) => ({
    roundStatus: 'running' as const,
    currentPrice: 2_450_000,
    endsAt: '2026-10-20T09:24:00.000Z',
    myBid: 2_400_000,
    leading: false,
    offerForMe: null,
    ...over,
  });
  const auctionDeal = (over: Partial<DealView> = {}) =>
    deal({
      listing: { ...deal().listing, type: 'auction', price: 2_000_000 },
      status: 'offered',
      ...over,
    });

  it('auction: outbid asker gets a new bid button', () => {
    const banner = describeDealBanner(auctionDeal({ auction: round() }), NOW);
    expect(banner.main).toBe('Bạn đặt 2.400.000đ');
    expect(banner.status).toBe('Bị vượt giá · cao nhất 2.450.000đ');
    expect(banner.actions.map((a) => a.key)).toEqual(['bid']);
  });

  it('auction: leading shows the time left', () => {
    const banner = describeDealBanner(auctionDeal({ auction: round({ leading: true }) }), NOW);
    expect(banner.status).toBe('Đang dẫn đầu · còn 1g 24p');
  });

  it('auction: the next bidder is invited', () => {
    const banner = describeDealBanner(
      auctionDeal({
        auction: round({
          offerForMe: { bidId: 'b1', amount: 2_400_000, expiresAt: '2026-10-21T08:00:00.000Z' },
        }),
      }),
      NOW
    );
    expect(banner.main).toBe('Mời bạn mua với 2.400.000đ');
    expect(banner.actions.map((a) => a.key)).toEqual(['bidDecline', 'bidAccept']);
  });

  it('auction: the owner reads the bidder side', () => {
    const banner = describeDealBanner(
      auctionDeal({ role: 'owner', bidder: round({ leading: true }) }),
      NOW
    );
    expect(banner.main).toBe('Hoàng Nam đặt 2.400.000đ');
    expect(banner.actions).toEqual([]);
  });
});

describe('chat chip helpers', () => {
  it('describeDealTerms for a sale', () => {
    expect(describeDealTerms(deal(), NOW)).toBe('Giá 7.500.000đ · cho trả giá');
  });

  it('dealChipStatus is the banner status', () => {
    expect(dealChipStatus(deal({ status: 'offered', offer: offer() }), NOW)).toBe('Chờ trả lời');
  });
});

describe('offer rules', () => {
  it('a price offer must be below the listed price and at least 1.000đ', () => {
    expect(priceOfferError('', 7_500_000)).toBeNull();
    expect(priceOfferError('7500000', 7_500_000)).toBe('Giá trả phải thấp hơn giá đăng.');
    expect(priceOfferError('500', 7_500_000)).toBe('Tối thiểu 1.000đ.');
    expect(priceOfferError('7000000', 7_500_000)).toBeNull();
  });

  it('suggestions are 95/90/85 percent rounded down to thousands', () => {
    expect(priceSuggestions(7_500_000)).toEqual([7_125_000, 6_750_000, 6_375_000]);
    expect(priceSuggestions(0)).toEqual([]);
  });
});
