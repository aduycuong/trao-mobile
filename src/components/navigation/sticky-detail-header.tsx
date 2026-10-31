import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/app-text';

/** Height of the bar under the status bar. */
const BAR_HEIGHT = 56;
/** The background fades in over this much scrolling, ending when the bar reaches the picture's bottom. */
const FADE_DISTANCE = 90;

/** Scroll position of a detail screen, to hand to the header and to the `Animated.ScrollView`. */
export function useStickyScroll() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  return { scrollY, onScroll };
}

type StickyDetailHeaderProps = {
  scrollY: SharedValue<number>;
  /** Height of the picture under the bar: the bar turns solid as it scrolls out from under it. */
  heroHeight: number;
  /** Shown in the bar once it is solid. */
  title: string;
  /** The back button. */
  left: React.ReactNode;
  /** Share, more... */
  right?: React.ReactNode;
};

/**
 * Bar of the item and listing pages: it floats over the picture with round buttons, stays at the top
 * when the page scrolls, and fades into a white bar with the title and a hairline.
 */
export function StickyDetailHeader({
  scrollY,
  heroHeight,
  title,
  left,
  right,
}: StickyDetailHeaderProps) {
  const insets = useSafeAreaInsets();
  const barHeight = insets.top + BAR_HEIGHT;
  const end = Math.max(heroHeight - barHeight, 1);
  const start = Math.max(end - FADE_DISTANCE, 0);

  const background = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [start, end], [0, 1], 'clamp'),
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [start + FADE_DISTANCE / 2, end], [0, 1], 'clamp'),
  }));

  return (
    <View pointerEvents="box-none" style={[styles.bar, { height: barHeight }]}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.solid, background]}
      />
      <View
        pointerEvents="box-none"
        className="flex-row items-center gap-2 px-3"
        style={{ paddingTop: insets.top, height: barHeight }}
      >
        {left}
        <Animated.View pointerEvents="none" style={[styles.title, titleStyle]}>
          <AppText
            numberOfLines={1}
            accessibilityRole="header"
            className="text-[16px] font-vn-bold"
          >
            {title}
          </AppText>
        </Animated.View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  solid: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EEF2F6' },
  title: { flex: 1 },
});
