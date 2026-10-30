import { apiRequest } from '@/services/api';
import type {
  NotificationGroup,
  NotificationSettings,
  NotificationsPage,
  NotificationUnreadCounts,
} from '@/types/notifications';

export const NOTIFICATIONS_KEY = ['notifications'] as const;
export const notificationsListKey = (uid: string | undefined, group: NotificationGroup | 'all') =>
  ['notifications', 'list', uid ?? null, group] as const;
export const unreadNotificationsKey = (uid: string | undefined) =>
  ['notifications', 'unread', uid ?? null] as const;
export const notificationSettingsKey = (uid: string | undefined) =>
  ['me', 'notification-settings', uid ?? null] as const;

export function fetchNotifications(
  token: string,
  params: { group?: NotificationGroup; cursor?: string }
): Promise<NotificationsPage> {
  const query = new URLSearchParams();
  if (params.group) query.set('group', params.group);
  if (params.cursor) query.set('cursor', params.cursor);
  const suffix = query.toString();
  return apiRequest(`/api/me/notifications${suffix ? `?${suffix}` : ''}`, { token });
}

export function fetchUnreadNotifications(token: string): Promise<NotificationUnreadCounts> {
  return apiRequest('/api/me/notifications/unread', { token });
}

/** Marks one notification read, or all of them when no id is given. */
export async function markNotificationsReadRequest(token: string, id?: string): Promise<void> {
  await apiRequest('/api/me/notifications/read', {
    token,
    method: 'POST',
    body: id ? { id } : {},
  });
}

export function fetchNotificationSettings(token: string): Promise<NotificationSettings> {
  return apiRequest('/api/me/notification-settings', { token });
}

export async function patchNotificationSettings(
  token: string,
  settings: Partial<NotificationSettings>
): Promise<void> {
  await apiRequest('/api/me/notification-settings', {
    token,
    method: 'PATCH',
    body: { settings },
  });
}
