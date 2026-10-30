import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { openListingDeal } from '@/services/deals/deals-api';

/**
 * Opens the chat with another user, given by the handle of their profile link (from a profile or
 * a listing page). With `listingId` it is `POST /api/listings/:id/deal`: the chat opens with the
 * agreement about that listing, and the thread shows it on top. A guest is sent to sign in; a blocked user shows the server's answer.
 */
export function useOpenChat() {
  const router = useRouter();
  const { session, getIdToken } = useAuth();
  const { api } = useChat();
  const busy = useRef(false);

  return useCallback(
    async (handle: string, listingId?: string) => {
      if (!session) {
        router.push('/auth-gate');
        return;
      }
      if (busy.current) return;
      if (!api) {
        Alert.alert('Tin nhắn chưa sẵn sàng', 'Thử lại sau giây lát.');
        return;
      }
      busy.current = true;
      try {
        // From a listing the chat and the agreement about it are opened together.
        const { inboxId } = listingId
          ? await openListingDeal(await getIdToken(), listingId)
          : await api.getOrCreateDirectInbox({ handle });
        router.push({
          pathname: '/chat/[inboxId]',
          params: listingId ? { inboxId, listing: listingId } : { inboxId },
        });
      } catch (error) {
        Alert.alert(
          'Không mở được cuộc trò chuyện',
          error instanceof Error ? error.message : 'Thử lại sau.'
        );
      } finally {
        busy.current = false;
      }
    },
    [session, api, router, getIdToken]
  );
}
