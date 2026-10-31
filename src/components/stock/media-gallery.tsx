import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CatIcon, type CatIconKind } from '@/components/icons/cat-icon';
import { AppText } from '@/components/ui/app-text';
import type { ItemPhotoView, ItemVideoView } from '@/types/stock';
import { formatClipDuration } from '@/utils/format';

type Slide =
  | { kind: 'photo'; url: string; thumb: string; caption: string | null }
  | {
      kind: 'video';
      url: string;
      thumb: string;
      caption: string | null;
      durationMs: number | null;
    };

type MediaGalleryProps = {
  photos: ItemPhotoView[];
  videos: ItemVideoView[];
  height: number;
  /** Shown when there is nothing to show: the category icon. */
  fallbackIcon?: CatIconKind;
  /** Rounded buttons drawn over the top of the first photo (back, share, more). */
  overlay?: React.ReactNode;
  /** A row of small previews under the picture (canvas StockItem); the listing page has none. */
  thumbs?: boolean;
};

/** Photos and clips of an item, swiped one by one; the caption of the one on show sits on it. */
export function MediaGallery({
  photos,
  videos,
  height,
  fallbackIcon = 'collect',
  overlay,
  thumbs,
}: MediaGalleryProps) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState<number | null>(null);
  const slides: Slide[] = [
    ...photos.map((photo) => ({
      kind: 'photo' as const,
      url: photo.url,
      thumb: photo.thumbUrl,
      caption: photo.caption,
    })),
    ...videos.map((video) => ({
      kind: 'video' as const,
      url: video.playbackUrl,
      thumb: video.posterUrl,
      caption: video.caption,
      durationMs: video.durationMs,
    })),
  ];
  const slide = slides[Math.min(index, slides.length - 1)];
  const scroller = useRef<ScrollView>(null);

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) {
      setIndex(next);
      setPlaying(null);
    }
  }

  return (
    <View>
      <View style={{ height, backgroundColor: '#DCEBFB' }}>
        {slides.length > 0 ? (
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
          >
            {slides.map((entry, position) => (
              <View key={`${entry.url}-${position}`} style={{ width, height }}>
                {entry.kind === 'video' && playing === position ? (
                  <ClipPlayer uri={entry.url} />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={entry.kind === 'video' ? 'Phát video' : 'Ảnh'}
                    disabled={entry.kind !== 'video'}
                    onPress={() => setPlaying(position)}
                    style={{ width, height }}
                  >
                    <Image
                      source={{ uri: entry.kind === 'video' ? entry.thumb : entry.url }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                    {entry.kind === 'video' ? (
                      <View className="absolute inset-0 items-center justify-center">
                        <View className="h-14 w-14 items-center justify-center rounded-full bg-[#0F2440]/70">
                          <Svg width={26} height={26} viewBox="0 0 24 24" fill="#FFFFFF">
                            <Path d="M8 5v14l11-7z" />
                          </Svg>
                        </View>
                      </View>
                    ) : null}
                  </Pressable>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center">
            <CatIcon kind={fallbackIcon} size={150} />
          </View>
        )}

        {overlay ? (
          <View
            className="absolute left-3 right-3 top-3 flex-row justify-between"
            pointerEvents="box-none"
          >
            {overlay}
          </View>
        ) : null}
        {slide?.caption ? (
          <View
            pointerEvents="none"
            className="absolute bottom-3 left-3 max-w-[70%] rounded-lg bg-[#0F2440]/60 px-2.5 py-1"
          >
            <AppText numberOfLines={1} className="text-[12px] text-white">
              {slide.caption}
            </AppText>
          </View>
        ) : slide?.kind === 'video' ? (
          <View
            pointerEvents="none"
            className="absolute bottom-3.5 left-3 h-7 flex-row items-center gap-[5px] rounded-full bg-[#0F2440]/70 pl-2 pr-2.5"
          >
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="#FFFFFF">
              <Path d="M8 5v14l11-7z" />
            </Svg>
            <AppText className="text-[12px] font-vn-semibold text-white">
              Video {formatClipDuration(slide.durationMs ?? 0)}
            </AppText>
          </View>
        ) : null}
        {slides.length > 0 ? (
          <View
            pointerEvents="none"
            className="absolute bottom-3 right-3 h-[26px] items-center justify-center rounded-full bg-[#0F2440]/60 px-2.5"
          >
            <AppText className="text-[12px] font-vn-semibold text-white">
              {Math.min(index, slides.length - 1) + 1}/{slides.length}
            </AppText>
          </View>
        ) : null}
      </View>

      {thumbs && slides.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-4 pt-2.5"
        >
          {slides.map((entry, position) => (
            <Pressable
              key={`${entry.url}-${position}`}
              accessibilityRole="button"
              accessibilityLabel={entry.kind === 'video' ? 'Xem video' : `Xem ảnh ${position + 1}`}
              onPress={() => {
                setIndex(position);
                setPlaying(null);
                scroller.current?.scrollTo({ x: position * width, animated: true });
              }}
              className={`h-[54px] w-[54px] overflow-hidden rounded-[10px] border-2 bg-[#DCEBFB] ${
                position === index ? 'border-[#1673D9]' : 'border-transparent opacity-75'
              }`}
            >
              <Image
                source={{ uri: entry.thumb }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
              {entry.kind === 'video' ? (
                <View className="absolute inset-0 items-center justify-center bg-[#0F2440]/35">
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="#FFFFFF">
                    <Path d="M8 5v14l11-7z" />
                  </Svg>
                </View>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function ClipPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.play();
  });
  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      style={{ width: '100%', height: '100%', backgroundColor: '#000000' }}
    />
  );
}

/** Round white button drawn over a picture (back, more, share). */
export function RoundOverlayButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-10 w-10 items-center justify-center rounded-full bg-white/90"
    >
      {children}
    </Pressable>
  );
}
