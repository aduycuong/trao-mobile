import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';

/**
 * Opens the chat with another user, given by the handle of their profile link (from a profile or
 * a listing page). With `listingId` the thread shows that listing on top, so the chat shows what
 * the talk is about. A guest is sent to sign in; a blocked user shows the server's answer.
 */
export function useOpenChat() {
  const router = useRouter();
  const { session } = useAuth();
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
        const { inboxId } = await api.getOrCreateDirectInbox({ handle });
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
    [session, api, router]
  );
}
