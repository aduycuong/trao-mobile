import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LockArt } from '@/components/auth/auth-art';
import { AuthBar, AuthIntro, AuthScroll, AuthSheet } from '@/components/auth/auth-layout';
import { AuthButton, AuthError, AuthField } from '@/components/auth/auth-ui';
import { AppText } from '@/components/ui/app-text';
import { confirmReset, verifyResetCode } from '@/services/firebase-auth';
import {
  PASSWORD_MIN_LENGTH,
  validateResetPassword,
  type AuthFieldErrors,
} from '@/utils/auth-validation';

function RuleItem({ label, met }: { label: string; met: boolean }) {
  return (
    <View className="flex-row items-center gap-2">
      <View
        className={`h-[18px] w-[18px] items-center justify-center rounded-full ${
          met ? 'bg-[#1673D9]' : 'bg-[#E3E8ED]'
        }`}
      >
        <CheckGlyph color={met ? '#FFFFFF' : '#8794A1'} />
      </View>
      <AppText className="text-[13px] text-[#33414D]">{label}</AppText>
    </View>
  );
}

function CheckGlyph({ color }: { color: string }) {
  return (
    <Svg
      width={11}
      height={11}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M5 12l4 4 10-10" />
    </Svg>
  );
}

const LINK_GONE = 'Link không còn dùng được. Hãy yêu cầu link mới.';

/** Opened from the link in the reset email (`trao://reset?oobCode=…`). */
export default function ResetScreen() {
  const router = useRouter();
  const { oobCode } = useLocalSearchParams<{ oobCode?: string }>();
  const [email, setEmail] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const linkError = oobCode ? verifyError : LINK_GONE;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!oobCode) return;
    verifyResetCode(oobCode)
      .then(setEmail)
      .catch((caught) => setVerifyError(caught instanceof Error ? caught.message : LINK_GONE));
  }, [oobCode]);

  const close = () => router.replace('/login');

  async function submit() {
    const errors = validateResetPassword(password, confirm);
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0 || !oobCode) return;

    setLoading(true);
    try {
      await confirmReset(oobCode, password);
      router.replace({ pathname: '/done', params: { kind: 'password-reset' } });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Không đặt lại được mật khẩu. Thử lại sau.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (linkError) {
    return (
      <AuthScroll>
        <AuthBar action={{ kind: 'close', label: 'Đóng', onPress: close }} />
        <AuthSheet>
          <AuthError>{linkError}</AuthError>
          <AuthButton label="Về đăng nhập" onPress={close} />
        </AuthSheet>
      </AuthScroll>
    );
  }

  if (!email) {
    return (
      <AuthScroll>
        <AuthBar action={{ kind: 'close', label: 'Đóng', onPress: close }} />
        <View className="items-center pt-16">
          <ActivityIndicator color="#1673D9" />
        </View>
      </AuthScroll>
    );
  }

  return (
    <AuthScroll>
      <AuthBar
        action={{ kind: 'close', label: 'Đóng', onPress: close }}
        step={{ current: 2, total: 2 }}
      />
      <AuthSheet>
        <AuthIntro title="Đặt mật khẩu mới" illustration={<LockArt />}>
          Cho tài khoản <AppText className="font-vn-bold">{email}</AppText>. Sau khi đổi, các thiết
          bị khác đang đăng nhập sẽ bị đăng xuất.
        </AuthIntro>
        <AuthField
          label="Mật khẩu mới"
          value={password}
          onChangeText={setPassword}
          placeholder="Ít nhất 8 ký tự, có chữ và số"
          password
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          invalid={!!fieldErrors.password}
        />
        {fieldErrors.password ? <AuthError>{fieldErrors.password}</AuthError> : null}
        <AuthField
          label="Nhập lại mật khẩu mới"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Nhập lại để chắc chắn"
          password
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
          invalid={!!fieldErrors.confirmPassword}
        />
        {fieldErrors.confirmPassword ? <AuthError>{fieldErrors.confirmPassword}</AuthError> : null}
        <View className="gap-1.5">
          <RuleItem
            label={`Ít nhất ${PASSWORD_MIN_LENGTH} ký tự`}
            met={password.length >= PASSWORD_MIN_LENGTH}
          />
          <RuleItem
            label="Có cả chữ và số"
            met={/[A-Za-z]/.test(password) && /\d/.test(password)}
          />
        </View>
        {error ? <AuthError>{error}</AuthError> : null}
        <AuthButton label="Đặt lại mật khẩu" onPress={submit} loading={loading} />
      </AuthSheet>
    </AuthScroll>
  );
}
