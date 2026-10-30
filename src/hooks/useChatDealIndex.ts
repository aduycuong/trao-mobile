import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/services/api';
import type { ChatDialog } from '@/types/chat';
import type { DealView } from '@/types/deals';

/**
 * The viewer's deals that have a chat (and the chat rows of those chats, for a chat with no message yet) (`GET /api/chat/deal-index`), for the subtitle and the
 * "Đang giao dịch" filter of the chat list. Optional: when the call fails the list shows chats only.
 * `refreshKey` changes when new activity arrives in any chat, so the index is read again.
 */
export function useChatDealIndex(refreshKey: string) {
  const { session, getIdToken } = useAuth();
  const query = useQuery({
    queryKey: ['chat', 'deal-index', session?.uid, refreshKey],
    queryFn: async () => {
      const result = await apiRequest<{ deals?: DealView[]; dialogs?: ChatDialog[] }>(
        '/api/chat/deal-index',
        {
          token: await getIdToken(),
        }
      );
      return { deals: result.deals ?? [], dialogs: result.dialogs ?? [] };
    },
    enabled: !!session,
    retry: false,
    staleTime: 30 * 1000,
    placeholderData: (previous) => previous,
  });
  return { deals: query.data?.deals ?? [], dialogs: query.data?.dialogs ?? [] };
}
