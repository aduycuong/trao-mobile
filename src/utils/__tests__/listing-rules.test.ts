import type { ListingDraft } from '../listing-rules';
import {
  buildListingBody,
  canPostAlongside,
  composeStart,
  describeMain,
  digitsOnly,
  groupedDigits,
  isStartValid,
  startRange,
} from '../listing-rules';

const base: ListingDraft = {
  itemId: 'item-1',
  type: 'sell',
  price: '7500000',
  allowOffers: true,
  tradeWants: '',
  increment: '',
  days: 3,
  bidderLevel: 1,
  scheduled: false,
  startsAt: null,
  methods: ['meet', 'ship'],
  note: '  Gặp ở Vincom  ',
  area: null,
};

describe('canPostAlongside', () => {
  it('allows sell and trade together, never the same form twice', () => {
    expect(canPostAlongside('trade', ['sell'])).toBe(true);
    expect(canPostAlongside('sell', ['trade'])).toBe(true);
    expect(canPostAlongside('sell', ['sell'])).toBe(false);
  });

  it('keeps auction and gift on their own', () => {
    expect(canPostAlongside('auction', [])).toBe(true);
    expect(canPostAlongside('auction', ['sell'])).toBe(false);
    expect(canPostAlongside('sell', ['gift'])).toBe(false);
    expect(canPostAlongside('gift', ['trade'])).toBe(false);
  });
});

describe('price fields', () => {
  it('keeps digits and groups them the Vietnamese way', () => {
    expect(digitsOnly('7.500.000đ')).toBe('7500000');
    expect(groupedDigits('7500000')).toBe('7.500.000');
    expect(groupedDigits('')).toBe('');
  });
});

describe('buildListingBody', () => {
  it('builds a sell listing and trims the note', () => {
    expect(buildListingBody(base)).toEqual({
      itemId: 'item-1',
      handoverMethods: ['meet', 'ship'],
      handoverNote: 'Gặp ở Vincom',
      type: 'sell',
      price: 7_500_000,
      allowOffers: true,
    });
  });

  it('waits for a price of at least 1.000đ', () => {
    expect(buildListingBody({ ...base, price: '' })).toBeNull();
    expect(buildListingBody({ ...base, price: '999' })).toBeNull();
  });

  it('needs a handover method', () => {
    expect(buildListingBody({ ...base, methods: [] })).toBeNull();
  });

  it('needs what a trade wants, and nothing for a gift', () => {
    expect(buildListingBody({ ...base, type: 'trade', tradeWants: '  ' })).toBeNull();
    expect(buildListingBody({ ...base, type: 'trade', tradeWants: ' iPad ' })).toMatchObject({
      type: 'trade',
      tradeWants: 'iPad',
    });
    expect(buildListingBody({ ...base, type: 'gift' })).toMatchObject({ type: 'gift' });
  });

  it('builds an auction that starts when approved or at the chosen time', () => {
    const auction: ListingDraft = {
      ...base,
      type: 'auction',
      price: '5000000',
      increment: '100000',
    };
    expect(buildListingBody(auction)).toMatchObject({
      type: 'auction',
      price: 5_000_000,
      minIncrement: 100_000,
      durationDays: 3,
      minBidderLevel: 1,
      startsAt: null,
    });
    expect(buildListingBody({ ...auction, scheduled: true })).toBeNull();
    const at = new Date('2026-11-01T13:00:00.000Z');
    expect(buildListingBody({ ...auction, scheduled: true, startsAt: at })).toMatchObject({
      startsAt: '2026-11-01T13:00:00.000Z',
    });
    expect(buildListingBody({ ...auction, increment: '' })).toBeNull();
  });
});

describe('describeMain', () => {
  it('sums up each form', () => {
    expect(describeMain(base)).toBe('7.500.000đ · cho trả giá');
    expect(describeMain({ ...base, type: 'gift' })).toBe('Miễn phí');
    expect(describeMain({ ...base, type: 'trade', tradeWants: ' iPad ' })).toBe('Muốn: iPad');
    expect(describeMain({ ...base, type: 'auction', price: '5000000' })).toBe(
      'Khởi điểm 5.000.000đ · 3 ngày'
    );
  });
});

describe('auction start', () => {
  const now = new Date('2026-10-30T10:00:00').getTime();

  it('accepts a start from 10 minutes to 7 days ahead', () => {
    const { min, max } = startRange(now);
    expect(isStartValid(new Date(min), now)).toBe(true);
    expect(isStartValid(new Date(max), now)).toBe(true);
    expect(isStartValid(new Date(min - 60_000), now)).toBe(false);
    expect(isStartValid(new Date(max + 60_000), now)).toBe(false);
    expect(isStartValid(null, now)).toBe(false);
  });

  it('keeps the start of a listing being edited when it is not changed', () => {
    const old = new Date(now + 60_000);
    expect(isStartValid(old, now)).toBe(false);
    expect(isStartValid(old, now, old)).toBe(true);
  });

  it('composes a local time from a day offset and a slot', () => {
    const start = composeStart(now, 1, 20 * 60 + 30);
    expect(start.getDate()).toBe(31);
    expect(start.getHours()).toBe(20);
    expect(start.getMinutes()).toBe(30);
  });
});
