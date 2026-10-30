import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { ICON_CHECK, PathIcon } from '@/components/ui/path-icon';

/** Square tick box of the canvas Post (22px, 6px radius). */
export function Checkbox({ on }: { on: boolean }) {
  return (
    <View
      className={`h-[22px] w-[22px] items-center justify-center rounded-md ${
        on ? 'bg-[#1673D9]' : 'border-2 border-[#B8C4D0] bg-white'
      }`}
    >
      {on ? <PathIcon d={ICON_CHECK} size={13} color="#FFFFFF" strokeWidth={3.4} /> : null}
    </View>
  );
}

/** Round radio dot of the form cards. */
export function RadioDot({ on }: { on: boolean }) {
  return (
    <View
      className={`h-5 w-5 rounded-full bg-white ${
        on ? 'border-[6px] border-[#1673D9]' : 'border-2 border-[#B8C4D0]'
      }`}
    />
  );
}

/** The 46x28 switch (cho trả giá) or 40x24 switch (Trình bày). */
export function Switch({ on, large = true }: { on: boolean; large?: boolean }) {
  const w = large ? 46 : 40;
  const h = large ? 28 : 24;
  const knob = large ? 22 : 18;
  return (
    <View
      style={{ width: w, height: h, padding: 3, justifyContent: 'center' }}
      className={`rounded-full ${on ? 'bg-[#1673D9]' : 'bg-[#CBD5E0]'}`}
    >
      <View
        style={{
          width: knob,
          height: knob,
          alignSelf: on ? 'flex-end' : 'flex-start',
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
        className="rounded-full bg-white"
      />
    </View>
  );
}

type SheetButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'tinted' | 'danger' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  flex?: number;
};

/** The 50px button row of the sheets and bottom bars (canvas Post, StockItem). */
export function BarButton({
  label,
  onPress,
  tone = 'primary',
  disabled,
  loading,
  flex = 1,
}: SheetButtonProps) {
  const skin = {
    primary: disabled ? 'bg-[#C9D3DD]' : 'bg-[#1673D9]',
    tinted: 'bg-[#F1F7FE]',
    danger: 'bg-[#B42318]',
    outline: 'border-[1.5px] border-[#C9DDF4] bg-white',
  }[tone];
  const text = {
    primary: 'text-white font-vn-bold',
    tinted: 'text-[#0F2440] font-vn-semibold',
    danger: 'text-white font-vn-bold',
    outline: 'text-[#1673D9] font-vn-bold',
  }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      onPress={disabled || loading ? undefined : onPress}
      style={{ flex }}
      className={`h-[50px] flex-row items-center justify-center gap-2 rounded-[14px] ${skin} ${
        loading ? 'opacity-70' : ''
      }`}
    >
      {loading ? <ActivityIndicator color={tone === 'outline' ? '#1673D9' : '#FFFFFF'} /> : null}
      <AppText className={`text-[15px] ${text}`}>{label}</AppText>
    </Pressable>
  );
}

/** Red box with a message and the retry link. */
export function ErrorBox({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
}) {
  return (
    <View accessibilityRole="alert" className="mx-4 mt-3 rounded-2xl bg-[#FDECEA] px-4 py-3">
      <AppText className="text-[14px] text-[#B42318]">{message}</AppText>
      <View className="mt-1.5 flex-row gap-4">
        {onRetry ? (
          <Pressable onPress={onRetry}>
            <AppText className="text-[14px] font-vn-semibold text-[#B42318] underline">
              Thử lại
            </AppText>
          </Pressable>
        ) : null}
        {onBack ? (
          <Pressable onPress={onBack}>
            <AppText className="text-[14px] font-vn-semibold text-[#B42318] underline">
              Quay lại
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Placeholder block while a screen loads (the web `Skeleton`: #E8EEF4, 6px radius). */
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <View className={`rounded-md bg-[#E8EEF4] ${className}`} />;
}
