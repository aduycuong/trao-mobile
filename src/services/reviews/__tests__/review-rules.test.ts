import {
  canSubmitReview,
  criteriaAfterRating,
  isPraise,
  rateColor,
  reviewPlaceholder,
} from '../review-rules';

describe('isPraise', () => {
  it('4 and 5 stars pick praise, 1 to 3 pick complaints', () => {
    expect([1, 2, 3, 4, 5].map(isPraise)).toEqual([false, false, false, true, true]);
  });
});

describe('criteriaAfterRating', () => {
  it('keeps the picks within the same group', () => {
    expect(criteriaAfterRating(4, 5, ['on_time'])).toEqual(['on_time']);
    expect(criteriaAfterRating(1, 3, ['late'])).toEqual(['late']);
  });

  it('drops the picks when the rating crosses between praise and complaints', () => {
    expect(criteriaAfterRating(5, 3, ['on_time'])).toEqual([]);
    expect(criteriaAfterRating(2, 4, ['late'])).toEqual([]);
  });

  it('keeps nothing special on the first pick', () => {
    expect(criteriaAfterRating(0, 5, [])).toEqual([]);
  });
});

describe('canSubmitReview', () => {
  it('needs a rating of 1 to 5', () => {
    expect([0, 1, 5, 6].map(canSubmitReview)).toEqual([false, true, true, false]);
  });
});

describe('rateColor and placeholder', () => {
  it('colors the word by rating', () => {
    expect(rateColor(0)).toBe('#A3AEB9');
    expect(rateColor(5)).toBe('#1E6B43');
    expect(rateColor(3)).toBe('#8A5A00');
    expect(rateColor(1)).toBe('#B42318');
  });

  it('asks about the other side by role and form', () => {
    expect(reviewPlaceholder('seller', 'sell')).toContain('người mua');
    expect(reviewPlaceholder('seller', 'gift')).toContain('người nhận');
    expect(reviewPlaceholder('buyer', 'sell')).toContain('người bán');
    expect(reviewPlaceholder('buyer', 'gift')).toContain('người tặng');
  });
});
