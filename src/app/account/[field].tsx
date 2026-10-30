import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthButton, AuthError, AuthField } from '@/components/auth/auth-ui';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchMyAccount,
  MY_ACCOUNT_QUERY_KEY,
  patchMyAccount,
} from '@/services/account/account-api';
import { MY_PROFILE_QUERY_KEY } from '@/services/profile/profile-api';
import type { MyAccount } from '@/types/account';
import { BIO_MAX_LENGTH, validateTextField, type TextField } from '@/utils/account-validation';
import { FieldSkeleton } from '@/components/ui/skeletons';

const FIELDS: Record<
  TextField,
  {
    title: string;
    key: 'displayName' | 'username' | 'bio';
    placeholder: string;
    hint: string;
    current: (account: MyAccount) => string | null;
  }
> = {
  name: {
    title: 'Tên hiển thị',
    key: 'displayName',
    placeholder: 'Tên bạn muốn mọi người thấy',
    hint: 'Hiện trên hồ sơ, tin đăng và tin nhắn của bạn.',
    current: (account) => account.displayName,
  },
  username: {
    title: 'Tên người dùng',
    key: 'username',
    placeholder: 'vd: minhanh',
    hint: 'Chữ không dấu, số, dấu chấm và gạch dưới. Hiện dạng @tên, không trùng người khác.',
    current: (account) => account.username,
  },
  bio: {
    title: 'Giới thiệu',
    key: 'bio',
    placeholder: 'Bạn thích đồ gì, hay giao dịch ở đâu…',
    hint: '',
    current: (account) => account.bio,
  },
};

function isTextField(value: string | undefined): value is TextField {
  return value === 'name' || value === 'username' || value === 'bio';
}

/** Edit screen of one public profile field: display name, username or bio. */
export default function AccountTextEditScreen() {
  const { field } = useLocalSearchParams<{ field: string }>();
  if (!isTextField(field)) return <Redirect href="/account" />;
  return <TextEdit field={field} />;
}

function TextEdit({ field }: { field: TextField }) {
  const config = FIELDS[field];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session, getIdToken, refreshProfile } = useAuth();
  // What the user typed; null until they type, so the field shows the saved value before that.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bioFocused, setBioFocused] = useState(false);

  const { data: account, isPending } = useQuery({
    queryKey: [...MY_ACCOUNT_QUERY_KEY, session?.uid],
    queryFn: async () => fetchMyAccount(await getIdToken()),
    enabled: !!session,
  });

  const initial = account ? (config.current(account) ?? '') : '';
  const value = draft ?? initial;
  const setValue = setDraft;

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/account');
  };

  async function save() {
    const invalid = validateTextField(field, value);
    setError(invalid ?? null);
    if (invalid) return;

    setSaving(true);
    try {
      await patchMyAccount(await getIdToken(), { [config.key]: value.trim() });
      // The display name is also on the Firebase user: renew the token so it does not write the old one back.
      if (field === 'name') await refreshProfile().catch(() => undefined);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: MY_ACCOUNT_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY }),
      ]);
      back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không lưu được. Thử lại sau.');
      setSaving(false);
    }
  }

  const dirty = value !== initial;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <ScreenBar title={config.title} onBack={back} />
      {isPending || !account ? (
        <FieldSkeleton tall={field === 'bio'} />
      ) : (
        <>
          <View className="flex-1 gap-3 px-5 pt-5">
            {field === 'bio' ? (
              <View className="gap-2">
                <AppText className="text-[13.5px] font-vn-semibold">Giới thiệu</AppText>
                <TextInput
                  accessibilityLabel="Giới thiệu"
                  value={value}
                  onChangeText={(text) => {
                    setValue(text);
                    setError(null);
                  }}
                  onFocus={() => setBioFocused(true)}
                  onBlur={() => setBioFocused(false)}
                  placeholder={config.placeholder}
                  placeholderTextColor="#8794A1"
                  maxLength={BIO_MAX_LENGTH}
                  multiline
                  textAlignVertical="top"
                  className={`h-32 rounded-[14px] border-[1.5px] bg-white px-4 py-3 font-vn text-[15px] text-[#0F2440] ${
                    error
                      ? 'border-[#D92D20]'
                      : bioFocused
                        ? 'border-[#1673D9]'
                        : 'border-[#D5DDE5]'
                  }`}
                />
                <AppText className="text-right text-[12.5px] text-[#5A6772]">
                  {value.length}/{BIO_MAX_LENGTH}
                </AppText>
              </View>
            ) : (
              <AuthField
                label={config.title}
                value={value}
                onChangeText={(text) => {
                  setValue(text);
                  setError(null);
                }}
                placeholder={config.placeholder}
                autoCapitalize={field === 'username' ? 'none' : 'words'}
                autoComplete="off"
                returnKeyType="done"
                onSubmitEditing={save}
                invalid={!!error}
              />
            )}
            {error ? <AuthError>{error}</AuthError> : null}
            {config.hint ? (
              <AppText className="text-[12.5px] leading-[19px] text-[#5A6772]">
                {config.hint}
              </AppText>
            ) : null}
          </View>
          <View
            className="border-t border-[#EEF2F6] px-5 pt-3"
            style={{ paddingBottom: 20 + insets.bottom }}
          >
            <AuthButton label="Lưu" onPress={save} loading={saving} disabled={!dirty} />
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}
