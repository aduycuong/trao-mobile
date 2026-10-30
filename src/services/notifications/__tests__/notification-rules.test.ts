import type { NotificationItem } from '@/types/notifications';
import {
  countsAfterRead,
  defaultNotificationSettings,
  formatNotificationTime,
  groupNotificationsByDay,
  NOTIFICATION_FILTERS,
  NOTIFICATION_SETTING_GROUPS,
  NOTIFICATION_TYPES,
} from '../notification-rules';

// 30/10/2026 15:00 in Vietnam (UTC+7).
const NOW = Date.parse('2026-10-30T08:00:00Z');

const item = (id: string, createdAt: string, extra: Partial<NotificationItem> = {}) =>
  ({
    id,
    type: 'bid_outbid',
    group: 'deal',
    title: 't',
    text: 'x',
    createdAt,
    read: false,
    href: '/app',
    cta: null,
    visual: { kind: 'sys', background: '#fff', ink: '#000', icon: 'M0 0' },
    ...extra,
  }) as NotificationItem;

describe('NOTIFICATION_TYPES', () => {
  it('puts every type in one of the four groups', () => {
    const groups = new Set(Object.values(NOTIFICATION_TYPES));
    expect([...groups].sort()).toEqual(['account', 'deal', 'mine', 'watch']);
    expect(Object.keys(NOTIFICATION_TYPES)).toHaveLength(40);
  });

  it('has a chip for every group, "Tất cả" first', () => {
    expect(NOTIFICATION_FILTERS.map(([id]) => id)).toEqual([
      'all',
      'deal',
      'mine',
      'watch',
      'account',
    ]);
  });
});

describe('groupNotificationsByDay', () => {
  it('splits today, yesterday and before, in Vietnam time', () => {
    const sections = groupNotificationsByDay(
      [
        item('a', '2026-10-30T07:55:00Z'),
        // 00:30 on the 30th in Vietnam, still 17:30 on the 29th in UTC.
        item('b', '2026-10-29T17:30:00Z'),
        item('c', '2026-10-29T10:00:00Z'),
        item('d', '2026-10-21T10:00:00Z'),
      ],
      NOW
    );
    expect(sections.map((section) => [section.title, section.rows.map((row) => row.id)])).toEqual([
      ['Hôm nay', ['a', 'b']],
      ['Hôm qua', ['c']],
      ['Trước đó', ['d']],
    ]);
  });

  it('leaves out empty sections', () => {
    expect(groupNotificationsByDay([], NOW)).toEqual([]);
    expect(
      groupNotificationsByDay([item('d', '2026-10-01T00:00:00Z')], NOW).map((s) => s.title)
    ).toEqual(['Trước đó']);
  });
});

describe('formatNotificationTime', () => {
  it('counts minutes and hours today', () => {
    expect(formatNotificationTime('2026-10-30T07:55:00Z', NOW)).toBe('5 phút');
    expect(formatNotificationTime('2026-10-30T08:00:00Z', NOW)).toBe('1 phút');
    expect(formatNotificationTime('2026-10-30T05:00:00Z', NOW)).toBe('3 giờ');
  });

  it('shows the clock for yesterday and the date before', () => {
    expect(formatNotificationTime('2026-10-29T13:00:00Z', NOW)).toBe('Hôm qua · 20:00');
    expect(formatNotificationTime('2026-10-21T10:00:00Z', NOW)).toBe('21/10');
    expect(formatNotificationTime('2025-12-01T10:00:00Z', NOW)).toBe('01/12/2025');
  });
});

describe('countsAfterRead', () => {
  const counts = { all: 5, deal: 3, mine: 1, watch: 1, account: 0 };

  it('drops the total and the group of the notification', () => {
    expect(countsAfterRead(counts, { group: 'deal', read: false })).toEqual({
      ...counts,
      all: 4,
      deal: 2,
    });
  });

  it('keeps the counts for one already read', () => {
    expect(countsAfterRead(counts, { group: 'deal', read: true })).toBe(counts);
  });

  it('never goes below zero and clears everything for "read all"', () => {
    expect(countsAfterRead(counts, { group: 'account', read: false }).account).toBe(0);
    expect(countsAfterRead(counts)).toEqual({ all: 0, deal: 0, mine: 0, watch: 0, account: 0 });
  });
});

describe('notification settings', () => {
  it('defaults to on, except "Người bạn follow"', () => {
    const defaults = defaultNotificationSettings();
    expect(defaults.following).toBe(false);
    const others = Object.entries(defaults).filter(([id]) => id !== 'following');
    expect(others).toHaveLength(9);
    expect(others.every(([, on]) => on)).toBe(true);
  });

  it('shows the always-on card, report and appeal switch locked and nothing else', () => {
    const rows = NOTIFICATION_SETTING_GROUPS.flatMap((group) => group.rows);
    expect(rows.filter((row) => row.locked).map((row) => row.id)).toEqual(['safety']);
    // Every stored switch has a row.
    expect(
      rows
        .filter((row) => !row.locked)
        .map((row) => row.id)
        .sort()
    ).toEqual(Object.keys(defaultNotificationSettings()).sort());
  });

  it('keeps the four groups in the order of the canvas', () => {
    expect(NOTIFICATION_SETTING_GROUPS.map((group) => group.title)).toEqual([
      'Giao dịch',
      'Tin đăng',
      'Quan tâm',
      'Tài khoản',
    ]);
  });
});
