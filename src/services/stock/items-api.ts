import { apiRequest } from '@/services/api';
import type {
  CreateItemBody,
  ItemDetail,
  ListMyItemsResult,
  PreviewItemContent,
} from '@/types/stock';

export const MY_ITEMS_QUERY_KEY = ['items'] as const;
export const MY_TAGS_QUERY_KEY = ['items', 'tags'] as const;
export const itemQueryKey = (id: string, uid: string | undefined) =>
  ['item', id, uid ?? null] as const;

export function fetchMyItems(
  token: string,
  params: { tag?: string; keyword?: string; offset: number; limit?: number }
): Promise<ListMyItemsResult> {
  const query = new URLSearchParams({ offset: String(params.offset) });
  if (params.limit) query.set('limit', String(params.limit));
  if (params.tag) query.set('tag', params.tag);
  if (params.keyword) query.set('keyword', params.keyword);
  return apiRequest<ListMyItemsResult>(`/api/items?${query}`, { token });
}

export function fetchMyItem(token: string, id: string): Promise<ItemDetail> {
  return apiRequest<ItemDetail>(`/api/items/${encodeURIComponent(id)}`, { token });
}

export function fetchMyTags(token: string) {
  return apiRequest<{ tags: { tag: string; color: string; count: number }[] }>('/api/items/tags', {
    token,
  });
}

/** What the LLM makes of a description; nothing is saved. 422 when it cannot read it. */
export function previewItem(
  token: string,
  body: { description: string; condition: string }
): Promise<PreviewItemContent> {
  return apiRequest<PreviewItemContent>('/api/items/preview', { token, body });
}

export function createMyItem(token: string, body: CreateItemBody): Promise<{ id: string }> {
  return apiRequest<{ id: string }>('/api/items', { token, body });
}

export function updateMyItem(
  token: string,
  id: string,
  body: Partial<CreateItemBody>
): Promise<{ id: string; version?: number }> {
  return apiRequest(`/api/items/${encodeURIComponent(id)}`, { token, method: 'PATCH', body });
}

export function deleteMyItem(token: string, id: string): Promise<{ deleted: true }> {
  return apiRequest(`/api/items/${encodeURIComponent(id)}`, { token, method: 'DELETE' });
}

export function saveItemNote(token: string, id: string, note: string): Promise<{ saved: true }> {
  return apiRequest(`/api/items/${encodeURIComponent(id)}/note`, {
    token,
    method: 'PUT',
    body: { note },
  });
}
