import type { TransactionDetail } from '@/types/deals';
import { buildTerms, progressSteps } from '../transaction-rules';

function detail(over: Partial<TransactionDetail> = {}): TransactionDetail {
  return {
    id: 't1',
    type: 'sell',
    status: 'in_progress',
    role: 'buyer',
    listing: { id: 'l1', title: 'iPhone 13' },
    item: { id: 'i1', title: 'iPhone 13', coverUrl: null },
    counterItem: null,
    price: 7_000_000,
    tradeWants: null,
    counterpart: { handle: 'nam', name: 'Hoàng Nam', avatarUrl: null },
    inboxId: 'in1',
    handover: { methods: ['meet', 'ship'], note: null },
    step: 2,
    meConfirmed: false,
    themConfirmed: false,
    createdAt: '2026-10-19T08:00:00.000Z',
    completedAt: null,
    review: { mineSent: false, theirsSent: false },
    cancel: null,
    ...over,
  };
}

describe('buildTerms', () => {
  it('names both sides, the price and the handover', () => {
    expect(buildTerms(detail())).toEqual([
      ['Người bán', 'Hoàng Nam'],
      ['Người mua', 'Bạn'],
      ['Giá', '7.000.000đ'],
      ['Giao nhận', 'Trực tiếp · Gửi hàng'],
    ]);
  });

  it('a swap shows both items and what the poster wanted; a gift is free', () => {
    const swap = buildTerms(
      detail({
        type: 'trade',
        role: 'seller',
        counterItem: { id: 'c', title: 'Canon AE-1', coverUrl: null },
        tradeWants: 'Máy ảnh film',
        handover: { methods: ['meet'], note: 'Gặp ở quận 1' },
      })
    );
    expect(swap).toContainEqual(['Người đăng', 'Bạn']);
    expect(swap).toContainEqual(['Đổi', 'iPhone 13 ⇄ Canon AE-1']);
    expect(swap).toContainEqual(['Người đăng muốn', 'Máy ảnh film']);
    expect(swap).toContainEqual(['Ghi chú của người đăng', 'Gặp ở quận 1']);
    expect(buildTerms(detail({ type: 'gift', price: null }))).toContainEqual(['Giá', 'Miễn phí']);
  });
});

describe('progressSteps', () => {
  it('in progress: the first two are done, "Đang giao dịch" is current with who confirmed', () => {
    const steps = progressSteps(detail({ themConfirmed: true }));
    expect(steps.map((s) => s.done)).toEqual([true, true, false, false, false]);
    expect(steps[2]).toMatchObject({ current: true, sub: 'Hoàng Nam đã xác nhận · chờ bạn' });
    expect(steps[3]?.sub).toBe('Cần cả hai bên xác nhận');
    expect(progressSteps(detail({ meConfirmed: true }))[2]?.sub).toBe(
      'Bạn đã xác nhận · chờ Hoàng Nam'
    );
  });

  it('completed: the review is the current step until it is sent', () => {
    const steps = progressSteps(detail({ status: 'completed' }));
    expect(steps.map((s) => s.done)).toEqual([true, true, true, true, false]);
    expect(steps[4]?.current).toBe(true);
    const sent = progressSteps(
      detail({ status: 'completed', review: { mineSent: true, theirsSent: false } })
    );
    expect(sent.every((s) => s.done)).toBe(true);
  });

  it('cancelled: nothing is current and the third step says so', () => {
    const steps = progressSteps(
      detail({
        status: 'cancelled',
        cancel: {
          byMe: true,
          reason: 'changed_mind',
          reasonLabel: 'Tôi đổi ý',
          note: null,
          at: '2026-10-20T08:00:00.000Z',
        },
      })
    );
    expect(steps.some((s) => s.current)).toBe(false);
    expect(steps[2]?.sub).toBe('Đã huỷ');
  });

  it('uses the first two titles of the form', () => {
    expect(
      progressSteps(detail({ type: 'auction' }))
        .slice(0, 2)
        .map((s) => s.title)
    ).toEqual(['Đặt giá', 'Thắng phiên']);
    expect(
      progressSteps(detail({ type: 'gift' }))
        .slice(0, 2)
        .map((s) => s.title)
    ).toEqual(['Đăng ký nhận', 'Người tặng chọn bạn']);
  });
});
