import { Image } from 'expo-image';
import React, { useState } from 'react';
import { FlatList, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PathIcon } from '@/components/ui/path-icon';
import { AppText } from '@/components/ui/app-text';
import { useChatMediaUrl } from '@/hooks/useChatMedia';
import type { ChatThreadMedia } from '@/services/chat/chat-view';

function Page({ item, width, height }: { item: ChatThreadMedia; width: number; height: number }) {
  const full = useChatMediaUrl(item.attachmentId, 'full');
  const thumb = useChatMediaUrl(item.attachmentId, 'thumb');
  const [retried, setRetried] = useState(false);
  const uri = full.url ?? thumb.url;

  return (
    <View style={{ width, height }} className="items-center justify-center">
      <Image
        source={uri ? { uri } : undefined}
        placeholder={item.blurhash ? { blurhash: item.blurhash } : undefined}
        contentFit="contain"
        transition={150}
        onError={() => {
          if (retried) return;
          setRetried(true);
          full.reload();
        }}
        style={{ width, height }}
      />
    </View>
  );
}

/** Full-screen view of the images of one message; swipe sideways for the others. */
export function ChatImageViewer({
  media,
  startIndex,
  onClose,
}: {
  media: ChatThreadMedia[];
  startIndex: number;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const pages = media.filter((item) => item.attachmentId);
  const start = Math.max(
    pages.findIndex((item) => item.key === media[startIndex]?.key),
    0
  );
  const [index, setIndex] = useState(start);

  return (
    <Modal animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 bg-black">
        <FlatList
          data={pages}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={start}
          getItemLayout={(_, at) => ({ length: width, offset: width * at, index: at })}
          onMomentumScrollEnd={(event) =>
            setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
          }
          renderItem={({ item }) => <Page item={item} width={width} height={height} />}
        />
        <View
          pointerEvents="box-none"
          className="absolute left-0 right-0 flex-row items-center justify-between px-3"
          style={{ top: insets.top + 8 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng"
            onPress={onClose}
            className="h-11 w-11 items-center justify-center rounded-full bg-black/50"
          >
            <PathIcon d="M6 6l12 12M18 6L6 18" size={20} color="#FFFFFF" strokeWidth={2.4} />
          </Pressable>
          {pages.length > 1 ? (
            <View className="rounded-full bg-black/50 px-3 py-1.5">
              <AppText className="text-[13px] font-vn-semibold text-white">
                {index + 1}/{pages.length}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
