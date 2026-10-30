import {
  formatClipDuration,
  formatCountdown,
  formatEventTime,
  formatRelativeTime,
} from '../format';

describe('formatCountdown', () => {
  it('shows hours, minutes and seconds', () => {
    expect(formatCountdown(((1 * 60 + 24) * 60 + 10) * 1000)).toBe('01:24:10');
  });

  it('puts days in front when more than a day is left', () => {
    expect(formatCountdown((2 * 86_400 + 3600) * 1000)).toBe('2 ngày 01:00:00');
  });

  it('never goes below zero', () => {
    expect(formatCountdown(-5000)).toBe('00:00:00');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-30T10:00:00Z').getTime();

  it('speaks in minutes, hours and days within a week', () => {
    expect(formatRelativeTime(new Date(now - 20_000), now)).toBe('Vừa xong');
    expect(formatRelativeTime(new Date(now - 5 * 60_000), now)).toBe('5 phút trước');
    expect(formatRelativeTime(new Date(now - 3 * 3_600_000), now)).toBe('3 giờ trước');
    expect(formatRelativeTime(new Date(now - 2 * 86_400_000), now)).toBe('2 ngày trước');
  });

  it('falls back to the date after a week', () => {
    expect(formatRelativeTime(new Date(now - 10 * 86_400_000), now)).toBe('20/10');
  });
});

describe('formatEventTime', () => {
  it('uses Vietnam time', () => {
    expect(formatEventTime('2026-10-16T02:12:00.000Z')).toBe('16/10 · 09:12');
  });
});

describe('formatClipDuration', () => {
  it('pads the seconds', () => {
    expect(formatClipDuration(8000)).toBe('0:08');
  });
});
