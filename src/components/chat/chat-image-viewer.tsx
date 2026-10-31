import React from 'react';
import { MediaLightbox, type LightboxItem, type PhotoSource } from '@/components/ui/media-lightbox';
import { useChatMediaUrl } from '@/hooks/useChatMedia';
import type { ChatThreadMedia } from '@/services/chat/chat-view';

/** Looks the signed address of a chat image up by its attachment id (the full size, then a thumb). */
function useChatPhotoSource(item: Extract<LightboxItem, { kind: 'photo' }>): PhotoSource {
  const full = useChatMediaUrl(item.id ?? null, 'full');
  const thumb = useChatMediaUrl(item.id ?? null, 'thumb');
  return { uri: full.url ?? thumb.url, thumbUri: thumb.url, reload: full.reload };
}

/** Full-screen view of the images of one message: the same lightbox as the item and listing pages. */
export function ChatImageViewer({
  media,
  startIndex,
  onClose,
}: {
  media: ChatThreadMedia[];
  startIndex: number;
  onClose: () => void;
}) {
  const pages = media.filter((item) => item.attachmentId);
  const start = Math.max(
    pages.findIndex((item) => item.key === media[startIndex]?.key),
    0
  );
  const items: LightboxItem[] = pages.map((item) => ({
    kind: 'photo',
    id: item.attachmentId,
    width: item.width,
    height: item.height,
    blurhash: item.blurhash,
  }));

  return (
    <MediaLightbox
      items={items}
      startIndex={start}
      onClose={onClose}
      useSource={useChatPhotoSource}
    />
  );
}
