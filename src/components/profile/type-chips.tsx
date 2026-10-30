import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import {
  LISTING_TYPE_LABELS,
  LISTING_TYPES,
  type ListingType,
  type PublicListingCounts,
} from '@/types/people';

type TypeChipsProps = {
  counts: PublicListingCounts;
  value: ListingType | undefined;
  onChange: (type: ListingType | undefined) => void;
  /** `badge`: the count in a pill (UserListings); `inline`: plain text after the label (Profile). */
  variant?: 'badge' | 'inline';
};

/** Filter chips of a person's listings: "Tất cả" and each form that has listings. */
export function TypeChips({ counts, value, onChange, variant = 'inline' }: TypeChipsProps) {
  const chips = [
    { value: undefined, label: 'Tất cả', count: counts.all },
    ...LISTING_TYPES.filter((type) => counts[type] > 0).map((type) => ({
      value: type,
      label: LISTING_TYPE_LABELS[type],
      count: counts[type],
    })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 pb-1 pt-3"
    >
      {chips.map((chip) => {
        const on = chip.value === value;
        return (
          <Pressable
            key={chip.label}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(chip.value)}
            className={`h-[34px] flex-row items-center gap-1.5 rounded-full border-[1.5px] ${
              variant === 'badge' ? 'px-3.5' : 'px-3'
            } ${on ? 'border-[#0F2440] bg-[#0F2440]' : 'border-[#D5DDE5] bg-white'}`}
          >
            <AppText
              className={`font-vn-semibold ${variant === 'badge' ? 'text-[13.5px]' : 'text-[13px]'} ${
                on ? 'text-white' : ''
              }`}
            >
              {chip.label}
            </AppText>
            {variant === 'badge' ? (
              <View
                className={`h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] ${
                  on ? '' : 'bg-[#EEF2F6]'
                }`}
                style={on ? { backgroundColor: 'rgba(255,255,255,0.2)' } : undefined}
              >
                <AppText
                  className={`text-[11px] font-vn-bold ${on ? 'text-white' : 'text-[#33414D]'}`}
                >
                  {chip.count}
                </AppText>
              </View>
            ) : (
              <AppText
                className={`text-[13px] font-vn-medium ${on ? 'text-white' : ''}`}
                style={{ opacity: 0.7 }}
              >
                {chip.count}
              </AppText>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
