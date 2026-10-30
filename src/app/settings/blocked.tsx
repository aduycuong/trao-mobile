import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { UserAvatar } from '@/components/me/user-avatar';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { MY_SETTINGS_QUERY_KEY } from '@/services/account/account-api';
import { fetchBlockedUsers, MY_BLOCKS_QUERY_KEY, setBlocked } from '@/services/profile/people-api';
import { BlockedRowsSkeleton } from '@/components/ui/skeletons';

/** Người đã chặn (Cài đặt → Quyền riêng tư): the blocked users, each with "Bỏ chặn". */
export default function BlockedScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, getIdToken } = useAuth();
  const queryKey = [...MY_BLOCKS_QUERY_KEY, session?.uid];

  const { data, error, refetch, isPending } = useQuery({
    queryKey,
    queryFn: async () => fetchBlockedUsers(await getIdToken()),
    enabled: !!session,
  });

  const unblock = useMutation({
    mutationFn: async (handle: string) => setBlocked(await getIdToken(), handle, false),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: MY_BLOCKS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MY_SETTINGS_QUERY_KEY }),
      ]);
    },
    onError: (caught) => Alert.alert('Không bỏ chặn được', caught.message || 'Thử lại sau.'),
  });

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  return (
    <View className="flex-1 bg-white">
      <ScreenBar title="Người đã chặn" onBack={back} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {isPending ? <BlockedRowsSkeleton /> : null}
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
        {data && data.length === 0 ? (
          <AppText className="px-4 py-10 text-center text-[14px] text-[#5A6772]">
            Bạn chưa chặn ai.
          </AppText>
        ) : null}
        {data?.map((person) => (
          <View key={person.id} className="flex-row items-center gap-3 px-4 py-3">
            <UserAvatar
              name={person.displayName}
              avatarUrl={person.avatarUrl}
              size={48}
              textClassName="text-[16px]"
            />
            <AppText numberOfLines={1} className="min-w-0 flex-1 text-[14.5px] font-vn-bold">
              {person.displayName ?? 'Thành viên Trao'}
            </AppText>
            <Pressable
              accessibilityRole="button"
              disabled={unblock.isPending}
              onPress={() => unblock.mutate(person.handle)}
              className={`h-[34px] justify-center rounded-[10px] border-[1.5px] border-[#D5DDE5] bg-white px-3.5 ${
                unblock.isPending ? 'opacity-60' : ''
              }`}
            >
              <AppText className="text-[13px] font-vn-bold">Bỏ chặn</AppText>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
