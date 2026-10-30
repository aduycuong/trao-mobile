import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useChatMediaUrl } from '@/hooks/useChatMedia';
import type { ChatThreadMedia } from '@/services/chat/chat-view';

/** A single picture is as wide as the bubble allows; several share a two-column grid. */
const GRID_WIDTH = 220;
const GAP = 4;
const TILE = (GRID_WIDTH - GAP) / 2;

function ChatImageTile({
  item,
  width,
  ratio,
  onOpen,
}: {
  item: ChatThreadMedia;
  width: number;
  ratio: number;
  onOpen?: () => void;
}) {
  const local = item.localThumbUri ?? item.localUri;
  const remote = useChatMediaUrl(local ? null : item.attachmentId, 'thumb');
  const [retried, setRetried] = useState(false);
  const src = local ?? remote.url;

  const image = (
    <Image
      source={src ? { uri: src } : undefined}
      placeholder={item.blurhash ? { blurhash: item.blurhash } : undefined}
      contentFit="cover"
      transition={200}
      onError={() => {
        // The signed URL may have expired: ask for a new one, once.
        if (retried || local) return;
        setRetried(true);
        remote.reload();
      }}
      style={{ width, aspectRatio: ratio, borderRadius: 10, backgroundColor: '#E6F1FF' }}
    />
  );

  return onOpen ? (
    <Pressable accessibilityRole="imagebutton" accessibilityLabel="Xem ảnh" onPress={onOpen}>
      {image}
    </Pressable>
  ) : (
    image
  );
}

/**
 * The images of one message: one big picture, or a grid of tiles. A tile that is still on this
 * device cannot be opened yet.
 */
export function ChatMediaGrid({
  media,
  onOpen,
}: {
  media: ChatThreadMedia[];
  onOpen: (index: number) => void;
}) {
  if (media.length === 0) return null;
  const single = media.length === 1;

  return (
    <View className="flex-row flex-wrap" style={{ width: GRID_WIDTH, gap: GAP }}>
      {media.map((item, index) => {
        const wide = media.length === 3 && index === 0;
        // A single picture keeps its own shape (within limits); grid tiles are squares.
        const ratio =
          single && item.width && item.height
            ? Math.min(Math.max(item.width / item.height, 0.6), 1.6)
            : wide
              ? 2
              : 1;
        return (
          <ChatImageTile
            key={item.key}
            item={item}
            width={single || wide ? GRID_WIDTH : TILE}
            ratio={ratio}
            onOpen={item.attachmentId ? () => onOpen(index) : undefined}
          />
        );
      })}
    </View>
  );
}
