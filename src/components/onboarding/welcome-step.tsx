import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TraoLogo } from '@/components/auth/trao-logo';
import { CatIcon, type CatIconKind } from '@/components/icons/cat-icon';
import { AppText } from '@/components/ui/app-text';
import { FooterButton } from './onboarding-ui';

const FORMS: { icon: CatIconKind; title: string; text: string }[] = [
  { icon: 'sale', title: 'Mua bán', text: 'Đồ quanh bạn, trả giá thoải mái' },
  { icon: 'auction', title: 'Đấu giá', text: 'Món hiếm, ai trả cao nhất thì được' },
  { icon: 'swap', title: 'Trao đổi', text: 'Đổi món không dùng lấy món cần' },
  { icon: 'gift', title: 'Cho tặng', text: 'Cho đi đồ còn tốt, nhận đồ miễn phí' },
];

type WelcomeStepProps = { onStart: () => void; onLogin: () => void };

export function WelcomeStep({ onStart, onLogin }: WelcomeStepProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#1673D9', '#0B4A99']}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={{ flex: 1 }}
    >
      <View className="flex-1 px-6" style={{ paddingTop: 56 + insets.top }}>
        <View
          className="h-[76px] w-[76px] items-center justify-center rounded-[22px] bg-white"
          style={{
            shadowColor: '#0B4A99',
            shadowOpacity: 0.35,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }}
        >
          <TraoLogo size={64} stem="#F7F1E6" />
        </View>
        <AppText className="mt-[22px] text-[34px] font-vn-bold tracking-[-0.68px] text-white">
          Trao
        </AppText>
        <AppText className="mt-1 text-[18px] font-vn-semibold text-[#D6E8FC]">
          Kho đồ của bạn
        </AppText>
        <View className="mt-9 gap-3">
          {FORMS.map((form) => (
            <View
              key={form.icon}
              className="flex-row items-center gap-3.5 rounded-2xl px-3.5 py-3"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
            >
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-white">
                <CatIcon kind={form.icon} size={30} />
              </View>
              <View className="flex-1 gap-px">
                <AppText className="text-[15.5px] font-vn-bold text-white">{form.title}</AppText>
                <AppText className="text-[13px] text-[#D6E8FC]">{form.text}</AppText>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View className="gap-2.5 px-6 pt-4" style={{ paddingBottom: 28 + insets.bottom }}>
        <FooterButton variant="yellow" label="Bắt đầu khám phá" onPress={onStart} />
        <Pressable
          accessibilityRole="button"
          onPress={onLogin}
          className="h-12 w-full items-center justify-center"
        >
          <AppText className="text-[15px] font-vn-semibold text-white">
            Đã có tài khoản? Đăng nhập
          </AppText>
        </Pressable>
        <AppText className="text-center text-[12px] leading-[18px] text-[#B9D6F7]">
          Xem đồ không cần tài khoản. Cần đăng ký khi nhắn tin, trả giá hay đăng tin.
        </AppText>
      </View>
    </LinearGradient>
  );
}
