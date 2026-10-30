import {
  NOTIFICATION_SETTING_IDS,
  type NotificationGroup,
  type NotificationItem,
  type NotificationSettingId,
  type NotificationSettings,
  type NotificationUnreadCounts,
} from '@/types/notifications';

/** Every type the list shows, with its group (mirrors `NOTIFICATION_TYPES` of the web app). */
export const NOTIFICATION_TYPES = {
  // Giao dịch
  bid_outbid: 'deal',
  bid_ending_soon: 'deal',
  bid_won: 'deal',
  bid_lost: 'deal',
  bid_offered: 'deal',
  deal_offer_received: 'deal',
  deal_offer_withdrawn: 'deal',
  deal_offer_accepted: 'deal',
  deal_offer_declined: 'deal',
  offer_auto_declined: 'deal',
  transaction_confirmed: 'deal',
  transaction_completed: 'deal',
  transaction_cancelled: 'deal',
  transaction_reminder: 'deal',
  review_received: 'deal',
  review_waiting: 'deal',
  review_reminder: 'deal',
  // Tin đăng
  listing_approved: 'mine',
  listing_rejected: 'mine',
  listing_edit_dropped: 'mine',
  listing_hidden: 'mine',
  item_media_removed: 'mine',
  my_auction_ended: 'mine',
  my_auction_failed: 'mine',
  my_auction_bid: 'mine',
  listing_comment: 'mine',
  // Quan tâm
  liked_listing_price: 'watch',
  liked_listing_closed: 'watch',
  followee_listing: 'watch',
  liked_listing_comment: 'watch',
  comment_reply: 'watch',
  // Tài khoản
  reward_received: 'account',
  reward_revoked: 'account',
  report_resolved: 'account',
  case_statement_requested: 'account',
  case_decided: 'account',
  penalty_issued: 'account',
  penalty_revoked: 'account',
  appeal_decided: 'account',
  violation_notice: 'account',
} as const satisfies Record<string, NotificationGroup>;

export type NotificationType = keyof typeof NOTIFICATION_TYPES;

export const NOTIFICATION_TYPE_LIST = Object.keys(NOTIFICATION_TYPES) as NotificationType[];

export type NotificationFilter = 'all' | NotificationGroup;

export const NOTIFICATION_FILTERS: [NotificationFilter, string][] = [
  ['all', 'Tất cả'],
  ['deal', 'Giao dịch'],
  ['mine', 'Tin đăng'],
  ['watch', 'Quan tâm'],
  ['account', 'Tài khoản'],
];

/** The small round mark on the corner of the picture, by group (canvas Notifs `TAG`). */
export const NOTIFICATION_TAG: Record<NotificationGroup, { color: string; icon: string }> = {
  deal: { color: '#1673D9', icon: 'M7 7h11l-3-3M17 17H6l3 3' },
  mine: { color: '#7A4BA6', icon: 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01' },
  watch: {
    color: '#F0533A',
    icon: 'M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z',
  },
  account: { color: '#2F9E63', icon: 'M12 3l7 3v6c0 4-3 7.5-7 9-4-1.5-7-5-7-9V6z' },
};

/** Background and text color of the quick-action button, by tone (canvas Notifs `CTA`). */
export const NOTIFICATION_CTA_TONE = {
  primary: { background: '#1673D9', color: '#FFFFFF' },
  warn: { background: '#FDE7E4', color: '#B42318' },
  ghost: { background: '#F1F7FE', color: '#1673D9' },
} as const;

/** Where the list falls back to when a path is missing or unknown, by group. */
export const NOTIFICATION_GROUP_FALLBACK: Record<NotificationGroup, string> = {
  deal: '/chat',
  mine: '/listings',
  watch: '/',
  account: '/me',
};

// ---------------------------------------------------------------- day sections

export type NotificationSection = { title: string; rows: NotificationItem[] };

/** `2026-10-30` in Vietnam time. */
function dayKey(time: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(time));
}

const DAY_MS = 86_400_000;

/** "Hôm nay" · "Hôm qua" · "Trước đó", empty sections left out. */
export function groupNotificationsByDay(
  items: NotificationItem[],
  now: number
): NotificationSection[] {
  const today = dayKey(now);
  const yesterday = dayKey(now - DAY_MS);
  const sections: NotificationSection[] = [
    { title: 'Hôm nay', rows: [] },
    { title: 'Hôm qua', rows: [] },
    { title: 'Trước đó', rows: [] },
  ];
  for (const item of items) {
    const key = dayKey(new Date(item.createdAt).getTime());
    sections[key === today ? 0 : key === yesterday ? 1 : 2]!.rows.push(item);
  }
  return sections.filter((section) => section.rows.length > 0);
}

const HOUR_MIN = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** "5 phút", "3 giờ" today; "Hôm qua · 20:00"; "21/10" before that, with the year in other years. */
export function formatNotificationTime(iso: string, now: number): string {
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return '';
  const key = dayKey(at);
  if (key === dayKey(now)) {
    const minutes = Math.max(1, Math.floor((now - at) / 60_000));
    return minutes < 60 ? `${minutes} phút` : `${Math.floor(minutes / 60)} giờ`;
  }
  if (key === dayKey(now - DAY_MS)) return `Hôm qua · ${HOUR_MIN.format(new Date(at))}`;
  const [year, month, day] = key.split('-');
  return year === dayKey(now).slice(0, 4) ? `${day}/${month}` : `${day}/${month}/${year}`;
}

// ---------------------------------------------------------------- unread counts

/** The counts after one notification (or all of them, without `item`) was marked read. */
export function countsAfterRead(
  counts: NotificationUnreadCounts,
  item?: Pick<NotificationItem, 'group' | 'read'>
): NotificationUnreadCounts {
  if (!item) return { all: 0, deal: 0, mine: 0, watch: 0, account: 0 };
  if (item.read) return counts;
  return {
    ...counts,
    all: Math.max(0, counts.all - 1),
    [item.group]: Math.max(0, counts[item.group] - 1),
  };
}

// ---------------------------------------------------------------- settings

export type NotificationSettingRow = {
  id: NotificationSettingId | 'safety';
  label: string;
  sub: string;
  locked?: boolean;
};

/** The switches of "Cài đặt thông báo" (copy of `NOTIFICATION_SETTING_GROUPS` of the web app). */
export const NOTIFICATION_SETTING_GROUPS: { title: string; rows: NotificationSettingRow[] }[] = [
  {
    title: 'Giao dịch',
    rows: [
      { id: 'bid', label: 'Đấu giá', sub: 'Bị vượt giá, phiên sắp kết thúc, thắng / thua phiên' },
      {
        id: 'offer',
        label: 'Đề nghị',
        sub: 'Có người trả giá, mua, đổi hoặc đăng ký nhận; đề nghị của bạn được trả lời',
      },
      {
        id: 'reminder',
        label: 'Nhắc xác nhận và đánh giá',
        sub: 'Sau giao nhận, khi bên kia đã xác nhận, đánh giá sắp hết hạn',
      },
      { id: 'review', label: 'Đánh giá mới', sub: 'Khi đánh giá của hai bên được hiện' },
    ],
  },
  {
    title: 'Tin đăng',
    rows: [
      { id: 'listing_review', label: 'Kết quả duyệt tin', sub: 'Tin lên chợ hoặc chưa được duyệt' },
      {
        id: 'comment',
        label: 'Bình luận',
        sub: 'Bình luận và trả lời trên tin của bạn, trả lời bình luận của bạn',
      },
      {
        id: 'my_auction',
        label: 'Phiên đấu giá của bạn',
        sub: 'Có lượt đặt mới, phiên kết thúc, người thắng bỏ ngang',
      },
    ],
  },
  {
    title: 'Quan tâm',
    rows: [
      { id: 'liked_listing', label: 'Tin bạn thích', sub: 'Giảm giá, đóng tin, có bình luận mới' },
      { id: 'following', label: 'Người bạn follow', sub: 'Đăng tin mới' },
    ],
  },
  {
    title: 'Tài khoản',
    rows: [
      { id: 'reward', label: 'Tiền thưởng', sub: 'Nhận tiền thưởng' },
      { id: 'safety', label: 'Thẻ phạt, báo cáo, kiến nghị', sub: 'Luôn gửi', locked: true },
    ],
  },
];

/** Off until the user turns them on. */
const DEFAULT_OFF: readonly NotificationSettingId[] = ['following'];

/** What the backend answers for a user who chose nothing: on, except "Người bạn follow". */
export function defaultNotificationSettings(): NotificationSettings {
  return Object.fromEntries(
    NOTIFICATION_SETTING_IDS.map((id) => [id, !DEFAULT_OFF.includes(id)])
  ) as NotificationSettings;
}
