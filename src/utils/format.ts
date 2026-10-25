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
