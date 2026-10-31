import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';

type FilterChipProps = {
  label: string;
  on: boolean;
  onPress: () => void;
  /** Shown in a small badge after the label; leave it out to hide the badge. */
  count?: number;
  /** `gold` is for counts that ask for attention (drafts, deals in progress). */
  badge?: 'default' | 'gold';
  /** Colour dot before the label (the tag colour in the Kho đồ). */
  dot?: string;
};

/** Fixed line heights keep the font's tall metrics from pushing the text low in the chip. */
const LABEL = { lineHeight: 18, includeFontPadding: false, textAlignVertical: 'center' } as const;
const COUNT = { lineHeight: 14, includeFontPadding: false, textAlignVertical: 'center' } as const;

/**
 * The filter chip of the list tabs (Tin nhắn, Kho đồ, Tin đăng) and the follow lists: 34 high,
 * ink fill when on, a count badge. One component so the chips look the same everywhere.
 */
export function FilterChip({ label, on, onPress, count, badge = 'default', dot }: FilterChipProps) {
  const badgeSkin = badge === 'gold' ? 'bg-[#FFC22E]' : on ? 'bg-white/20' : 'bg-[#EEF2F6]';
  const badgeText = badge === 'gold' ? 'text-[#3D2A00]' : on ? 'text-white' : 'text-[#33414D]';

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      className={`h-[34px] flex-row items-center justify-center gap-1.5 rounded-full border-[1.5px] px-3.5 ${
        on ? 'border-[#0F2440] bg-[#0F2440]' : 'border-[#D5DDE5] bg-white'
      }`}
    >
      {dot ? <View className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} /> : null}
      <AppText
        className={`text-[13.5px] font-vn-semibold ${on ? 'text-white' : 'text-[#0F2440]'}`}
        style={LABEL}
      >
        {label}
      </AppText>
      {count !== undefined ? (
        <View
          className={`h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] ${badgeSkin}`}
        >
          <AppText className={`text-[11px] font-vn-bold ${badgeText}`} style={COUNT}>
            {count}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}
