import type { ChatMessageSticker } from '@/types/chat';

/** The chat stickers "Bé Thùng". They are drawn in the app; a message stores only the id. */
export const CHAT_STICKERS = [
  { id: 'chot', name: 'Chốt!' },
  { id: 'con', name: 'Còn không?' },
  { id: 'bot', name: 'Bớt chút nha' },
  { id: 'toi', name: 'Đang tới' },
  { id: 'doi', name: 'Đợi xíu' },
  { id: 'camon', name: 'Cảm ơn nha' },
  { id: 'nhan', name: 'Đã nhận!' },
  { id: 'ok', name: 'Ok luôn' },
] as const;

export type ChatStickerId = (typeof CHAT_STICKERS)[number]['id'];

/** The sticker as the sync engine queues it (the server resolves the same fields). */
export function toChatMessageSticker(sticker: { id: string; name: string }): ChatMessageSticker {
  return {
    id: sticker.id,
    name: sticker.name,
    imagePath: '',
    groupId: 'trao',
    groupName: 'Bé Thùng',
  };
}
