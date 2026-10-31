import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useState } from 'react';
import { Modal, PixelRatio, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  FlatList,
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';
import { AppText } from '@/components/ui/app-text';
import { PathIcon } from '@/components/ui/path-icon';
import { formatClipDuration } from '@/utils/format';
import {
  actualSizeScale,
  clamp,
  fitSize,
  MAX_SCALE,
  maxOffset,
  offsetAfterZoom,
} from '@/utils/zoom-math';

export type LightboxItem =
  | {
      kind: 'photo';
      uri: string;
      /** Small version shown until the full one has loaded. */
      thumbUri?: string | null;
      /** Size in pixels: the double tap goes to the actual size with it. */
      width?: number | null;
      height?: number | null;
      blurhash?: string | null;
      caption?: string | null;
    }
  | {
      kind: 'video';
      videoUri: string;
      posterUri: string;
      durationMs?: number | null;
      caption?: string | null;
    };

/** Dragged further than this (points) or flicked faster than this (points/s): the lightbox closes. */
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;
/** How far past its edge a zoomed photo can be pulled, as a share of the pull. */
const OVERSCROLL_RESISTANCE = 0.3;
const MIN_PINCH_SCALE = 0.7;

/** `value` past `±limit` moves at a fraction of the pull, like a rubber band. */
function resist(value: number, limit: number) {
  'worklet';
  if (Math.abs(value) <= limit) return value;
  const over = Math.abs(value) - limit;
  return Math.sign(value) * (limit + over * OVERSCROLL_RESISTANCE);
}

/** Moves `value` to rest inside `±limit`: a spring back from outside, a decay from inside. */
function settle(value: SharedValue<number>, velocity: number, limit: number) {
  'worklet';
  if (Math.abs(value.get()) > limit) {
    value.set(withSpring(clamp(value.get(), -limit, limit), { damping: 30, stiffness: 300 }));
  } else {
    value.set(withDecay({ velocity, clamp: [-limit, limit], deceleration: 0.996 }));
  }
}

type PhotoPageProps = {
  item: Extract<LightboxItem, { kind: 'photo' }>;
  width: number;
  height: number;
  /** 1 when the lightbox is at rest, down to 0 while it is dragged away. */
  backdrop: SharedValue<number>;
  onZoomChange: (zoomed: boolean) => void;
  onTap: () => void;
  onDismiss: () => void;
};

/** One photo that pinches, double-taps, pans while zoomed and drags down to close. */
function PhotoPage({
  item,
  width,
  height,
  backdrop,
  onZoomChange,
  onTap,
  onDismiss,
}: PhotoPageProps) {
  const view = { width, height };
  const natural = item.width && item.height ? { width: item.width, height: item.height } : null;
  const fitted = fitSize(natural, view);
  const doubleTapScale = actualSizeScale(natural, fitted, PixelRatio.get());

  const [zoomed, setZoomed] = useState(false);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  function reportZoom(next: boolean) {
    setZoomed(next);
    onZoomChange(next);
  }

  function resetZoom() {
    'worklet';
    scale.set(withTiming(1, { duration: 200 }));
    translateX.set(withTiming(0, { duration: 200 }));
    translateY.set(withTiming(0, { duration: 200 }));
  }

  const pinch = Gesture.Pinch()
    .onStart(() => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      savedScale.set(scale.get());
      savedX.set(translateX.get());
      savedY.set(translateY.get());
    })
    .onUpdate((event) => {
      const next = clamp(savedScale.get() * event.scale, MIN_PINCH_SCALE, MAX_SCALE);
      const offset = offsetAfterZoom(
        { x: event.focalX - width / 2, y: event.focalY - height / 2 },
        { x: savedX.get(), y: savedY.get() },
        savedScale.get(),
        next
      );
      scale.set(next);
      translateX.set(offset.x);
      translateY.set(offset.y);
    })
    .onEnd(() => {
      if (scale.get() < 1.02) {
        resetZoom();
        scheduleOnRN(reportZoom, false);
        return;
      }
      const limit = maxOffset(fitted, view, scale.get());
      translateX.set(withTiming(clamp(translateX.get(), -limit.x, limit.x), { duration: 180 }));
      translateY.set(withTiming(clamp(translateY.get(), -limit.y, limit.y), { duration: 180 }));
      scheduleOnRN(reportZoom, true);
    });

  /** While zoomed, a drag moves the photo around inside the view. */
  const panZoomed = Gesture.Pan()
    .onStart(() => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      savedX.set(translateX.get());
      savedY.set(translateY.get());
    })
    .onUpdate((event) => {
      const limit = maxOffset(fitted, view, scale.get());
      translateX.set(resist(savedX.get() + event.translationX, limit.x));
      translateY.set(resist(savedY.get() + event.translationY, limit.y));
    })
    .onEnd((event) => {
      const limit = maxOffset(fitted, view, scale.get());
      settle(translateX, event.velocityX, limit.x);
      settle(translateY, event.velocityY, limit.y);
    });

  /** At rest, a vertical drag takes the photo away; a horizontal one is left to the pager. */
  const panDismiss = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .failOffsetX([-12, 12])
    .onUpdate((event) => {
      dragY.set(event.translationY);
      backdrop.set(1 - Math.min(Math.abs(event.translationY) / (height * 0.5), 1));
    })
    .onEnd((event) => {
      const away =
        Math.abs(event.translationY) > DISMISS_DISTANCE ||
        Math.abs(event.velocityY) > DISMISS_VELOCITY;
      if (away) {
        const direction =
          event.translationY === 0 ? Math.sign(event.velocityY) : Math.sign(event.translationY);
        backdrop.set(withTiming(0, { duration: 200 }));
        dragY.set(
          withTiming(
            direction * height,
            { duration: 200, easing: Easing.out(Easing.cubic) },
            (finished) => {
              if (finished) scheduleOnRN(onDismiss);
            }
          )
        );
      } else {
        dragY.set(withSpring(0, { damping: 22, stiffness: 260 }));
        backdrop.set(withTiming(1, { duration: 150 }));
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd((event, success) => {
      if (!success) return;
      if (scale.get() > 1.05) {
        resetZoom();
        scheduleOnRN(reportZoom, false);
        return;
      }
      // Zoom to the actual size around the tapped point.
      const offset = offsetAfterZoom(
        { x: event.x - width / 2, y: event.y - height / 2 },
        { x: 0, y: 0 },
        1,
        doubleTapScale
      );
      const limit = maxOffset(fitted, view, doubleTapScale);
      scale.set(withTiming(doubleTapScale, { duration: 240 }));
      translateX.set(withTiming(clamp(offset.x, -limit.x, limit.x), { duration: 240 }));
      translateY.set(withTiming(clamp(offset.y, -limit.y, limit.y), { duration: 240 }));
      scheduleOnRN(reportZoom, true);
    });

  const singleTap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((_event, success) => {
      if (success) scheduleOnRN(onTap);
    });

  const gesture = Gesture.Race(
    Gesture.Simultaneous(pinch, zoomed ? panZoomed : panDismiss),
    Gesture.Exclusive(doubleTap, singleTap)
  );

  const photoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.get() },
      { translateY: translateY.get() + dragY.get() },
      { scale: scale.get() },
    ],
  }));

  const placeholder = item.thumbUri
    ? { uri: item.thumbUri }
    : item.blurhash
      ? { blurhash: item.blurhash }
      : undefined;

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height }}>
        <Animated.View style={[{ width, height }, photoStyle]}>
          <Image
            source={{ uri: item.uri }}
            placeholder={placeholder}
            placeholderContentFit="contain"
            contentFit="contain"
            transition={150}
            accessibilityLabel={item.caption ?? 'Ảnh'}
            style={{ width, height }}
          />
        </Animated.View>
      </View>
    </GestureDetector>
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
      style={StyleSheet.absoluteFill}
    />
  );
}

/** A clip: its poster with a play button, then the player once it is started and on show. */
function VideoPage({
  item,
  width,
  height,
  active,
}: {
  item: Extract<LightboxItem, { kind: 'video' }>;
  width: number;
  height: number;
  active: boolean;
}) {
  const [started, setStarted] = useState(false);

  return (
    <View style={{ width, height }} className="items-center justify-center bg-black">
      {started && active ? (
        <ClipPlayer uri={item.videoUri} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Phát video"
          onPress={() => setStarted(true)}
          style={{ width, height }}
        >
          <Image source={{ uri: item.posterUri }} contentFit="contain" style={{ width, height }} />
          <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-[#0F2440]/70">
              <Svg width={30} height={30} viewBox="0 0 24 24" fill="#FFFFFF">
                <Path d="M8 5v14l11-7z" />
              </Svg>
            </View>
          </View>
        </Pressable>
      )}
    </View>
  );
}

type MediaLightboxProps = {
  items: LightboxItem[];
  startIndex: number;
  onClose: () => void;
};

/**
 * Full-screen viewer of photos and clips (the Facebook way): swipe sideways for the next one,
 * pinch or double-tap to zoom (to the actual size), drag a photo down or up to close, tap to hide
 * the bars. The caption of the one on show sits under it.
 */
export function MediaLightbox({ items, startIndex, onClose }: MediaLightboxProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const first = Math.min(Math.max(startIndex, 0), Math.max(items.length - 1, 0));
  const [index, setIndex] = useState(first);
  const [zoomed, setZoomed] = useState(false);
  const backdrop = useSharedValue(1);
  const chrome = useSharedValue(1);
  const current = items[index];

  function toggleChrome() {
    chrome.set(withTiming(chrome.get() > 0.5 ? 0 : 1, { duration: 180 }));
  }

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }));
  const chromeStyle = useAnimatedStyle(() => ({ opacity: chrome.get() * backdrop.get() }));

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar style="light" />
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.black, backdropStyle]} />
        <FlatList
          data={items}
          keyExtractor={(entry, at) =>
            `${at}-${entry.kind === 'photo' ? entry.uri : entry.videoUri}`
          }
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={first}
          windowSize={3}
          getItemLayout={(_, at) => ({ length: width, offset: width * at, index: at })}
          onMomentumScrollEnd={(event) =>
            setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
          }
          renderItem={({ item, index: at }) =>
            item.kind === 'photo' ? (
              <PhotoPage
                item={item}
                width={width}
                height={height}
                backdrop={backdrop}
                onZoomChange={setZoomed}
                onTap={toggleChrome}
                onDismiss={onClose}
              />
            ) : (
              <VideoPage item={item} width={width} height={height} active={at === index} />
            )
          }
        />

        <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, chromeStyle]}>
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
            {items.length > 1 ? (
              <View className="rounded-full bg-black/50 px-3 py-1.5">
                <AppText className="text-[13px] font-vn-semibold text-white">
                  {index + 1}/{items.length}
                </AppText>
              </View>
            ) : null}
          </View>

          {current?.caption || current?.kind === 'video' ? (
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
              style={[styles.captionBar, { paddingBottom: insets.bottom + 14 }]}
            >
              {current.kind === 'video' ? (
                <AppText className="text-[12px] font-vn-semibold text-white/80">
                  Video {formatClipDuration(current.durationMs ?? 0)}
                </AppText>
              ) : null}
              {current.caption ? (
                <AppText className="text-[14.5px] leading-[21px] text-white">
                  {current.caption}
                </AppText>
              ) : null}
            </LinearGradient>
          ) : null}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  black: { backgroundColor: '#000000' },
  captionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 40,
    gap: 4,
  },
});
