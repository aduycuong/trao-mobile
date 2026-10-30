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
