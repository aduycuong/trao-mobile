import { useContext } from 'react';
import { ChatContext } from '@/providers/ChatProvider';

export function useChat() {
  return useContext(ChatContext);
}
