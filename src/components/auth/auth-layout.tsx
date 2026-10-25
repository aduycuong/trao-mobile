import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { CatIcon } from '@/components/icons/cat-icon';
import { AppText } from '@/components/ui/app-text';
import { TraoLogo } from './trao-logo';

/** White page that scrolls and lifts above the keyboard. */
export function AuthScroll({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CloseGlyph() {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0F2440"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

function BackGlyph() {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0F2440"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}

type BarAction = { kind: 'close' | 'back'; label: string; onPress: () => void };

function BarButton({ action }: { action: BarAction }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={action.onPress}
      className="h-11 w-11 items-center justify-center"
    >
      {action.kind === 'close' ? <CloseGlyph /> : <BackGlyph />}
    </Pressable>
  );
}

type AuthHeroProps = {
  variant: 'login' | 'register';
  action: BarAction;
};

/** Blue header of the sign-in and sign-up screens. */
export function AuthHero({ variant, action }: AuthHeroProps) {
  const insets = useSafeAreaInsets();
  const login = variant === 'login';
  const small = login ? 58 : 44;
  const large = login ? 82 : 60;

  return (
    <View
      className="overflow-hidden bg-[#E6F1FF]"
      style={{ paddingTop: 10 + insets.top, paddingRight: 16, paddingBottom: 54, paddingLeft: 8 }}
    >
      <View
        pointerEvents="none"
        className="absolute rounded-full bg-[#FFE7A0]"
        style={{ top: -60, right: -40, width: 180, height: 180 }}
      />
      <View
        pointerEvents="none"
        className="absolute rounded-full bg-[#C4DEFB]"
        style={{ bottom: 26, left: -26, width: 80, height: 80 }}
      />
      <View className="flex-row items-center justify-between">
        <BarButton action={action} />
        <View className="flex-row items-center gap-2">
          <TraoLogo size={28} />
          <AppText className="text-[15px] font-vn-bold">trao.app</AppText>
        </View>
      </View>
      <View
        className="flex-row items-end justify-center gap-1 pt-1.5"
        style={{ height: login ? 92 : 64 }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={{ transform: [{ rotate: '-10deg' }, { translateY: -6 }] }}>
          <CatIcon kind="gift" size={small} />
        </View>
        <CatIcon kind="swap" size={large} />
        <View style={{ transform: [{ rotate: '10deg' }, { translateY: -6 }] }}>
          <CatIcon kind="sale" size={small} />
        </View>
      </View>
      <View className="gap-1 pl-2 pt-2.5">
        <AppText className="text-[26px] font-vn-bold leading-[31px] tracking-[-0.52px]">
          {login ? 'Chào mừng trở lại' : 'Tạo tài khoản Trao'}
        </AppText>
        <AppText className="text-[14px] leading-[20px] text-[#33414D]">
          {login
            ? 'Đăng nhập để nhắn tin, trả giá, đổi đồ và lưu món yêu thích.'
            : 'Mua, bán, đổi và tặng đồ cũ với người thật quanh bạn.'}
        </AppText>
      </View>
    </View>
  );
}

type AuthBarProps = {
  action: BarAction;
  step?: { current: number; total: number };
};

/** Top bar of the screens without the hero: back or close, and the step dots. */
export function AuthBar({ action, step }: AuthBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center gap-1"
      style={{ paddingTop: 10 + insets.top, paddingRight: 16, paddingLeft: 4 }}
    >
      <BarButton action={action} />
      <View className="flex-1" />
      {step ? (
        <View className="flex-row items-center gap-2.5">
          <View className="flex-row gap-1">
            {Array.from({ length: step.total }, (_, i) => (
              <View
                key={i}
                className="h-1.5 rounded-full"
                style={{
                  width: i + 1 === step.current ? 22 : 6,
                  backgroundColor: i + 1 <= step.current ? '#1673D9' : '#D5DDE5',
                }}
              />
            ))}
          </View>
          <AppText className="text-[12.5px] font-vn-medium text-[#5A6772]">
            Bước {step.current}/{step.total}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

/** White body; `overlap` pulls it over the hero with the rounded top. */
export function AuthSheet({
  children,
  overlap,
  topInset,
}: {
  children: React.ReactNode;
  overlap?: boolean;
  /** For screens without a bar, so content clears the status bar. */
  topInset?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`flex-1 gap-[18px] bg-white px-5 pb-7 ${overlap ? 'rounded-t-[26px]' : ''}`}
      style={{
        marginTop: overlap ? -28 : 0,
        paddingTop: 26 + (topInset ? insets.top : 0),
      }}
    >
      {children}
    </View>
  );
}

type AuthIntroProps = {
  title: string;
  illustration: React.ReactNode;
  children: React.ReactNode;
  centered?: boolean;
  topPadding?: number;
};

export function AuthIntro({
  title,
  illustration,
  children,
  centered,
  topPadding = 0,
}: AuthIntroProps) {
  return (
    <View
      className={centered ? 'items-center gap-3' : 'items-start gap-2.5'}
      style={{ paddingTop: topPadding }}
    >
      {illustration}
      <AppText
        className={`text-[26px] font-vn-bold tracking-[-0.52px] ${centered ? 'text-center' : ''}`}
      >
        {title}
      </AppText>
      <AppText
        className={`text-[14.5px] leading-[21.75px] text-[#33414D] ${
          centered ? 'max-w-[320px] text-center' : ''
        }`}
      >
        {children}
      </AppText>
    </View>
  );
}
