export const REVIEW_COMMENT_MAX_LENGTH = 500;
/** Rating at or above this picks from the praise criteria, below it from the complaints. */
export const REVIEW_GOOD_FROM_STARS = 4;
/** At or below this the review suggests sending a report instead. */
export const REVIEW_REPORT_HINT_UP_TO_STARS = 2;
export const REVIEW_RATE_LABELS = ['', 'Rất tệ', 'Chưa ổn', 'Bình thường', 'Tốt', 'Tuyệt vời'];
export const REVIEW_STAR_PATH =
  'M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z';

export const isPraise = (rating: number) => rating >= REVIEW_GOOD_FROM_STARS;

/** Color of the rating word: grey before a pick, green for good, amber for 3, red below. */
export function rateColor(rating: number): string {
  if (rating === 0) return '#A3AEB9';
  if (isPraise(rating)) return '#1E6B43';
  return rating === 3 ? '#8A5A00' : '#B42318';
}

/**
 * Picked criteria after the rating changes: praise and complaints are different lists, so a pick
 * made under the other list no longer applies.
 */
export function criteriaAfterRating(previous: number, next: number, picked: string[]): string[] {
  if (previous !== 0 && isPraise(next) !== isPraise(previous)) return [];
  return picked;
}

export function canSubmitReview(rating: number): boolean {
  return rating >= 1 && rating <= 5;
}

export function reviewPlaceholder(role: 'buyer' | 'seller', type: string): string {
  return role === 'seller'
    ? `Chia sẻ thêm về ${type === 'gift' ? 'người nhận' : 'người mua'} để người khác tham khảo…`
    : `Chia sẻ thêm về món và ${type === 'gift' ? 'người tặng' : 'người bán'} để người khác tham khảo…`;
}
