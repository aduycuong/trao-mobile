import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** True while the on-screen keyboard is up. iOS tells before it moves, Android once it is shown. */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(() => Keyboard.isVisible());

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () =>
      setOpen(true)
    );
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setOpen(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return open;
}

/**
 * The space under the last row of a bar or sheet that sits at the bottom edge: the safe area less
 * 12 (the home indicator is a thin bar at the very bottom, so the lower part of the area can be
 * used), never below 10. The bottom tab bar and the sheets share it.
 */
export function snugBottomInset(bottom: number) {
  return Math.max(bottom - 12, 10);
}

/**
 * The bottom safe area to pad a bar with: the home indicator and the navigation bar need it, but a
 * keyboard covers that area, so the bar sits right on the keyboard (no gap) while it is open.
 */
export function useBottomInset() {
  const { bottom } = useSafeAreaInsets();
  return useKeyboardOpen() ? 0 : bottom;
}
