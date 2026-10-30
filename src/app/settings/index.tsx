import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ConfirmSheet } from '@/components/me/confirm-sheet';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import {
  deleteMySearchHistory,
  fetchMySettings,
  MY_SETTINGS_QUERY_KEY,
  patchMySettings,
} from '@/services/account/account-api';
import type { MySettings, Theme, VideoAutoplay } from '@/types/account';
import { SettingsSkeleton } from '@/components/ui/skeletons';

const VIDEO_OPTIONS: [VideoAutoplay, string][] = [
  ['always', 'Luôn'],
  ['wifi', 'Wi-Fi'],
  ['never', 'Tắt'],
];

const THEME_OPTIONS: [Theme, string][] = [
  ['system', 'Theo máy'],
  ['light', 'Sáng'],
  ['dark', 'Tối'],
];

function Chevron() {
  return (
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
  );
}

const ROW = 'min-h-14 flex-row items-center gap-3 border-b border-[#F2F5F8] px-4 py-1.5';

type SettingRowProps = {
  label: string;
  sub?: string;
  value?: string;
  tone?: 'default' | 'link' | 'danger';
  chevron?: boolean;
  onPress?: () => void;
};

function SettingRow({
  label,
  sub,
  value,
  tone = 'default',
  chevron = true,
  onPress,
}: SettingRowProps) {
  const color =
    tone === 'link' ? 'text-[#1673D9]' : tone === 'danger' ? 'text-[#B42318]' : 'text-[#0F2440]';

  return (
    <Pressable accessibilityRole="button" disabled={!onPress} onPress={onPress} className={ROW}>
      <View className="min-w-0 flex-1 gap-0.5">
        <AppText className={`text-[15px] font-vn-medium ${color}`}>{label}</AppText>
        {sub ? <AppText className="text-[12.5px] text-[#5A6772]">{sub}</AppText> : null}
      </View>
      {value ? <AppText className="text-[13.5px] text-[#5A6772]">{value}</AppText> : null}
      {chevron ? <Chevron /> : null}
    </Pressable>
  );
}

type SegmentedRowProps<T extends string> = {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
};

function SegmentedRow<T extends string>({ label, value, options, onChange }: SegmentedRowProps<T>) {
  return (
    <View className={ROW}>
      <AppText className="min-w-0 flex-1 text-[15px] font-vn-medium">{label}</AppText>
      <View accessibilityRole="radiogroup" className="flex-row rounded-[10px] bg-[#F1F5F9] p-[3px]">
        {options.map(([optionValue, optionLabel]) => {
          const on = optionValue === value;
          return (
            <Pressable
              key={optionValue}
              accessibilityRole="radio"
              accessibilityLabel={`${label}: ${optionLabel}`}
              accessibilityState={{ checked: on }}
              onPress={() => onChange(optionValue)}
              className={`h-[30px] justify-center rounded-lg px-2.5 ${on ? 'bg-white' : ''}`}
              style={
                on
                  ? {
                      shadowColor: '#0F2440',
                      shadowOpacity: 0.12,
                      shadowRadius: 3,
                      shadowOffset: { width: 0, height: 1 },
                      elevation: 1,
                    }
                  : undefined
              }
            >
              <AppText
                className={`text-[12.5px] ${on ? 'font-vn-bold' : 'font-vn-medium text-[#5A6772]'}`}
              >
                {optionLabel}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Section({
  title,
  first,
  children,
}: {
  title: string;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className={first ? undefined : 'border-t-8 border-[#F2F5F8]'}>
      <AppText
        accessibilityRole="header"
        className="px-4 pb-0.5 pt-3.5 text-[13px] font-vn-semibold text-[#5A6772]"
      >
        {title}
      </AppText>
      {children}
    </View>
  );
}

/** Cài đặt (canvas Settings). Video and theme save as soon as they are picked. */
export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, getIdToken, signOut } = useAuth();
  const [askLogout, setAskLogout] = useState(false);
  const queryKey = [...MY_SETTINGS_QUERY_KEY, session?.uid];

  const {
    data: settings,
    error,
    refetch,
    isPending,
  } = useQuery({
    queryKey,
    queryFn: async () => fetchMySettings(await getIdToken()),
    enabled: !!session,
  });

  const save = useMutation({
    mutationFn: async (patch: { videoAutoplay?: VideoAutoplay; theme?: Theme }) =>
      patchMySettings(await getIdToken(), patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MySettings>(queryKey);
      if (previous) queryClient.setQueryData<MySettings>(queryKey, { ...previous, ...patch });
      return { previous };
    },
    onError: (caught, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      Alert.alert('Không lưu được', caught.message || 'Thử lại sau.');
    },
  });

  const clearHistory = useMutation({
    mutationFn: async () => deleteMySearchHistory(await getIdToken()),
    onSuccess: () => Alert.alert('Đã xoá lịch sử tìm kiếm.'),
    onError: (caught) => Alert.alert('Không xoá được', caught.message || 'Thử lại sau.'),
  });

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/me');
  };
  const openPolicy = (slug: string) =>
    router.push({ pathname: '/policies/[slug]', params: { slug } });

  return (
    <View className="flex-1 bg-white">
      <ScreenBar title="Cài đặt" onBack={back} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-5">
        {isPending ? <SettingsSkeleton /> : null}
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

        {settings ? (
          <>
            <Section title="Chung" first>
              <SettingRow
                label="Thông báo"
                sub="Bật / tắt thông báo đẩy theo loại"
                onPress={() => router.push('/notifications/settings')}
              />
              <SettingRow
                label="Khu vực mặc định"
                value={settings.defaultAreaName ?? 'Chưa chọn'}
                onPress={() => router.push('/settings/area')}
              />
              <SegmentedRow
                label="Tự phát video"
                value={settings.videoAutoplay}
                options={VIDEO_OPTIONS}
                onChange={(videoAutoplay) => save.mutate({ videoAutoplay })}
              />
              <SegmentedRow
                label="Giao diện"
                value={settings.theme}
                options={THEME_OPTIONS}
                onChange={(theme) => save.mutate({ theme })}
              />
              <SettingRow label="Ngôn ngữ" value="Tiếng Việt" />
            </Section>

            <Section title="Quyền riêng tư">
              <SettingRow
                label="Người đã chặn"
                value={`${settings.blockedCount} người`}
                onPress={() => router.push('/settings/blocked')}
              />
              <SettingRow
                label="Xoá lịch sử tìm kiếm"
                tone="link"
                chevron={false}
                onPress={clearHistory.isPending ? undefined : () => clearHistory.mutate()}
              />
            </Section>

            <Section title="Về Trao">
              <SettingRow label="Điều khoản sử dụng" onPress={() => openPolicy('terms')} />
              <SettingRow label="Chính sách bảo mật" onPress={() => openPolicy('privacy')} />
              <SettingRow
                label="Nguyên tắc tin đăng"
                onPress={() => openPolicy('listing-guidelines')}
              />
              <SettingRow
                label="Đăng xuất"
                tone="danger"
                chevron={false}
                onPress={() => setAskLogout(true)}
              />
            </Section>

            <AppText className="mt-4 text-center text-[12px] text-[#A3AEB9]">
              Trao 1.0.0 (Giai đoạn 1)
            </AppText>
          </>
        ) : null}
      </ScrollView>

      {askLogout ? (
        <ConfirmSheet
          title="Đăng xuất khỏi Trao?"
          description="Kho đồ, tin đăng, giao dịch và tin nhắn vẫn được giữ trong tài khoản. Bạn đăng nhập lại bất cứ lúc nào."
          confirmLabel="Đăng xuất"
          destructive
          onConfirm={async () => {
            await signOut();
            setAskLogout(false);
            router.replace('/');
          }}
          onCancel={() => setAskLogout(false)}
        />
      ) : null}
    </View>
  );
}
