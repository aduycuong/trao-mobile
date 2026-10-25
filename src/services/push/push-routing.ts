type PushData = { type?: unknown; inboxId?: unknown };

/** Inbox a chat push belongs to, or null for other pushes. */
export function chatInboxIdFromData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const { type, inboxId } = data as PushData;
  return type === 'chat_message' && typeof inboxId === 'string' && inboxId ? inboxId : null;
}

/** Where a tapped notification opens, from the `data` the backend sends with the push. */
export function routeForNotificationData(data: unknown): string | null {
  const inboxId = chatInboxIdFromData(data);
  return inboxId ? `/chat/${encodeURIComponent(inboxId)}` : null;
}
