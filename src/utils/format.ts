import type { MyProfileWarning } from '@/types/profile';

/** `20/11` in Vietnam time. */
export function formatDayMonth(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return `${parts.day}/${parts.month}`;
}

/** `20/11/2026` in Vietnam time. */
export function formatUpdatedDate(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(iso));
}

/** "Không có", or "Thẻ Vàng · đến 20/11" for the card the user is under. */
export function formatWarning(warning: MyProfileWarning | null): string {
  if (!warning) return 'Không có';
  const card = warning.kind === 'red' ? 'Thẻ Đỏ' : 'Thẻ Vàng';
  return warning.endsAt ? `${card} · đến ${formatDayMonth(new Date(warning.endsAt))}` : card;
}

/** `Minh Anh` → `MA`; one word gives one letter; no name gives `?`. */
export function getInitials(name: string | null | undefined): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return '?';
  const first = words[0]!;
  const last = words.length > 1 ? words[words.length - 1]! : '';
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export const ACTIVITY_LEVEL_LABELS = {
  daily: 'Liên tục',
  regular: 'Thường xuyên',
  occasional: 'Không thường xuyên',
} as const;

/** `7500000` → `7.500.000đ`. */
export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
}

/** Length of a clip: `9000` → `0:09`. */
export function formatClipDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Time left in an auction: "3g 20p", "1 ngày", or "Đã kết thúc". */
export function formatTimeLeft(endsAt: string, now: number): string {
  const minutes = Math.floor((new Date(endsAt).getTime() - now) / 60_000);
  if (minutes <= 0) return 'Đã kết thúc';
  if (minutes >= 24 * 60) return `${Math.floor(minutes / (24 * 60))} ngày`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}g ${minutes % 60}p`;
  return `${minutes} phút`;
}

const eventTime = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Ho_Chi_Minh',
});

/** `16/10 · 09:12` in Vietnam time. */
export function formatEventTime(iso: string): string {
  const parts = Object.fromEntries(
    eventTime.formatToParts(new Date(iso)).map((part) => [part.type, part.value])
  );
  return `${parts.day}/${parts.month} · ${parts.hour}:${parts.minute}`;
}

/** `01:24:10`, with days in front when more than a day is left. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86_400);
  const rest = total % 86_400;
  const pad = (n: number) => String(n).padStart(2, '0');
  const clock = `${pad(Math.floor(rest / 3600))}:${pad(Math.floor((rest % 3600) / 60))}:${pad(rest % 60)}`;
  return days > 0 ? `${days} ngày ${clock}` : clock;
}

/** `20:00` in Vietnam time. */
export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(iso));
}

/** "Vừa xong", "5 phút trước", "2 ngày trước", or the date after a week. */
export function formatRelativeTime(value: string | Date, now = Date.now()): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '';
  const seconds = Math.floor((now - time) / 1000);
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  const date = new Date(time);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  const sameYear = Number(parts.year) === new Date(now).getFullYear();
  return sameYear ? `${parts.day}/${parts.month}` : `${parts.day}/${parts.month}/${parts.year}`;
}

/** "3g 20p" until `end`, or null once it has passed (banner and chat-list copy). */
export function describeTimeLeft(end: Date, now = new Date()): string | null {
  const minutes = Math.floor((end.getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return null;
  if (minutes < 60) return `${minutes}p`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}g ${String(minutes % 60).padStart(2, '0')}p`;
  return `${Math.floor(hours / 24)} ngày ${hours % 24}g`;
}
