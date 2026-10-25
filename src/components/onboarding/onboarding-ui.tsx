import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppText } from '@/components/ui/app-text';

type OnboardingBarProps = {
  /** 0-based index of the current step out of two. */
  index: number;
  onBack: () => void;
  onSkip?: () => void;
};

/** Back button, two progress dots and an optional "Bỏ qua". */
export function OnboardingBar({ index, onBack, onSkip }: OnboardingBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="h-14 flex-row items-center gap-2 pl-1 pr-2"
      style={{ height: 56 + insets.top, paddingTop: insets.top }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={onBack}
        className="h-11 w-11 items-center justify-center"
      >
        <Svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0F2440"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="M15 6l-6 6 6 6" />
        </Svg>
      </Pressable>
      <View accessibilityLabel={`Bước ${index + 1}/2`} className="flex-1 flex-row gap-1.5">
        {[0, 1].map((i) => (
          <View
            key={i}
            className="h-1 flex-1 rounded-full"
            style={{ backgroundColor: i <= index ? '#1673D9' : '#E1E7ED' }}
          />
        ))}
      </View>
      {onSkip ? (
        <Pressable
          accessibilityRole="button"
          onPress={onSkip}
          className="h-10 justify-center px-2.5"
        >
          <AppText className="text-[14px] font-vn-semibold text-[#5A6772]">Bỏ qua</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PinIcon({ color }: { color: string }) {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <Circle cx={12} cy={9.5} r={2.5} />
    </Svg>
  );
}

type FooterButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'yellow';
  disabled?: boolean;
  height?: number;
};

/** The tall rounded buttons of the start flow (54px primary, 50px outline). */
export function FooterButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  height = variant === 'outline' ? 50 : 54,
}: FooterButtonProps) {
  const skin = disabled
    ? 'bg-[#E1E7ED]'
    : variant === 'primary'
      ? 'bg-[#1673D9]'
      : variant === 'yellow'
        ? 'bg-[#FFC22E]'
        : 'border-[1.5px] border-[#C9DDF4] bg-white';
  const text = disabled
    ? 'text-[#A3AEB9]'
    : variant === 'primary'
      ? 'text-white'
      : variant === 'yellow'
        ? 'text-[#3D2A00]'
        : 'text-[#1673D9]';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`w-full items-center justify-center rounded-2xl ${skin}`}
      style={{ height }}
    >
      <AppText
        className={`${text} ${variant === 'outline' ? 'text-[15px] font-vn-semibold' : 'text-[16px] font-vn-bold'}`}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
