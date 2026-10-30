export const NOTIFICATION_GROUPS = ['deal', 'mine', 'watch', 'account'] as const;

export type NotificationGroup = (typeof NOTIFICATION_GROUPS)[number];

/** The picture at the left of a row: the listing's photo, the other person's initials, or an icon. */
export type NotificationVisual =
  | { kind: 'item'; coverUrl: string | null; categorySlug: string | null }
  | { kind: 'person'; name: string | null }
  | { kind: 'sys'; background: string; ink: string; icon: string };

export type NotificationCta = { label: string; tone: 'primary' | 'warn' | 'ghost' };

export type NotificationItem = {
  id: string;
  type: string;
  group: NotificationGroup;
  title: string;
  text: string;
  /** ISO time. */
  createdAt: string;
  read: boolean;
  /** Where it opens, a path of the web app (`/app/l/:id`); see `routeForNotification`. */
  href: string;
  /** The button for the main job, when there is one. */
  cta: NotificationCta | null;
  visual: NotificationVisual;
};

export type NotificationUnreadCounts = Record<'all' | NotificationGroup, number>;

export type NotificationsPage = {
  items: NotificationItem[];
  nextCursor: string | null;
};

/** Ids of the push switches stored by the backend (`notification_preferences`). */
export const NOTIFICATION_SETTING_IDS = [
  'bid',
  'offer',
  'reminder',
  'review',
  'listing_review',
  'comment',
  'my_auction',
  'liked_listing',
  'following',
  'reward',
] as const;

export type NotificationSettingId = (typeof NOTIFICATION_SETTING_IDS)[number];

export type NotificationSettings = Record<NotificationSettingId, boolean>;
