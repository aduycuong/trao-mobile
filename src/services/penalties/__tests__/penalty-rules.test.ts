import type { ActiveCard, AppealState } from '@/types/penalties';
import {
  appealSteps,
  bannerSub,
  blockedCopy,
  cantLines,
  inactiveNote,
  isBlocked,
  penaltyWarning,
} from '../penalty-rules';

const yellow: ActiveCard = {
  id: 'p1',
  kind: 'yellow',
  startsAt: '2026-10-20T03:00:00.000Z',
  endsAt: '2026-11-20T03:00:00.000Z',
};
const red: ActiveCard = { ...yellow, kind: 'red' };

describe('isBlocked', () => {
  it('lets everything through without a card', () => {
    expect(isBlocked(null, 'post')).toBe(false);
    expect(isBlocked(undefined, 'trade')).toBe(false);
  });

  it('a yellow card blocks posting only', () => {
    expect(isBlocked(yellow, 'post')).toBe(true);
    expect(isBlocked(yellow, 'trade')).toBe(false);
  });

  it('a red card blocks posting and trading', () => {
    expect(isBlocked(red, 'post')).toBe(true);
    expect(isBlocked(red, 'trade')).toBe(true);
  });
});

describe('blockedCopy', () => {
  it('post: names the card and the end date, and points to Kho đồ', () => {
    expect(blockedCopy(yellow, 'post')).toEqual({
      title: 'Chưa đăng tin được',
      body: 'Bạn đang bị thẻ Vàng đến 20/11. Trong thời gian này chưa đăng tin mới được, nhưng vẫn thêm đồ vào Kho đồ để đăng sau.',
      cta: 'Thêm vào Kho đồ',
      go: 'stock',
    });
    expect(blockedCopy(red, 'post').body).toContain('thẻ Đỏ đến 20/11');
  });

  it('trade: a red card, points to a message to the poster', () => {
    expect(blockedCopy(red, 'trade')).toEqual({
      title: 'Chưa giao dịch được',
      body: 'Bạn đang bị thẻ Đỏ đến 20/11. Trong thời gian này chưa trả giá, mua, đặt giá, đề nghị đổi hay đăng ký nhận được. Bạn vẫn nhắn tin được.',
      cta: 'Nhắn tin với người đăng',
      go: 'chat',
    });
  });
});

describe('cantLines', () => {
  it('a yellow card has the posting line only', () => {
    expect(cantLines({ kind: 'yellow', effects: null })).toEqual([
      'Đăng tin mới (bán, đấu giá, trao đổi, cho tặng)',
    ]);
  });

  it('a red card adds the hidden listings and declined offers', () => {
    const lines = cantLines({ kind: 'red', effects: { hiddenListings: 3, declinedOffers: 2 } });
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe('3 tin đang đăng tạm ẩn; 2 đề nghị đang chờ đã tự bị từ chối');
  });

  it('a red card with no effects adds nothing', () => {
    expect(
      cantLines({ kind: 'red', effects: { hiddenListings: 0, declinedOffers: 0 } })
    ).toHaveLength(2);
  });
});

describe('copy of the notice', () => {
  it('warns a yellow card about the second one', () => {
    expect(penaltyWarning(yellow)).toBe(
      'Nhận thêm thẻ Vàng trước 20/11 sẽ thành thẻ Đỏ: 1 tháng không giao dịch được.'
    );
    expect(penaltyWarning(red)).toContain('Hết hạn thẻ Đỏ');
  });

  it('says why a card is no longer in force', () => {
    expect(inactiveNote('revoked')).toBe('Thẻ này đã được gỡ.');
    expect(inactiveNote('superseded')).toBe('Thẻ này đã được thay bằng thẻ Đỏ.');
    expect(inactiveNote('expired')).toBe('Thẻ này đã hết hạn.');
  });

  it('describes what Home allows', () => {
    expect(bannerSub('yellow')).toContain('Tạm không đăng tin mới');
    expect(bannerSub('red')).toContain('Tạm không giao dịch');
  });
});

describe('appealSteps', () => {
  const fmt = (iso: string) => `@${iso}`;
  const pending: AppealState = {
    status: 'pending',
    createdAt: 'a',
    dueAt: 'd',
    decidedAt: null,
    response: null,
  };

  it('a pending appeal is being reviewed within 3 working days', () => {
    const steps = appealSteps(pending, fmt);
    expect(steps.map((step) => [step.title, step.done, step.current])).toEqual([
      ['Đã gửi kiến nghị', true, false],
      ['Đang xét', false, true],
      ['Kết quả', false, false],
    ]);
    expect(steps[0]!.detail).toBe('@a');
    expect(steps[1]!.detail).toContain('3 ngày làm việc');
  });

  it('an accepted appeal lifts the card, a rejected one keeps it', () => {
    const accepted = appealSteps(
      { ...pending, status: 'accepted', decidedAt: 'z', response: 'Đủ căn cứ.' },
      fmt
    );
    expect(accepted[1]).toMatchObject({ title: 'Đã xét', detail: '@z', done: true });
    expect(accepted[2]!.detail).toBe('Đã gỡ thẻ. Đủ căn cứ.');
    const rejected = appealSteps({ ...pending, status: 'rejected', decidedAt: 'z' }, fmt);
    expect(rejected[2]!.detail).toBe('Giữ thẻ.');
  });
});
