import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';

type TagChipProps = {
  label: string;
  count: number;
  dot?: string;
  on: boolean;
  onPress: () => void;
};

/** Filter chip of the Kho đồ (canvas StockList): ink fill when on, dot for the tag colour. */
export function TagChip({ label, count, dot, on, onPress }: TagChipProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      className={`h-9 flex-row items-center gap-1.5 rounded-full border-[1.5px] px-3.5 ${
        on ? 'border-[#0F2440] bg-[#0F2440]' : 'border-[#D5DDE5] bg-white'
      }`}
    >
      {dot ? <View className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} /> : null}
      <AppText className={`text-[13.5px] font-vn-semibold ${on ? 'text-white' : 'text-[#0F2440]'}`}>
        {label}
      </AppText>
      <AppText
        className={`text-[13.5px] font-vn-medium opacity-70 ${on ? 'text-white' : 'text-[#0F2440]'}`}
      >
        {count}
      </AppText>
    </Pressable>
  );
}
