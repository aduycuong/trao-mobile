import { apiRequest } from '@/services/api';
import type { ReviewContext, SubmitReviewResult } from '@/types/deals';

export function fetchReviewContext(token: string, transactionId: string): Promise<ReviewContext> {
  return apiRequest(`/api/transactions/${encodeURIComponent(transactionId)}/review`, { token });
}

export function submitReviewRequest(
  token: string,
  transactionId: string,
  body: { rating: number; criteria: string[]; comment?: string }
): Promise<SubmitReviewResult> {
  return apiRequest(`/api/transactions/${encodeURIComponent(transactionId)}/review`, {
    token,
    body,
  });
}
