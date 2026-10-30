import type { ListingOwnerDetail } from '@/types/listings';
import { describeStatus, describeStatusBar } from '../listing-status';

function detail(overrides: Partial<ListingOwnerDetail>): ListingOwnerDetail {
  return {
    id: 'l1',
    itemId: 'i1',
    type: 'sell',
    status: 'pending_review',
    title: 'iPhone',
    coverUrl: null,
    categorySlug: null,
    priceText: '1.000.000đ',
    rejection: null,
    reviewFailed: false,
    editPending: false,
    closed: null,
    stats: { views: 0, likes: 0, offers: 0 },
    pendingOffers: 0,
    auction: null,
    fields: {
      price: 1_000_000,
      allowOffers: true,
      tradeWants: null,
      minIncrement: null,
      durationDays: null,
      minBidderLevel: null,
      startsAt: null,
      handoverMethods: ['meet'],
      handoverNote: null,
      areaName: null,
    },
    canEdit: true,
    editBlockedReason: null,
    canClose: true,
    closeBlockedReason: null,
    canRefresh: false,
    nextRefreshAt: null,
    canRepost: false,
    repostFrom: null,
    repostBlockedReason: null,
    ...overrides,
  };
}

describe('describeStatus', () => {
  it('says a listing is waiting for review', () => {
    expect(describeStatus(detail({})).title).toBe('Đang chờ duyệt');
  });

  it('shows a rejected draft and a rejected edit of a live listing differently', () => {
    const rejection = { at: '2026-10-30T06:52:00.000Z', errors: [] };
    expect(describeStatus(detail({ status: 'draft', rejection })).title).toBe('Chưa được duyệt');
    expect(describeStatus(detail({ status: 'published', rejection })).title).toBe(
      'Bản sửa chưa được duyệt'
    );
  });

  it('explains why a listing closed', () => {
    const closed = (reason: string, note: string | null = null) =>
      detail({ status: 'closed', closed: { reason, at: '2026-10-18T05:00:00.000Z', note } });
    expect(describeStatus(closed('withdrawn', 'Đã bán ở nơi khác')).sub).toContain(
      'lý do: Đã bán ở nơi khác'
    );
    expect(describeStatus(closed('completed')).title).toBe('Đã hoàn tất');
    expect(describeStatus(closed('removed')).title).toBe('Tin bị gỡ');
  });
});

describe('describeStatusBar', () => {
  it('offers delete and resend for a rejected draft', () => {
    const bar = describeStatusBar(detail({ status: 'draft' }));
    expect(bar.secondary).toMatchObject({ label: 'Xoá tin', danger: true });
    expect(bar.primary.label).toBe('Sửa và gửi lại');
  });

  it('offers repost for a closed listing that can be posted again', () => {
    const closed = detail({
      status: 'closed',
      closed: { reason: 'withdrawn', at: '2026-10-18T05:00:00.000Z', note: null },
      canRepost: true,
    });
    expect(describeStatusBar(closed).primary).toMatchObject({ label: 'Đăng lại', action: 'edit' });
  });

  it('holds an auction repost until it may be opened again', () => {
    const failed = detail({
      status: 'closed',
      closed: { reason: 'auction_failed', at: '2026-10-19T13:00:00.000Z', note: null },
      canRepost: false,
      repostBlockedReason: 'Đấu giá lại được từ 20:00',
    });
    const bar = describeStatusBar(failed);
    expect(bar.primary).toMatchObject({ label: 'Đấu giá lại', disabled: true });
    expect(bar.secondary?.label).toBe('Đăng bán');
    expect(bar.note).toBe('Đấu giá lại được từ 20:00');
  });
});
