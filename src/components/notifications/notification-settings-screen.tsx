import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { AppText } from '@/components/ui/app-text';
import { ErrorBox, SkeletonBlock } from '@/components/ui/form-controls';
import { useAuth } from '@/hooks/useAuth';
import { useGoBack } from '@/hooks/useGoBack';
import { NOTIFICATION_SETTING_GROUPS } from '@/services/notifications/notification-rules';
import {
  fetchNotificationSettings,
  notificationSettingsKey,
  patchNotificationSettings,
} from '@/services/notifications/notifications-api';
import type { NotificationSettingId, NotificationSettings } from '@/types/notifications';

function PushSwitch({
  label,
  on,
  locked,
  onChange,
}: {
  label: string;
  on: boolean;
  locked?: boolean;
  onChange: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on, disabled: locked }}
      disabled={locked}
      onPress={onChange}
      style={{ width: 46, height: 28, padding: 3, opacity: locked ? 0.5 : 1 }}
      className={`rounded-full ${on ? 'bg-[#1673D9]' : 'bg-[#C3CCD6]'}`}
    >
      <View
        style={{
          width: 22,
          height: 22,
          alignSelf: on ? 'flex-end' : 'flex-start',
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
        className="rounded-full bg-white"
      />
    </Pressable>
  );
}

/**
 * Cài đặt thông báo (canvas Notifs, settings view): one switch per kind of push, saved as soon as it
 * is flipped. A switch only turns off the push; the notification still shows in the list.
 */
export function NotificationSettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const goBack = useGoBack('/notifications');
  const { session, getIdToken } = useAuth();
  const key = notificationSettingsKey(session?.uid);

  const { data, error, refetch, isPending } = useQuery({
    queryKey: key,
    queryFn: async () => fetchNotificationSettings(await getIdToken()),
    enabled: !!session,
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<NotificationSettings>) =>
      patchNotificationSettings(await getIdToken(), patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationSettings>(key);
      if (previous) queryClient.setQueryData<NotificationSettings>(key, { ...previous, ...patch });
      return { previous };
    },
    onError: (caught, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      Alert.alert(
        'Không lưu được',
        caught instanceof Error ? caught.message : 'Bạn thử lại sau nhé.'
      );
    },
  });

  return (
    <View className="flex-1 bg-white">
      <ScreenBar title="Cài đặt thông báo" onBack={goBack} />

      {!session ? (
        <Pressable onPress={() => router.replace('/auth-gate')} className="p-4">
          <AppText className="text-[14px] text-[#1673D9]">Đăng nhập để chỉnh thông báo</AppText>
        </Pressable>
      ) : null}
      {session && isPending ? (
        <View accessibilityLabel="Đang tải" className="gap-5 px-4 pt-5">
          {Array.from({ length: 8 }, (_, index) => (
            <SkeletonBlock key={index} className="h-9 w-full" />
          ))}
        </View>
      ) : null}
      {error && !data ? <ErrorBox message={error.message} onRetry={() => refetch()} /> : null}

      {data ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-1.5 px-4 pb-6 pt-2"
        >
          {NOTIFICATION_SETTING_GROUPS.map((group) => (
            <View key={group.title}>
              <AppText
                accessibilityRole="header"
                className="pb-1.5 pt-3.5 text-[13px] font-vn-bold text-[#5A6772]"
              >
                {group.title}
              </AppText>
              {group.rows.map((row) => {
                const locked = !!row.locked;
                const settingId = row.id === 'safety' ? null : (row.id as NotificationSettingId);
                const on = locked || !settingId ? true : data[settingId];
                return (
                  <View
                    key={row.id}
                    className="flex-row items-center gap-3 border-b border-[#EEF2F6] py-3"
                  >
                    <View className="min-w-0 flex-1 gap-0.5">
                      <AppText className="text-[14.5px] font-vn-semibold">{row.label}</AppText>
                      <AppText className="text-[12.5px] leading-[17.5px] text-[#5A6772]">
                        {row.sub}
                      </AppText>
                    </View>
                    <PushSwitch
                      label={row.label}
                      on={on}
                      locked={locked}
                      onChange={() => settingId && save.mutate({ [settingId]: !on })}
                    />
                  </View>
                );
              })}
            </View>
          ))}
          <AppText className="mt-2.5 text-[12.5px] leading-[18.75px] text-[#5A6772]">
            Thẻ phạt, kết quả báo cáo và kiến nghị luôn được gửi. Tắt ở đây chỉ tắt thông báo đẩy;
            mục vẫn hiện trong danh sách Thông báo.
          </AppText>
        </ScrollView>
      ) : null}
    </View>
  );
}
