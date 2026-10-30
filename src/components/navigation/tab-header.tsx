import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { TraoLogo } from '@/components/auth/trao-logo';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';

/** Header shared by the tab screens (canvas Main): logo, tagline and the bell. */
export function TabHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();

  return (
    <View
      className="flex-row items-center gap-0.5 overflow-hidden pb-1 pl-4 pr-2"
      style={{ paddingTop: 16 + insets.top }}
    >
      <View
        pointerEvents="none"
        className="absolute rounded-full bg-[#FFE7A0]"
        style={{ top: -52, right: 78, width: 124, height: 124 }}
      />
      <View
        pointerEvents="none"
        className="absolute rounded-full bg-[#C4DEFB]"
        style={{ top: 34 + insets.top, right: -18, width: 58, height: 58 }}
      />
      <View className="mr-2.5">
        <TraoLogo size={36} stem="#F7F1E6" />
      </View>
      <View className="min-w-0 flex-1 gap-px">
        <AppText className="text-[24px] font-vn-bold leading-[27.6px] tracking-[-0.48px]">
          Trao
        </AppText>
        <AppText numberOfLines={1} className="text-[13px] font-vn-medium text-[#1673D9]">
          Kho đồ của bạn
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Thông báo"
        onPress={() => {
          // Notifications come later; a guest is asked to sign in first (canvas Main `openNotifs`).
          if (!session) router.push('/auth-gate');
        }}
        className="h-11 w-11 items-center justify-center rounded-full"
      >
        <Svg
          width={23}
          height={23}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0F2440"
          strokeWidth={1.8}
          strokeLinejoin="round"
        >
          <Path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
          <Path d="M10 20.5a2 2 0 0 0 4 0" />
        </Svg>
      </Pressable>
    </View>
  );
}
