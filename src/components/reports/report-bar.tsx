import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '@/components/ui/app-text';

type ReportBarProps = {
  title: string;
  /** "close" is the cross of the report and penalty screens; "back" the arrow of an inner step. */
  icon: 'close' | 'back';
  onBack: () => void;
  trailing?: string;
};

/** Top bar of the report and penalty screens (canvas Report, Penalty): cross or arrow, title, step. */
export function ReportBar({ title, icon, onBack, trailing }: ReportBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center gap-1 border-b border-[#EEF2F6] bg-white px-2"
      style={{ height: 56 + insets.top, paddingTop: insets.top }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={icon === 'back' ? 'Quay lại' : 'Đóng'}
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
          <Path d={icon === 'back' ? 'M15 6l-6 6 6 6' : 'M6 6l12 12M18 6L6 18'} />
        </Svg>
      </Pressable>
      <AppText
        accessibilityRole="header"
        numberOfLines={1}
        className="flex-1 text-[17px] font-vn-bold"
      >
        {title}
      </AppText>
      {trailing ? (
        <AppText className="pr-2.5 text-[13px] font-vn-semibold text-[#5A6772]">{trailing}</AppText>
      ) : null}
    </View>
  );
}
