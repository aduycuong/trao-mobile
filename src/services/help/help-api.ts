import { apiRequest } from '@/services/api';
import type {
  FeedbackBody,
  HelpFaqDetail,
  HelpHome,
  HelpSearchResult,
  PolicyPageDetail,
} from '@/types/help';

export const HELP_HOME_QUERY_KEY = ['help', 'home'] as const;

/** Open to guests; with a token the answer also has the signed-in user's own items. */
export function fetchHelpHome(token?: string): Promise<HelpHome> {
  return apiRequest<HelpHome>('/api/help', { token });
}

export function searchHelp(q: string): Promise<HelpSearchResult> {
  return apiRequest<HelpSearchResult>(`/api/help/search?q=${encodeURIComponent(q)}`);
}

export function fetchFaq(id: string): Promise<HelpFaqDetail> {
  return apiRequest<HelpFaqDetail>(`/api/help/faqs/${encodeURIComponent(id)}`);
}

/** The API answers in English unless asked for Vietnamese; the app is Vietnamese only. */
export function fetchPolicyPage(slug: string): Promise<PolicyPageDetail> {
  return apiRequest<PolicyPageDetail>(`/api/policies/${encodeURIComponent(slug)}?lang=vn`);
}

/** Screenshots are uploaded first (`uploadType: "feedback"`); 429 after 10 messages a day. */
export async function postFeedback(token: string, body: FeedbackBody): Promise<void> {
  await apiRequest<{ id: string }>('/api/feedback', { method: 'POST', body, token });
}
