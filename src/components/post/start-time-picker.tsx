import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { formatDayMonth } from '@/utils/format';
import { composeStart, START_DAY_OFFSETS, START_SLOTS } from '@/utils/listing-rules';

type StartTimePickerProps = {
  value: Date | null;
  /** The moment the screen opened, so the offered days do not move while picking. */
  now: number;
  onChange: (start: Date) => void;
};

function slotLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function dayLabel(offset: number, now: number): string {
  if (offset === 0) return 'Hôm nay';
  if (offset === 1) return 'Ngày mai';
  return formatDayMonth(composeStart(now, offset, 0));
}

/** Day and time chips for a scheduled auction (there is no date picker module in the app). */
export function StartTimePicker({ value, now, onChange }: StartTimePickerProps) {
  const today = composeStart(now, 0, 0).getTime();
  const dayOffset = value
    ? Math.round((new Date(value).setHours(0, 0, 0, 0) - today) / 86_400_000)
    : null;
  const minutes = value ? value.getHours() * 60 + value.getMinutes() : null;

  function chip(on: boolean) {
    return `h-10 justify-center rounded-[10px] border-[1.5px] px-3.5 ${
      on ? 'border-[#1673D9] bg-[#F1F7FE]' : 'border-[#D5DDE5] bg-white'
    }`;
  }

  return (
    <View className="gap-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {START_DAY_OFFSETS.map((offset) => (
          <Pressable
            key={offset}
            accessibilityRole="button"
            accessibilityState={{ selected: dayOffset === offset }}
            onPress={() => onChange(composeStart(now, offset, minutes ?? 20 * 60))}
            className={chip(dayOffset === offset)}
          >
            <AppText className="text-[13.5px] font-vn-semibold">{dayLabel(offset, now)}</AppText>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {START_SLOTS.map((slot) => (
          <Pressable
            key={slot}
            accessibilityRole="button"
            accessibilityState={{ selected: minutes === slot }}
            onPress={() => onChange(composeStart(now, dayOffset ?? 0, slot))}
            className={chip(minutes === slot)}
          >
            <AppText className="text-[13.5px] font-vn-semibold">{slotLabel(slot)}</AppText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
