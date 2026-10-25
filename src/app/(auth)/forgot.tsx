import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { LockArt } from '@/components/auth/auth-art';
import { AuthBar, AuthIntro, AuthScroll, AuthSheet } from '@/components/auth/auth-layout';
import { AuthButton, AuthError, AuthField, TextLink } from '@/components/auth/auth-ui';
import { AppText } from '@/components/ui/app-text';
import { sendPasswordReset } from '@/services/firebase-auth';
import { validateEmail } from '@/utils/auth-validation';

export default function ForgotScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const invalid = validateEmail(email);
    setError(invalid ?? null);
    if (invalid) return;

    setLoading(true);
    try {
      await sendPasswordReset(email);
      router.replace({ pathname: '/sent', params: { kind: 'reset', email: email.trim() } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không gửi được link. Thử lại sau.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScroll>
      <AuthBar
        action={{ kind: 'back', label: 'Quay lại', onPress: () => router.replace('/login') }}
        step={{ current: 1, total: 2 }}
      />
      <AuthSheet>
        <AuthIntro title="Quên mật khẩu?" illustration={<LockArt />}>
          Nhập email bạn đã đăng ký. Trao sẽ gửi một link để bạn đặt mật khẩu mới.
        </AuthIntro>
        <AuthField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="ban@email.com"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="go"
          onSubmitEditing={submit}
          invalid={!!error}
        />
        {error ? <AuthError>{error}</AuthError> : null}
        <AuthButton label="Gửi link đặt lại" onPress={submit} loading={loading} />
        <View className="flex-row items-center justify-center gap-1">
          <AppText className="text-[14px] text-[#33414D]">Nhớ ra rồi?</AppText>
          <TextLink label="Đăng nhập" onPress={() => router.replace('/login')} />
        </View>
      </AuthSheet>
    </AuthScroll>
  );
}
