type PushData = { type?: unknown; inboxId?: unknown; listingId?: unknown };

/** Inbox a chat push belongs to, or null for other pushes. */
export function chatInboxIdFromData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const { type, inboxId } = data as PushData;
  return type === 'chat_message' && typeof inboxId === 'string' && inboxId ? inboxId : null;
}

/** Where a tapped notification opens, from the `data` the backend sends with the push. */
export function routeForNotificationData(data: unknown): string | null {
  const inboxId = chatInboxIdFromData(data);
  if (inboxId) return `/chat/${encodeURIComponent(inboxId)}`;
  // Offers, bids and auction news carry the listing they are about.
  if (data && typeof data === 'object') {
    const { listingId } = data as PushData;
    if (typeof listingId === 'string' && listingId) return `/l/${encodeURIComponent(listingId)}`;
  }
  return null;
}
