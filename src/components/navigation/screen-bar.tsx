import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '@/components/ui/app-text';

type ScreenBarProps = {
  title: string;
  onBack: () => void;
  trailing?: React.ReactNode;
};

/** Top bar of a pushed screen: back arrow and title (canvas Account, Settings, PhoneVerify). */
export function ScreenBar({ title, onBack, trailing }: ScreenBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center gap-1 border-b border-[#EEF2F6] bg-white px-2"
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
      <AppText
        accessibilityRole="header"
        numberOfLines={1}
        className="flex-1 text-[17px] font-vn-bold"
      >
        {title}
      </AppText>
      {trailing}
    </View>
  );
}
