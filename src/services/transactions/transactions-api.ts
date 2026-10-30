import { apiRequest } from '@/services/api';
import type { TransactionCancelReason, TransactionDetail } from '@/types/deals';

export const transactionKey = (id: string, uid: string | undefined) =>
  ['transactions', id, uid ?? null] as const;

export function fetchTransaction(token: string, id: string): Promise<TransactionDetail> {
  return apiRequest(`/api/transactions/${encodeURIComponent(id)}`, { token });
}

export function confirmTransactionRequest(
  token: string,
  id: string
): Promise<{ completed: boolean }> {
  return apiRequest(`/api/transactions/${encodeURIComponent(id)}/confirm`, {
    token,
    method: 'POST',
  });
}

export async function cancelTransactionRequest(
  token: string,
  id: string,
  body: { reason: TransactionCancelReason; note?: string }
): Promise<void> {
  await apiRequest(`/api/transactions/${encodeURIComponent(id)}/cancel`, {
    token,
    body: { ...body, acknowledged: true },
  });
}
