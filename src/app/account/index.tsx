import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { ConfirmSheet } from '@/components/me/confirm-sheet';
import { UserAvatar } from '@/components/me/user-avatar';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import {
  deleteMyAccount,
  fetchMyAccount,
  MY_ACCOUNT_QUERY_KEY,
  patchMyAccount,
} from '@/services/account/account-api';
import {
  CameraPermissionError,
  pickAvatar,
  uploadAvatar,
  type AvatarSource,
} from '@/services/avatar-upload';
import { getFirebaseAuth } from '@/services/firebase';
import { sendVerificationEmail } from '@/services/firebase-auth';
import {
  linkSocialProvider,
  SOCIAL_PROVIDER_NAMES,
  unlinkSocialProvider,
  type SocialProvider,
} from '@/services/social-auth';
import { MY_PROFILE_QUERY_KEY } from '@/services/profile/profile-api';

type TagTone = 'ok' | 'need' | 'plain';

const TAG_SKIN: Record<TagTone, { box: string; text: string }> = {
  ok: { box: 'bg-[#E3F4EA]', text: 'text-[#1E6B43]' },
  need: { box: 'bg-[#FFF4D6]', text: 'text-[#8A5A00]' },
  plain: { box: 'bg-[#F2F5F8]', text: 'text-[#5A6772]' },
};

type RowProps = {
  label: string;
  value: string;
  /** Greyed value, for "Chưa có". */
  muted?: boolean;
  tag?: { text: string; tone: TagTone };
  onPress: () => void;
};

function Row({ label, value, muted, tag, onPress }: RowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-[58px] flex-row items-center gap-3 border-b border-[#F2F5F8] px-4 py-2"
    >
      <View className="min-w-0 flex-1 gap-0.5">
        <AppText className="text-[12.5px] text-[#5A6772]">{label}</AppText>
        <AppText
          numberOfLines={1}
          className={`text-[15px] font-vn-medium ${muted ? 'text-[#A3AEB9]' : ''}`}
        >
          {value}
        </AppText>
      </View>
      {tag ? (
        <View className={`h-6 justify-center rounded-full px-2 ${TAG_SKIN[tag.tone].box}`}>
          <AppText className={`text-[12px] font-vn-bold ${TAG_SKIN[tag.tone].text}`}>
            {tag.text}
          </AppText>
        </View>
      ) : null}
      <Svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#A3AEB9"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M9 6l6 6-6 6" />
      </Svg>
    </Pressable>
  );
}

function Group({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-2.5 border-t-8 border-[#F2F5F8]">
      <AppText
        accessibilityRole="header"
        className="px-4 pb-0.5 pt-3.5 text-[13px] font-vn-semibold text-[#5A6772]"
      >
        {title}
      </AppText>
      {note ? (
        <AppText className="px-4 pb-1 text-[12.5px] leading-[18px] text-[#5A6772]">{note}</AppText>
      ) : null}
      {children}
    </View>
  );
}

const OK_TAG = (text: string) => ({ text: `✓ ${text}`, tone: 'ok' as const });

/** Tài khoản (canvas Account): public profile, verification, sign-in methods, delete account. */
export default function AccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, getIdToken, signOut, refreshProfile, canChangePassword } = useAuth();
  const [askDelete, setAskDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [linking, setLinking] = useState<SocialProvider | null>(null);
  const [askUnlink, setAskUnlink] = useState<SocialProvider | null>(null);

  const {
    data: account,
    error,
    refetch,
    isPending,
    isRefetching,
  } = useQuery({
    queryKey: [...MY_ACCOUNT_QUERY_KEY, session?.uid],
    queryFn: async () => fetchMyAccount(await getIdToken()),
    enabled: !!session,
  });

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/me');
  };

  const providers = getFirebaseAuth()?.currentUser?.providerData ?? [];
  const google = providers.find((item) => item.providerId === 'google.com');
  const facebook = providers.find((item) => item.providerId === 'facebook.com');

  async function changeAvatar(source: AvatarSource) {
    try {
      const uri = await pickAvatar(source);
      if (!uri) return;
      setUploading(true);
      const token = await getIdToken();
      const { key } = await uploadAvatar(token, uri);
      if (!key) throw new Error('Không tải được ảnh lên. Vui lòng thử lại.');
      await patchMyAccount(token, { avatarKey: key });
      await refreshProfile();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: MY_ACCOUNT_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY }),
      ]);
    } catch (caught) {
      if (caught instanceof CameraPermissionError) {
        Alert.alert(
          'Chưa mở được máy ảnh',
          'Hãy cho phép Trao dùng máy ảnh trong phần cài đặt của máy.',
          caught.canAskAgain
            ? [{ text: 'Đóng' }]
            : [{ text: 'Đóng' }, { text: 'Mở cài đặt', onPress: () => Linking.openSettings() }]
        );
      } else {
        Alert.alert(
          'Không đổi được ảnh đại diện',
          caught instanceof Error ? caught.message : 'Thử lại sau.'
        );
      }
    } finally {
      setUploading(false);
    }
  }

  function askAvatarSource() {
    if (uploading) return;
    Alert.alert('Đổi ảnh đại diện', undefined, [
      { text: 'Chụp ảnh', onPress: () => void changeAvatar('camera') },
      { text: 'Chọn từ thư viện', onPress: () => void changeAvatar('library') },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  }

  async function resendEmailVerification() {
    if (!account || sendingEmail) return;
    setSendingEmail(true);
    try {
      await sendVerificationEmail();
      Alert.alert('Đã gửi link xác minh', `Kiểm tra hộp thư ${account.email} nhé.`);
    } catch (caught) {
      Alert.alert('Không gửi được link', caught instanceof Error ? caught.message : 'Thử lại sau.');
    } finally {
      setSendingEmail(false);
    }
  }

  function openPassword() {
    router.push('/account/password');
  }

  async function afterProviderChange() {
    // Re-reads the Firebase user so the rows below show the new sign-in methods.
    await refreshProfile();
    await queryClient.invalidateQueries({ queryKey: MY_ACCOUNT_QUERY_KEY });
  }

  async function toggleProvider(provider: SocialProvider) {
    if (linking) return;
    const linked = provider === 'google' ? google : facebook;
    if (linked) {
      setAskUnlink(provider);
      return;
    }
    setLinking(provider);
    try {
      if (await linkSocialProvider(provider)) {
        await afterProviderChange();
        Alert.alert(`Đã liên kết ${SOCIAL_PROVIDER_NAMES[provider]}.`);
      }
    } catch (caught) {
      Alert.alert('Không liên kết được', caught instanceof Error ? caught.message : 'Thử lại sau.');
    } finally {
      setLinking(null);
    }
  }

  async function unlinkProvider(provider: SocialProvider) {
    try {
      await unlinkSocialProvider(provider);
      await afterProviderChange();
      Alert.alert(`Đã bỏ liên kết ${SOCIAL_PROVIDER_NAMES[provider]}.`);
    } catch (caught) {
      Alert.alert(
        'Không bỏ liên kết được',
        caught instanceof Error ? caught.message : 'Thử lại sau.'
      );
    } finally {
      setAskUnlink(null);
    }
  }

  async function removeAccount() {
    try {
      await deleteMyAccount(await getIdToken());
    } catch (caught) {
      setAskDelete(false);
      Alert.alert(
        'Không xoá được tài khoản',
        caught instanceof Error ? caught.message : 'Thử lại sau.'
      );
      return;
    }
    await signOut();
    router.replace('/');
  }

  return (
    <View className="flex-1 bg-white">
      <ScreenBar title="Tài khoản" onBack={back} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-5"
        refreshControl={
          <RefreshControl refreshing={isRefetching && !isPending} onRefresh={() => refetch()} />
        }
      >
        {isPending ? (
          <View className="items-center py-10">
            <AppText className="text-[14px] text-[#5A6772]">Đang tải…</AppText>
          </View>
        ) : null}
        {error ? (
          <View accessibilityRole="alert" className="m-4 rounded-2xl bg-[#FDECEA] px-4 py-3">
            <AppText className="text-[14px] text-[#B42318]">{error.message}</AppText>
            <Pressable onPress={() => refetch()} className="mt-1.5">
              <AppText className="text-[14px] font-vn-semibold text-[#B42318] underline">
                Thử lại
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {account ? (
          <>
            <View className="items-center gap-2 px-4 pb-2 pt-5">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đổi ảnh đại diện"
                disabled={uploading}
                onPress={askAvatarSource}
                style={{ opacity: uploading ? 0.6 : 1 }}
              >
                <UserAvatar
                  name={account.displayName}
                  avatarUrl={account.avatarUrl}
                  size={88}
                  textClassName="text-[30px]"
                />
                <View
                  className="absolute h-8 w-8 items-center justify-center rounded-full bg-[#1673D9]"
                  style={{ right: -2, bottom: -2, borderWidth: 3, borderColor: '#FFFFFF' }}
                >
                  <Svg
                    width={15}
                    height={15}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Rect x={3} y={7} width={18} height={13} rx={2} />
                    <Circle cx={12} cy={13.5} r={3.5} />
                    <Path d="M8 7l1.5-3h5L16 7" />
                  </Svg>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={uploading}
                onPress={askAvatarSource}
                className="h-8 justify-center px-2"
              >
                <AppText className="text-[13.5px] font-vn-semibold text-[#1673D9]">
                  {uploading ? 'Đang tải ảnh…' : 'Đổi ảnh đại diện'}
                </AppText>
              </Pressable>
            </View>

            <Group title="Hồ sơ công khai">
              <Row
                label="Tên hiển thị"
                value={account.displayName ?? 'Chưa có'}
                muted={!account.displayName}
                onPress={() => router.push('/account/name')}
              />
              <Row
                label="Tên người dùng"
                value={account.username ? `@${account.username}` : 'Chưa có'}
                muted={!account.username}
                onPress={() => router.push('/account/username')}
              />
              <Row
                label="Giới thiệu"
                value={account.bio || 'Chưa có'}
                muted={!account.bio}
                onPress={() => router.push('/account/bio')}
              />
              <Row
                label="Khu vực"
                value={account.areaName ?? 'Chưa chọn'}
                muted={!account.areaName}
                tag={
                  account.areaName ? { text: 'công khai phường, tỉnh', tone: 'plain' } : undefined
                }
                onPress={() => router.push('/account/area')}
              />
            </Group>

            <Group
              title="Xác minh"
              note="Xác minh số điện thoại thì tài khoản lên mức Đã xác thực. Số điện thoại không hiện công khai."
            >
              <Row
                label="Email"
                value={account.email}
                tag={
                  account.emailVerified ? OK_TAG('Đã xác minh') : { text: 'Xác minh', tone: 'need' }
                }
                onPress={account.emailVerified ? () => {} : () => void resendEmailVerification()}
              />
              {account.maskedPhone ? (
                <Row
                  label="Số điện thoại"
                  value={account.maskedPhone}
                  tag={OK_TAG('Đã xác minh')}
                  onPress={() =>
                    router.push({ pathname: '/verify-phone', params: { change: '1' } })
                  }
                />
              ) : (
                <Row
                  label="Số điện thoại"
                  value="Chưa có"
                  muted
                  tag={{ text: 'Xác minh', tone: 'need' }}
                  onPress={() => router.push('/verify-phone')}
                />
              )}
            </Group>

            <Group title="Đăng nhập">
              <Row
                label="Mật khẩu"
                value={canChangePassword ? 'Đổi mật khẩu' : 'Đặt mật khẩu'}
                onPress={openPassword}
              />
              <Row
                label="Google"
                value={
                  linking === 'google'
                    ? 'Đang liên kết…'
                    : google
                      ? (google.email ?? 'Đã liên kết')
                      : 'Chưa liên kết'
                }
                muted={!google}
                tag={google ? OK_TAG('Đã liên kết') : undefined}
                onPress={() => void toggleProvider('google')}
              />
              <Row
                label="Facebook"
                value={
                  linking === 'facebook'
                    ? 'Đang liên kết…'
                    : facebook
                      ? (facebook.email ?? 'Đã liên kết')
                      : 'Chưa liên kết'
                }
                muted={!facebook}
                tag={facebook ? OK_TAG('Đã liên kết') : undefined}
                onPress={() => void toggleProvider('facebook')}
              />
            </Group>

            <View className="mt-2.5 border-t-8 border-[#F2F5F8] p-4">
              <Pressable
                accessibilityRole="button"
                onPress={() => setAskDelete(true)}
                className="h-12 items-center justify-center rounded-[14px] border-[1.5px] border-[#F6C9C4] bg-white"
              >
                <AppText className="text-[15px] font-vn-semibold text-[#B42318]">
                  Xoá tài khoản
                </AppText>
              </Pressable>
              <AppText className="mt-2 text-center text-[12.5px] leading-[18.75px] text-[#5A6772]">
                Chỉ xoá được khi không còn giao dịch đang dở. Lịch sử giao dịch và đánh giá vẫn giữ
                cho người đã giao dịch với bạn.
              </AppText>
            </View>
          </>
        ) : null}
      </ScrollView>

      {askUnlink ? (
        <ConfirmSheet
          title={`Bỏ liên kết ${SOCIAL_PROVIDER_NAMES[askUnlink]}?`}
          description="Bạn không đăng nhập bằng cách này được nữa. Cần còn ít nhất một cách đăng nhập khác."
          confirmLabel="Bỏ liên kết"
          destructive
          onConfirm={() => unlinkProvider(askUnlink)}
          onCancel={() => setAskUnlink(null)}
        />
      ) : null}
      {askDelete ? (
        <ConfirmSheet
          title="Xoá tài khoản?"
          description="Hồ sơ và các tin đang đăng sẽ bị ẩn, bạn không đăng nhập lại được. Lịch sử giao dịch và đánh giá vẫn giữ cho người đã giao dịch với bạn."
          confirmLabel="Xoá tài khoản"
          destructive
          onConfirm={removeAccount}
          onCancel={() => setAskDelete(false)}
        />
      ) : null}
    </View>
  );
}
