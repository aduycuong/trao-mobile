import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { CheckArt } from '@/components/auth/auth-art';
import { AuthIntro, AuthScroll, AuthSheet } from '@/components/auth/auth-layout';
import { AuthButton } from '@/components/auth/auth-ui';

const COPY = {
  welcome: {
    title: 'Chào mừng đến với Trao!',
    text: 'Chọn khu vực và vài danh mục bạn quan tâm để Trao gợi ý món hợp với bạn.',
    primary: 'Chọn khu vực & sở thích',
    secondary: 'Để sau',
  },
  'password-reset': {
    title: 'Đã đặt lại mật khẩu',
    text: 'Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.',
    primary: 'Đăng nhập',
    secondary: undefined,
  },
} as const;

export default function DoneScreen() {
  const router = useRouter();
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const copy = COPY[kind === 'password-reset' ? 'password-reset' : 'welcome'];
  const reset = kind === 'password-reset';

  // Region and interest picking is a separate flow that is not built yet, so both go home.
  const primary = () => router.replace(reset ? '/login' : '/');

  return (
    <AuthScroll>
      <AuthSheet topInset>
        <AuthIntro centered topPadding={64} title={copy.title} illustration={<CheckArt />}>
          {copy.text}
        </AuthIntro>
        <View className="flex-1" />
        <View className="gap-2.5">
          <AuthButton label={copy.primary} onPress={primary} />
          {copy.secondary ? (
            <AuthButton
              variant="tinted"
              label={copy.secondary}
              onPress={() => router.replace('/')}
            />
          ) : null}
        </View>
      </AuthSheet>
    </AuthScroll>
  );
}
