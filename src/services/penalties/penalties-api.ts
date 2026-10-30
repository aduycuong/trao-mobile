import { apiRequest } from '@/services/api';
import type { ActiveCard, PenaltyDetail } from '@/types/penalties';

export const activeCardKey = (uid: string | undefined) =>
  ['penalties', 'active', uid ?? null] as const;
export const penaltyKey = (id: string, uid: string | undefined) =>
  ['penalty', id, uid ?? null] as const;

export function fetchActiveCard(token: string): Promise<{ card: ActiveCard | null }> {
  return apiRequest('/api/penalties/active', { token });
}

export function fetchPenalty(token: string, id: string): Promise<PenaltyDetail> {
  return apiRequest(`/api/penalties/${encodeURIComponent(id)}`, { token });
}

export function submitAppealRequest(
  token: string,
  id: string,
  body: { reason: string; evidenceKeys: string[] }
): Promise<{ id: string; dueAt: string }> {
  return apiRequest(`/api/penalties/${encodeURIComponent(id)}/appeal`, {
    token,
    method: 'POST',
    body,
  });
}
