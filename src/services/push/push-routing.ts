import {
  NOTIFICATION_GROUP_FALLBACK,
  NOTIFICATION_TYPES,
} from '@/services/notifications/notification-rules';

type PushData = {
  type?: unknown;
  inboxId?: unknown;
  listingId?: unknown;
  reportId?: unknown;
  caseId?: unknown;
  penaltyId?: unknown;
  transactionId?: unknown;
  itemId?: unknown;
};

const id = (value: unknown): string | null =>
  typeof value === 'string' && value ? encodeURIComponent(value) : null;

/** Inbox a chat push belongs to, or null for other pushes. */
export function chatInboxIdFromData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const { type, inboxId } = data as PushData;
  return type === 'chat_message' && typeof inboxId === 'string' && inboxId ? inboxId : null;
}

/**
 * Where a tapped push opens, from the `data` the backend sends with it. The ids it carries mirror
 * the places a row of the notification list opens (`routeForNotification`).
 */
export function routeForNotificationData(data: unknown): string | null {
  const inboxId = chatInboxIdFromData(data);
  if (inboxId) return `/chat/${encodeURIComponent(inboxId)}`;
  if (!data || typeof data !== 'object') return null;

  const { listingId, reportId, caseId, penaltyId, transactionId, itemId } = data as PushData;
  // Reports, statements and cards (the notification payload ids).
  if (id(reportId)) return `/reports/${id(reportId)}`;
  if (id(caseId)) return `/cases/${id(caseId)}`;
  if (id(penaltyId)) return `/penalty/${id(penaltyId)}`;
  // A deal that became a transaction, then an item of the stock, then the listing itself.
  if (id(transactionId)) return `/transactions/${id(transactionId)}`;
  if (id(itemId)) return `/stock/${id(itemId)}`;
  // Offers, bids and auction news carry the listing they are about.
  if (id(listingId)) return `/l/${id(listingId)}`;
  return null;
}

/**
 * Maps a path of the web app (`href` of a notification) to the mobile route. Returns null for a
 * path the app has no screen for.
 */
export function routeForWebPath(href: string): string | null {
  const path = href.split(/[?#]/)[0]!.replace(/\/+$/, '');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'app') return null;
  const [, area, first, second] = parts;
  const seg = (value: string | undefined) => (value ? encodeURIComponent(value) : null);

  if (!area) return '/';
  switch (area) {
    case 'l':
      return seg(first) ? `/l/${seg(first)}` : null;
    case 'listings':
      return seg(first) ? `/listings/${seg(first)}` : '/listings';
    case 'stock':
      return seg(first) ? `/stock/${seg(first)}` : '/stock';
    case 'transactions':
      if (!seg(first)) return null;
      return second === 'review'
        ? `/transactions/${seg(first)}/review`
        : `/transactions/${seg(first)}`;
    case 'chat':
      // `/app/chat/item/:listingId` is the web list of the offers on a listing; the owner answers
      // them on the listing page in the app.
      if (first === 'item') return seg(second) ? `/l/${seg(second)}` : '/chat';
      return seg(first) && !second ? `/chat/${seg(first)}` : '/chat';
    case 'u':
      return seg(first) ? `/u/${seg(first)}` : null;
    case 'me':
      return '/me';
    case 'reports':
      return seg(first) ? `/reports/${seg(first)}` : null;
    case 'cases':
      return seg(first) ? `/cases/${seg(first)}` : null;
    case 'penalty':
      return seg(first) ? `/penalty/${seg(first)}` : '/penalty';
    default:
      return null;
  }
}

/**
 * Where a row of the notification list opens: the web path the API sends, translated, or the
 * home of its group when the path is missing or unknown.
 */
export function routeForNotification(item: { type: string; href: string }): string {
  const route = routeForWebPath(item.href);
  if (route) return route;
  const group = NOTIFICATION_TYPES[item.type as keyof typeof NOTIFICATION_TYPES];
  return group ? NOTIFICATION_GROUP_FALLBACK[group] : '/';
}
