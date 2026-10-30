import { apiRequest } from '@/services/api';
import type { MyCase } from '@/types/reports';

export const caseKey = (id: string, uid: string | undefined) => ['case', id, uid ?? null] as const;

export function fetchMyCase(token: string, id: string): Promise<MyCase> {
  return apiRequest(`/api/cases/${encodeURIComponent(id)}`, { token });
}

export async function submitStatementRequest(
  token: string,
  id: string,
  body: { body: string; evidenceKeys: string[] }
): Promise<void> {
  await apiRequest(`/api/cases/${encodeURIComponent(id)}/statement`, {
    token,
    method: 'POST',
    body,
  });
}
