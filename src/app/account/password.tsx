import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthButton, AuthError, AuthField } from '@/components/auth/auth-ui';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import {
  getPasswordStrength,
  validateChangePassword,
  validateSetPassword,
  type AuthFieldErrors,
} from '@/utils/auth-validation';

type Errors = AuthFieldErrors & { currentPassword?: string };

/**
 * Change the password (the current one is asked first), or set one for an account that only
 * signs in with Google or Facebook.
 */
export default function AccountPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { changePassword, setPassword: setNewPassword, canChangePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const strength = getPasswordStrength(password);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/account');
  };

  async function submit() {
    const errors = canChangePassword
      ? validateChangePassword(currentPassword, password, confirmPassword)
      : validateSetPassword(password, confirmPassword);
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      if (canChangePassword) await changePassword(currentPassword, password);
      else await setNewPassword(password);
      Alert.alert(canChangePassword ? 'Đã đổi mật khẩu' : 'Đã đặt mật khẩu');
      back();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : canChangePassword
            ? 'Không đổi được mật khẩu. Thử lại sau.'
            : 'Không đặt được mật khẩu. Thử lại sau.'
      );
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <ScreenBar title={canChangePassword ? 'Đổi mật khẩu' : 'Đặt mật khẩu'} onBack={back} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-[18px] px-5 pt-5"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {canChangePassword ? null : (
          <AppText className="text-[14px] leading-normal text-[#33414D]">
            Tài khoản này đăng nhập bằng Google hoặc Facebook. Đặt mật khẩu để có thể đăng nhập bằng
            email nữa.
          </AppText>
        )}
        {canChangePassword ? (
          <View className="gap-2">
            <AuthField
              label="Mật khẩu hiện tại"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Mật khẩu hiện tại"
              password
              autoComplete="current-password"
              textContentType="password"
              invalid={!!fieldErrors.currentPassword}
            />
            {fieldErrors.currentPassword ? (
              <AuthError>{fieldErrors.currentPassword}</AuthError>
            ) : null}
          </View>
        ) : null}
        <View className="gap-2">
          <AuthField
            label="Mật khẩu mới"
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
                  style={{
                    backgroundColor:
                      n <= strength.level
                        ? strength.level === 1
                          ? '#D92D20'
                          : '#1673D9'
                        : '#E3E8ED',
                  }}
                />
              ))}
              <AppText
                className={`text-[12px] font-vn-semibold ${
                  strength.level === 1 ? 'text-[#D92D20]' : 'text-[#1673D9]'
                }`}
              >
                {strength.label}
              </AppText>
            </View>
          ) : null}
          {fieldErrors.password ? <AuthError>{fieldErrors.password}</AuthError> : null}
        </View>
        <View className="gap-2">
          <AuthField
            label="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Nhập lại mật khẩu mới"
            password
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={submit}
            invalid={!!fieldErrors.confirmPassword}
          />
          {fieldErrors.confirmPassword ? (
            <AuthError>{fieldErrors.confirmPassword}</AuthError>
          ) : null}
        </View>
        {error ? <AuthError>{error}</AuthError> : null}
      </ScrollView>
      <View
        className="border-t border-[#EEF2F6] px-5 pt-3"
        style={{ paddingBottom: 20 + insets.bottom }}
      >
        <AuthButton
          label={canChangePassword ? 'Đổi mật khẩu' : 'Đặt mật khẩu'}
          onPress={submit}
          loading={saving}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
