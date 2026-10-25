import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { TraoLogo } from '@/components/auth/trao-logo';
import { AuthButton, SocialButtons, TextLink } from '@/components/auth/auth-ui';
import { AppText } from '@/components/ui/app-text';
import { openPolicies } from '@/utils/open-policies';

const PERKS = [
  'Nhắn tin, trả giá, đổi, nhận đồ tặng',
  'Đăng tin và giữ đồ trong Kho đồ',
  'Có hồ sơ uy tín, nhận tiền thưởng',
];

/** Shown to guests who tap something that needs an account; closing returns to where they were. */
export default function AuthGateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="h-14 flex-row items-center px-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng"
          onPress={close}
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
          >
            <Path d="M6 6l12 12M18 6L6 18" />
          </Svg>
        </Pressable>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <TraoLogo size={64} stem="#F7F1E6" />
        <AppText className="mt-5 text-[26px] font-vn-bold leading-[32.5px] tracking-[-0.26px]">
          Cùng xây chợ đồ cũ của mình
        </AppText>
        <AppText className="mt-2.5 text-[15px] leading-[24px] text-[#33414D]">
          Trao là cộng đồng nơi đồ còn tốt được trao tay thay vì bỏ xó. Tham gia hoàn toàn miễn phí
          — đăng ký thành viên để cùng mua bán, trao đổi và cho tặng với những người quanh bạn.
        </AppText>
        <View className="mt-5 gap-2.5">
          {PERKS.map((perk) => (
            <View key={perk} className="flex-row items-center gap-2.5">
              <View className="h-6 w-6 items-center justify-center rounded-full bg-[#E3F4EA]">
                <Svg
                  width={13}
                  height={13}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2F9E63"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="M5 12l5 5 9-10" />
                </Svg>
              </View>
              <AppText className="flex-1 text-[14px]">{perk}</AppText>
            </View>
          ))}
        </View>
      </ScrollView>
      <View className="gap-2.5 px-6 pt-4" style={{ paddingBottom: 24 + insets.bottom }}>
        <SocialButtons />
        <AuthButton label="Dùng email" onPress={() => router.replace('/login')} />
        <View className="mt-1 flex-row items-center justify-center gap-1">
          <AppText className="text-[14px] text-[#33414D]">Chưa có tài khoản?</AppText>
          <TextLink label="Đăng ký" onPress={() => router.replace('/register')} />
        </View>
        <AppText className="text-center text-[12px] leading-[18px] text-[#5A6772]">
          Tiếp tục nghĩa là bạn đồng ý với{' '}
          <AppText className="text-[12px] text-[#1673D9]" onPress={openPolicies}>
            Điều khoản
          </AppText>{' '}
          và{' '}
          <AppText className="text-[12px] text-[#1673D9]" onPress={openPolicies}>
            Chính sách bảo mật
          </AppText>{' '}
          của Trao.
        </AppText>
      </View>
    </View>
  );
}
