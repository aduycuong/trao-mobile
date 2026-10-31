import type { ListingType } from '@/types/people';
import {
  HANDOVER_METHODS,
  LISTING_AUCTION_MAX_LEAD_DAYS,
  LISTING_AUCTION_MIN_LEAD_MINUTES,
  LISTING_PRICE_MAX,
  LISTING_PRICE_MIN,
  type HandoverMethod,
  type ListingRequestBody,
} from '@/types/listings';
import type { OnboardingLocation } from '@/types/onboarding';
import { formatVnd } from '@/utils/format';

/** Only sell and trade may be open together on one item; auction and gift stand alone. */
const COEXISTING: readonly ListingType[] = ['sell', 'trade'];

/**
 * Whether a listing of `type` may be posted while the item already has the listings in `open`
 * (any status except closed, a review in progress included). The same form twice never.
 */
export function canPostAlongside(type: ListingType, open: readonly ListingType[]): boolean {
  return open.every(
    (other) => other !== type && COEXISTING.includes(type) && COEXISTING.includes(other)
  );
}

/** Keeps digits only, so a pasted `7.500.000đ` becomes `7500000`. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, String(LISTING_PRICE_MAX).length);
}

/** `7500000` → `7.500.000` for the price field. */
export function groupedDigits(value: string): string {
  return value ? Number(value).toLocaleString('vi-VN') : '';
}

/**
 * An edit of the price field, in the middle or at the end. `previous` is the digits before the
 * edit, `typed` what the field shows after it (the dots of the old grouping still in, plus what was
 * typed, pasted or deleted). Returns the digits now and where the caret goes in their grouped form,
 * so it stays next to what the person was editing instead of jumping to the end.
 */
export function editMoney(previous: string, typed: string): { digits: string; caret: number } {
  const before = groupedDigits(previous);
  const limit = Math.min(before.length, typed.length);
  let start = 0;
  while (start < limit && before[start] === typed[start]) start += 1;
  let tail = 0;
  while (
    tail < limit - start &&
    before[before.length - 1 - tail] === typed[typed.length - 1 - tail]
  ) {
    tail += 1;
  }

  let digits = digitsOnly(typed);
  // The digits right of the caret stay the same: they are the unchanged end of the text.
  let right = digitsOnly(typed.slice(typed.length - tail)).length;

  // Backspace over a dot removes no digit: take the digit before the dot, as if it was the one.
  if (digits === previous && typed.length < before.length) {
    const left = digitsOnly(before.slice(0, start)).length;
    if (left > 0) {
      digits = previous.slice(0, left - 1) + previous.slice(left);
      right = digitsOnly(before.slice(start)).length;
    }
  }

  const grouped = groupedDigits(digits);
  let caret = grouped.length;
  let remaining = right;
  while (remaining > 0 && caret > 0) {
    caret -= 1;
    if (/\d/.test(grouped[caret]!)) remaining -= 1;
  }
  // Next to the digit, not on the far side of a dot: typing goes on right after it.
  while (caret > 0 && !/\d/.test(grouped[caret - 1]!)) caret -= 1;
  return { digits, caret };
}

export const toNumber = (value: string) => (value ? Number(value) : 0);

/** The start of an auction may be this soon at the earliest, and this far at the latest. */
export function startRange(now: number): { min: number; max: number } {
  return {
    min: now + LISTING_AUCTION_MIN_LEAD_MINUTES * 60_000,
    max: now + LISTING_AUCTION_MAX_LEAD_DAYS * 86_400_000,
  };
}

/** A start chosen from the picker is valid inside the range; an unchanged start of an edited listing always is. */
export function isStartValid(
  start: Date | null,
  now: number,
  unchangedFrom?: Date | null
): boolean {
  if (!start) return false;
  if (unchangedFrom && start.getTime() === unchangedFrom.getTime()) return true;
  const { min, max } = startRange(now);
  return start.getTime() >= min && start.getTime() <= max;
}

/** What the posting step has filled in so far. */
export type ListingDraft = {
  itemId: string;
  type: ListingType;
  price: string;
  allowOffers: boolean;
  tradeWants: string;
  increment: string;
  days: 1 | 3 | 7;
  bidderLevel: 1 | 2;
  scheduled: boolean;
  startsAt: Date | null;
  methods: HandoverMethod[];
  note: string;
  area: OnboardingLocation | null;
};

/**
 * The request body for the check and for posting, or null while something required is missing
 * (the "Tiếp: Kiểm tra" button stays off). The server checks everything again.
 */
export function buildListingBody(draft: ListingDraft): ListingRequestBody | null {
  if (draft.methods.length === 0) return null;
  const common = {
    itemId: draft.itemId,
    handoverMethods: HANDOVER_METHODS.filter((method) => draft.methods.includes(method)),
    ...(draft.note.trim() ? { handoverNote: draft.note.trim() } : {}),
    ...(draft.area ? { area: draft.area } : {}),
  };

  if (draft.type === 'sell') {
    const price = toNumber(draft.price);
    if (price < LISTING_PRICE_MIN) return null;
    return { ...common, type: 'sell', price, allowOffers: draft.allowOffers };
  }
  if (draft.type === 'trade') {
    const wants = draft.tradeWants.trim();
    return wants ? { ...common, type: 'trade', tradeWants: wants } : null;
  }
  if (draft.type === 'gift') return { ...common, type: 'gift' };

  const start = toNumber(draft.price);
  const step = toNumber(draft.increment);
  if (start < LISTING_PRICE_MIN || step < LISTING_PRICE_MIN) return null;
  if (draft.scheduled && !draft.startsAt) return null;
  return {
    ...common,
    type: 'auction',
    price: start,
    minIncrement: step,
    durationDays: draft.days,
    minBidderLevel: draft.bidderLevel,
    startsAt: draft.scheduled && draft.startsAt ? draft.startsAt.toISOString() : null,
  };
}

/** The line that sums up the form on the check and done steps. */
export function describeMain(draft: ListingDraft): string {
  switch (draft.type) {
    case 'sell':
      return `${formatVnd(toNumber(draft.price))}${draft.allowOffers ? ' · cho trả giá' : ''}`;
    case 'trade':
      return `Muốn: ${draft.tradeWants.trim()}`;
    case 'gift':
      return 'Miễn phí';
    case 'auction':
      return `Khởi điểm ${formatVnd(toNumber(draft.price))} · ${draft.days} ngày`;
  }
}

/** The days offered on the start picker: today and the next seven, as offsets from today. */
export const START_DAY_OFFSETS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

/** Half-hour slots of a day, in minutes after midnight. */
export const START_SLOTS = Array.from({ length: 48 }, (_, index) => index * 30);

/** Local time `dayOffset` days from `now` at `minutes` after midnight. */
export function composeStart(now: number, dayOffset: number, minutes: number): Date {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  date.setMinutes(minutes);
  return date;
}
