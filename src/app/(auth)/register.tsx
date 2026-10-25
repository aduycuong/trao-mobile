import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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
import { sendVerificationEmail } from '@/services/firebase-auth';
import {
  getPasswordStrength,
  validateRegistration,
  type AuthFieldErrors,
} from '@/utils/auth-validation';
import { openPolicies } from '@/utils/open-policies';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const strength = getPasswordStrength(password);

  async function submit() {
    const errors = validateRegistration(displayName, email, password, acceptTerms);
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await register(displayName, email, password);
      // The account exists either way; a failed send can be retried from the next screen.
      await sendVerificationEmail().catch(() => {});
      router.replace({ pathname: '/sent', params: { kind: 'register', email: email.trim() } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tạo được tài khoản. Thử lại sau.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScroll>
      <AuthHero
        variant="register"
        action={{
          kind: 'back',
          label: 'Quay lại đăng nhập',
          onPress: () => router.replace('/login'),
        }}
      />
      <AuthSheet overlap>
        <AuthField
          label="Tên hiển thị"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Tên người khác sẽ thấy khi giao dịch"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          invalid={!!fieldErrors.displayName}
        />
        {fieldErrors.displayName ? <AuthError>{fieldErrors.displayName}</AuthError> : null}
        <AuthField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="Dùng để đăng nhập và nhận thông báo"
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
            placeholder="Ít nhất 8 ký tự, có chữ và số"
            password
            autoComplete="new-password"
            textContentType="newPassword"
            invalid={!!fieldErrors.password}
          />
          {password ? (
            <View className="flex-row items-center gap-2">
              {[1, 2, 3].map((n) => (
                <View
                  key={n}
                  className="h-1 flex-1 rounded-full"
                  style={{ backgroundColor: n <= strength.level ? '#1673D9' : '#E3E8ED' }}
                />
              ))}
              <AppText className="text-[12px] font-vn-semibold text-[#1673D9]">
                {strength.label}
              </AppText>
            </View>
          ) : null}
          {fieldErrors.password ? <AuthError>{fieldErrors.password}</AuthError> : null}
        </View>
        <View className="gap-2">
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptTerms }}
            onPress={() => setAcceptTerms((v) => !v)}
            className="flex-row items-start gap-2.5"
          >
            <View
              className={`mt-px h-5 w-5 items-center justify-center rounded-[5px] border-[1.5px] ${
                acceptTerms ? 'border-[#1673D9] bg-[#1673D9]' : 'border-[#D5DDE5] bg-white'
              }`}
            >
              {acceptTerms ? (
                <Svg
                  width={13}
                  height={13}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="M5 12l5 5 9-10" />
                </Svg>
              ) : null}
            </View>
            <AppText className="flex-1 text-[13px] leading-[18.85px] text-[#33414D]">
              Tôi đồng ý với{' '}
              <AppText
                className="text-[13px] font-vn-semibold text-[#1673D9]"
                onPress={openPolicies}
              >
                Điều khoản sử dụng
              </AppText>
              ,{' '}
              <AppText
                className="text-[13px] font-vn-semibold text-[#1673D9]"
                onPress={openPolicies}
              >
                Chính sách bảo mật
              </AppText>{' '}
              và cam kết không đăng hàng cấm.
            </AppText>
          </Pressable>
          {fieldErrors.terms ? <AuthError>{fieldErrors.terms}</AuthError> : null}
        </View>
        {error ? <AuthError>{error}</AuthError> : null}
        <AuthButton label="Tạo tài khoản" onPress={submit} loading={loading} />
        <Divider label="hoặc đăng ký nhanh với" />
        <SocialButtons />
        <View className="flex-row items-center justify-center gap-1">
          <AppText className="text-[14px] text-[#33414D]">Đã có tài khoản?</AppText>
          <TextLink label="Đăng nhập" onPress={() => router.replace('/login')} />
        </View>
      </AuthSheet>
    </AuthScroll>
  );
}
