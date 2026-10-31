import React, { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

/** Dragged further than this (points) or flicked faster than this (points/s): the sheet closes. */
const CLOSE_DISTANCE = 110;
const CLOSE_VELOCITY = 900;
const OPEN_MS = 260;
const CLOSE_MS = 200;

type SheetModalProps = {
  onClose: () => void;
  /** Sits under the handle and drags the sheet too (a title, for example). */
  header?: React.ReactNode;
  children: React.ReactNode;
  /** Classes of the header and the content; the sheet has no side padding of its own. */
  contentClassName?: string;
  /** Extra space under the content, on top of the safe area. */
  bottomPadding?: number;
  /** The sheet is never taller than this share of the screen. */
  maxHeightRatio?: number;
};

/**
 * Bottom sheet of the app: dimmed backdrop, handle, slides up and closes by dragging the handle or
 * header down, tapping the backdrop or the Android back button. Closing from inside (a button)
 * just calls `onClose`; the parent unmounts the sheet.
 */
export function SheetModal({
  onClose,
  header,
  children,
  contentClassName = 'px-5',
  bottomPadding = 22,
  maxHeightRatio = 0.88,
}: SheetModalProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const translateY = useSharedValue(screenHeight);
  const sheetHeight = useSharedValue(screenHeight);

  useEffect(() => {
    translateY.set(withTiming(0, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) }));
  }, [translateY]);

  function requestClose() {
    translateY.set(
      withTiming(
        sheetHeight.get(),
        { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) scheduleOnRN(onClose);
        }
      )
    );
  }

  const pan = usePanGesture({
    // Only a downward drag takes the touch; a tap on the header still reaches its children.
    activeOffsetY: 8,
    onUpdate: (event) => {
      'worklet';
      translateY.set(Math.max(0, event.translationY));
    },
    onDeactivate: (event) => {
      'worklet';
      if (event.translationY > CLOSE_DISTANCE || event.velocityY > CLOSE_VELOCITY) {
        translateY.set(
          withTiming(
            sheetHeight.get(),
            { duration: CLOSE_MS, easing: Easing.out(Easing.cubic) },
            (finished) => {
              if (finished) scheduleOnRN(onClose);
            }
          )
        );
      } else {
        translateY.set(withSpring(0, { damping: 20, stiffness: 260 }));
      }
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.get(), [0, sheetHeight.get()], [1, 0], 'clamp'),
  }));

  return (
    <Modal transparent animationType="none" onRequestClose={requestClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.fill}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.end}
        >
          <Pressable
            accessibilityLabel="Đóng"
            onPress={requestClose}
            style={StyleSheet.absoluteFill}
          >
            <Animated.View style={[styles.fill, styles.backdrop, backdropStyle]} />
          </Pressable>
          <Animated.View
            accessibilityViewIsModal
            onLayout={(event) => {
              sheetHeight.set(event.nativeEvent.layout.height);
            }}
            style={sheetStyle}
          >
            <View
              className="rounded-t-[26px] bg-white"
              style={{ maxHeight: screenHeight * maxHeightRatio }}
            >
              <GestureDetector gesture={pan}>
                <View>
                  <View className="items-center pb-3.5 pt-2.5">
                    <View className="h-1 w-10 rounded-full bg-[#D5DCE3]" />
                  </View>
                  {header ? <View className={contentClassName}>{header}</View> : null}
                </View>
              </GestureDetector>
              <View
                className={`shrink ${contentClassName}`}
                style={{ paddingBottom: bottomPadding + insets.bottom }}
              >
                {children}
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  end: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(15,36,64,0.45)' },
});
