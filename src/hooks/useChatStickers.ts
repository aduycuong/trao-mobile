import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useChat } from '@/hooks/useChat';

/**
 * Chat sticker groups and the stickers of `groupId` (the first group while it is undefined).
 * The catalog changes rarely, so pages are kept for a while.
 */
export function useChatStickers(groupId: string | undefined) {
  const { api } = useChat();
  return useQuery({
    queryKey: ['chat-stickers', groupId ?? null],
    queryFn: () =>
      api ? api.listChatStickers(groupId) : Promise.reject(new Error('Chưa sẵn sàng')),
    enabled: !!api,
    staleTime: 10 * 60 * 1000,
    // Keeps the group tabs on screen while another group loads.
    placeholderData: keepPreviousData,
  });
}
