import { formatVnd } from '@/utils/format';

export const LISTING_PRICE_MIN = 1000;

/** Error under the price box of "Trả giá", or null: below the listed price, and at least the minimum. */
export function priceOfferError(digits: string, listed: number): string | null {
  if (digits === '') return null;
  const amount = Number(digits);
  if (amount >= listed) return 'Giá trả phải thấp hơn giá đăng.';
  if (amount < LISTING_PRICE_MIN) return `Tối thiểu ${formatVnd(LISTING_PRICE_MIN)}.`;
  return null;
}

/** Quick price picks: 95, 90 and 85 percent of the listed price, rounded down to thousands. */
export function priceSuggestions(listed: number): number[] {
  if (listed <= 0) return [];
  return [0.95, 0.9, 0.85]
    .map((rate) => Math.floor((listed * rate) / 1000) * 1000)
    .filter((value) => value >= LISTING_PRICE_MIN && value < listed);
}

/** Quick reasons the owner can pick when declining. */
export const DEAL_DECLINE_REASONS = ['Giá thấp quá', 'Đã có người mua', 'Không bán nữa'] as const;
export const DEAL_DECLINE_REASON_MAX_LENGTH = 200;
