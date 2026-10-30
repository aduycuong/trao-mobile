import type { ListingOwnerDetail } from '@/types/listings';
import { formatClock, formatDayMonth } from '@/utils/format';

export const STATUS_ICON = {
  warn: 'M12 3l9 16H3zM12 10v4M12 17h.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  off: 'M5 12h14',
  check: 'M5 12l5 5 9-10',
  live: 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01',
} as const;

export type StatusCard = {
  title: string;
  sub: string;
  bg: string;
  bd: string;
  ink: string;
  icon: string;
  body: string;
};

const RED = { bg: '#FDF2F0', bd: '#F6D2CC', ink: '#B42318' };
const GREY = { bg: '#F2F5F8', bd: '#E1E7ED', ink: '#33414D' };

/** The card on the status page of a listing (canvas ListingLife): what happened to it and what to do. */
export function describeStatus(detail: ListingOwnerDetail): StatusCard {
  const onMarket = detail.status === 'published' || detail.status === 'scheduled';

  if (detail.rejection && onMarket) {
    return {
      title: 'Bản sửa chưa được duyệt',
      sub: `Kiểm duyệt lúc ${formatClock(detail.rejection.at)}`,
      ...RED,
      icon: STATUS_ICON.warn,
      body: 'Tin vẫn hiện bản đã duyệt trên chợ. Sửa các mục dưới đây rồi gửi lại, Trao duyệt lại trong vài phút.',
    };
  }
  if (detail.rejection) {
    return {
      title: 'Chưa được duyệt',
      sub: `Kiểm duyệt lúc ${formatClock(detail.rejection.at)}`,
      ...RED,
      icon: STATUS_ICON.warn,
      body: 'Tin chưa hiện lên chợ vì vi phạm nguyên tắc tin đăng. Sửa các mục dưới đây rồi gửi lại, Trao duyệt lại trong vài phút.',
    };
  }
  if (detail.status === 'pending_review') {
    return {
      title: 'Đang chờ duyệt',
      sub: 'Trao kiểm tra trong vài phút',
      bg: '#FFF4D6',
      bd: '#F5DE9A',
      ink: '#8A5A00',
      icon: STATUS_ICON.clock,
      body: detail.reviewFailed
        ? 'Chưa kiểm tra tự động được tin này. Trao sẽ xem tay và báo bạn sớm.'
        : 'Duyệt xong tin tự hiện lên chợ và bạn sẽ nhận thông báo. Bạn vẫn sửa được tin trong lúc chờ.',
    };
  }
  if (detail.status === 'draft') {
    // A listing is a draft only after the review rejected it.
    return {
      title: 'Chưa được duyệt',
      sub: 'Cần sửa rồi gửi lại',
      ...RED,
      icon: STATUS_ICON.warn,
      body: 'Tin chưa hiện lên chợ. Sửa lại rồi gửi lại, Trao duyệt lại trong vài phút.',
    };
  }
  if (detail.status === 'closed' && detail.closed) {
    const day = formatDayMonth(new Date(detail.closed.at));
    switch (detail.closed.reason) {
      case 'completed':
        return {
          title: 'Đã hoàn tất',
          sub: day,
          bg: '#E3F4EA',
          bd: '#BFE3CC',
          ink: '#1E6B43',
          icon: STATUS_ICON.check,
          body: 'Giao dịch của tin này đã xong. Món đã sang chủ mới.',
        };
      case 'auction_failed':
        return {
          title: 'Phiên kết thúc · không có lượt đặt',
          sub: `${day} · phiên ${detail.auction?.round ?? 1}/${detail.auction?.maxRounds ?? 5}`,
          ...GREY,
          icon: STATUS_ICON.off,
          body: 'Món đã về Sẵn sàng trong Kho đồ. Bạn có thể đấu giá lại sau 24 giờ (mở lại phiên cũ, tối đa 5 phiên) hoặc đăng hình thức khác ngay.',
        };
      case 'owner_changed':
        return {
          title: 'Món đã đổi chủ',
          sub: day,
          ...GREY,
          icon: STATUS_ICON.off,
          body: 'Món này không còn ở Kho đồ của bạn nên tin đã đóng.',
        };
      case 'removed':
        return {
          title: 'Tin bị gỡ',
          sub: day,
          ...RED,
          icon: STATUS_ICON.warn,
          body: 'Tin bị gỡ do vi phạm nguyên tắc tin đăng.',
        };
      default:
        return {
          title: 'Đã đóng',
          sub: `Bạn đóng ${day}${detail.closed.note ? ` · lý do: ${detail.closed.note}` : ''}`,
          ...GREY,
          icon: STATUS_ICON.off,
          body: 'Món vẫn ở Kho đồ. Đăng lại thì tin được duyệt lại trước khi lên chợ.',
        };
    }
  }
  return {
    title: detail.status === 'scheduled' ? 'Sắp bắt đầu' : 'Đang đăng',
    sub: detail.editPending
      ? 'Bản sửa đang chờ duyệt'
      : detail.status === 'scheduled'
        ? 'Đã duyệt, chờ đến giờ bắt đầu'
        : 'Tin đang hiện trên chợ',
    bg: '#E6F1FF',
    bd: '#C9DDF4',
    ink: '#0B4A99',
    icon: STATUS_ICON.live,
    body: detail.editPending
      ? 'Tin vẫn hiện bản đã duyệt. Duyệt xong bản sửa tự cập nhật và bạn sẽ nhận thông báo.'
      : detail.reviewFailed
        ? 'Chưa kiểm tra tự động được bản sửa. Tin vẫn hiện bản đã duyệt; Trao sẽ xem tay và báo bạn sớm.'
        : 'Mở trang tin để xem, sửa, làm mới hay đóng tin.',
  };
}

export type StatusAction = 'edit' | 'view' | 'delete' | 'sell' | 'back';

export type StatusBar = {
  secondary: { label: string; danger?: boolean; action: StatusAction } | null;
  primary: { label: string; disabled?: boolean; action: StatusAction };
  note: string | null;
};

/** The bottom bar of the status page: a secondary button (optional), a primary one, and a note. */
export function describeStatusBar(detail: ListingOwnerDetail): StatusBar {
  const closed = detail.status === 'closed';
  if (detail.status === 'draft') {
    return {
      secondary: { label: 'Xoá tin', danger: true, action: 'delete' },
      primary: { label: 'Sửa và gửi lại', action: 'edit' },
      note: null,
    };
  }
  if (detail.status === 'pending_review') {
    return { secondary: null, primary: { label: 'Sửa tin', action: 'edit' }, note: null };
  }
  if ((detail.status === 'published' || detail.status === 'scheduled') && detail.rejection) {
    // An edit that was not approved: fix it and send it again.
    return {
      secondary: null,
      primary: { label: 'Sửa và gửi lại', disabled: !detail.canEdit, action: 'edit' },
      note: detail.canEdit ? null : detail.editBlockedReason,
    };
  }
  if (detail.status === 'published' || detail.status === 'scheduled') {
    return { secondary: null, primary: { label: 'Xem tin', action: 'view' }, note: null };
  }
  if (closed && detail.closed?.reason === 'auction_failed') {
    return {
      secondary: { label: 'Đăng bán', action: 'sell' },
      primary: { label: 'Đấu giá lại', disabled: !detail.canRepost, action: 'edit' },
      note: detail.canRepost ? null : detail.repostBlockedReason,
    };
  }
  if (closed && detail.canRepost) {
    return { secondary: null, primary: { label: 'Đăng lại', action: 'edit' }, note: null };
  }
  return { secondary: null, primary: { label: 'Quay lại', action: 'back' }, note: null };
}
