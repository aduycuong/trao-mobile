import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { useBottomInset } from '@/hooks/useBottomInset';

export type ActionButton = {
  label: string;
  onPress: () => void;
  /** "primary" is the blue 1.4-wide button; "outline" the white one beside it. */
  tone?: 'primary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
};

/** The bottom bar of the report and penalty screens (canvas Report, Penalty): 50px buttons. */
export function ActionBar({ buttons }: { buttons: ActionButton[] }) {
  const bottomInset = useBottomInset();
  return (
    <View
      className="flex-row gap-2.5 border-t border-[#EEF2F6] bg-white px-4 pt-2.5"
      style={{ paddingBottom: 16 + bottomInset }}
    >
      {buttons.map((button) => {
        const outline = button.tone === 'outline';
        const off = !!button.disabled || !!button.loading;
        return (
          <Pressable
            key={button.label}
            accessibilityRole="button"
            accessibilityState={{ disabled: off, busy: !!button.loading }}
            onPress={off ? undefined : button.onPress}
            style={{ flex: outline ? 1 : 1.4 }}
            className={`h-[50px] flex-row items-center justify-center gap-2 rounded-[14px] ${
              outline
                ? 'border-[1.5px] border-[#C9DDF4] bg-white'
                : off
                  ? 'bg-[#E1E7ED]'
                  : 'bg-[#1673D9]'
            }`}
          >
            {button.loading ? <ActivityIndicator color="#A3AEB9" /> : null}
            <AppText
              className={`text-[15px] ${
                outline
                  ? 'font-vn-semibold text-[#1673D9]'
                  : off
                    ? 'font-vn-bold text-[#A3AEB9]'
                    : 'font-vn-bold text-white'
              }`}
            >
              {button.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
