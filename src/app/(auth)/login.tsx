import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { AuthHero, AuthScroll, AuthSheet } from '@/components/auth/auth-layout';
import {
  AuthButton,
  AuthError,
  AuthField,
  Divider,
  SocialButtons,
  TextLink,
} from '@/components/auth/auth-ui';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { validateLogin, type AuthFieldErrors } from '@/utils/auth-validation';
import { PolicySheet } from '@/components/post/policy-sheet';

const WRONG_CREDENTIALS = 'Email hoặc mật khẩu chưa đúng.';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState<'terms' | 'privacy' | null>(null);
  const wrongCredentials = error === WRONG_CREDENTIALS;

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function submit() {
    const errors = validateLogin(email, password);
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không đăng nhập được. Thử lại sau.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScroll>
      <AuthHero
        variant="login"
        action={{ kind: 'close', label: 'Đóng, tiếp tục xem không cần đăng nhập', onPress: close }}
      />
      <AuthSheet overlap>
        <AuthField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="ban@email.com"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          invalid={!!fieldErrors.email}
        />
        {fieldErrors.email ? <AuthError>{fieldErrors.email}</AuthError> : null}
        <View className="gap-2">
          <AuthField
            label="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            placeholder="Nhập mật khẩu"
            password
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            invalid={!!fieldErrors.password || wrongCredentials}
            labelAction={
              <TextLink
                label="Quên mật khẩu?"
                size={13}
                weight="semibold"
                onPress={() => router.replace('/forgot')}
              />
            }
          />
          {fieldErrors.password ? <AuthError>{fieldErrors.password}</AuthError> : null}
          {wrongCredentials ? (
            <AuthError>
              Email hoặc mật khẩu chưa đúng. Thử lại, hoặc bấm &quot;Quên mật khẩu?&quot; để đặt
              lại.
            </AuthError>
          ) : error ? (
            <AuthError>{error}</AuthError>
          ) : null}
        </View>
        <AuthButton label="Đăng nhập" onPress={submit} loading={loading} />
        <Divider label="hoặc" />
        <SocialButtons disabled={loading} onSignedIn={() => router.replace('/')} />
        <View className="flex-row items-center justify-center gap-1">
          <AppText className="text-[14px] text-[#33414D]">Chưa có tài khoản?</AppText>
          <TextLink label="Đăng ký" onPress={() => router.replace('/register')} />
        </View>
        <AppText className="text-center text-[12px] leading-[18px] text-[#5A6772]">
          Đăng nhập bằng Google hoặc Facebook nghĩa là bạn đồng ý với{' '}
          <AppText className="text-[12px] text-[#1673D9]" onPress={() => setPolicy('terms')}>
            Điều khoản
          </AppText>{' '}
          và{' '}
          <AppText className="text-[12px] text-[#1673D9]" onPress={() => setPolicy('privacy')}>
            Chính sách bảo mật
          </AppText>{' '}
          của Trao.
        </AppText>
      </AuthSheet>
      {policy ? <PolicySheet slug={policy} onClose={() => setPolicy(null)} /> : null}
    </AuthScroll>
  );
}
