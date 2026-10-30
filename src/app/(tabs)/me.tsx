import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { TabHeader } from '@/components/navigation/tab-header';
import { ConfirmSheet } from '@/components/me/confirm-sheet';
import { MenuGroups } from '@/components/me/menu-groups';
import { ReputationCard, VerifiedTick } from '@/components/me/reputation-card';
import { RewardsCard } from '@/components/me/rewards-card';
import { UserAvatar } from '@/components/me/user-avatar';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { fetchMyProfile, MY_PROFILE_QUERY_KEY } from '@/services/profile/profile-api';

/** The Tôi tab (canvas Main, tab "me"): profile, reputation, rewards, menus, sign out. */
export default function MeTab() {
  const router = useRouter();
  const { session, signOut, getIdToken } = useAuth();
  const [askLogout, setAskLogout] = useState(false);
  const {
    data: profile,
    error,
    refetch,
    isPending,
    isRefetching,
  } = useQuery({
    queryKey: [...MY_PROFILE_QUERY_KEY, session?.uid],
    queryFn: async () => fetchMyProfile(await getIdToken()),
    enabled: !!session,
  });

  return (
    <View className="flex-1 bg-[#E6F1FF]">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching && !isPending} onRefresh={() => refetch()} />
        }
      >
        <TabHeader />
        <View className="mt-1 flex-1 rounded-t-[26px] bg-white pb-6 pt-[18px]">
          {isPending ? (
            <View className="items-center py-10">
              <AppText className="text-[14px] text-[#5A6772]">Đang tải…</AppText>
            </View>
          ) : null}
          {error ? (
            <View accessibilityRole="alert" className="mx-4 rounded-2xl bg-[#FDECEA] px-4 py-3">
              <AppText className="text-[14px] text-[#B42318]">{error.message}</AppText>
              <Pressable onPress={() => refetch()} className="mt-1.5">
                <AppText className="text-[14px] font-vn-semibold text-[#B42318] underline">
                  Thử lại
                </AppText>
              </Pressable>
            </View>
          ) : null}

          {profile ? (
            <>
              <View className="flex-row items-center gap-3.5 px-4">
                <View
                  className="rounded-full"
                  style={{ borderWidth: 2, borderColor: '#FFC22E', padding: 0 }}
                >
                  <UserAvatar
                    name={profile.displayName}
                    avatarUrl={profile.avatarUrl}
                    size={68}
                    ring
                    textClassName="text-[24px] text-[#8A5A00]"
                  />
                </View>
                <View className="min-w-0 flex-1 gap-0.5">
                  <View className="flex-row items-center gap-1.5">
                    <AppText
                      numberOfLines={1}
                      className="shrink text-[20px] font-vn-bold tracking-[-0.2px]"
                    >
                      {profile.displayName ?? 'Thành viên Trao'}
                    </AppText>
                    {profile.emailVerified ? <VerifiedTick size={18} width={2.4} /> : null}
                  </View>
                  <AppText numberOfLines={1} className="text-[13px] text-[#5A6772]">
                    {[profile.username ? `@${profile.username}` : null, profile.areaName]
                      .filter(Boolean)
                      .join(' · ') || 'Chưa chọn khu vực'}
                  </AppText>
                  <AppText className="text-[12.5px] text-[#5A6772]">
                    Tham gia từ {profile.tenure.since}
                  </AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/u/[handle]', params: { handle: profile.handle } })
                  }
                  className="h-9 justify-center rounded-[10px] bg-[#F1F7FE] px-3"
                >
                  <AppText className="text-[13px] font-vn-semibold text-[#1673D9]">
                    Xem hồ sơ
                  </AppText>
                </Pressable>
              </View>

              <View className="mx-4 mt-4 flex-row rounded-2xl border border-[#E8ECF0] py-1">
                {[
                  { n: profile.followerCount, label: 'Followers', tab: 'followers' },
                  { n: profile.followingCount, label: 'Following', tab: 'following' },
                  { n: profile.completedCount, label: 'Giao dịch', tab: null },
                ].map((item) => (
                  <Pressable
                    key={item.label}
                    accessibilityRole={item.tab ? 'button' : undefined}
                    disabled={!item.tab}
                    onPress={() =>
                      item.tab && router.push({ pathname: '/follows', params: { tab: item.tab } })
                    }
                    className="flex-1 items-center gap-px px-1 py-2.5"
                  >
                    <AppText className="text-[17px] font-vn-bold">{item.n}</AppText>
                    <AppText className="text-[12px] text-[#5A6772]">{item.label}</AppText>
                  </Pressable>
                ))}
              </View>

              <ReputationCard profile={profile} />
              <RewardsCard available={profile.rewards.available} locked={profile.rewards.locked} />
              <MenuGroups profile={profile} />

              <View className="mt-[18px] items-center gap-3 border-t-8 border-[#F2F5F8] px-4 pt-4">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setAskLogout(true)}
                  className="h-[50px] w-full flex-row items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-[#F3C7C2] bg-white"
                >
                  <Svg
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#B42318"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />
                  </Svg>
                  <AppText className="text-[15px] font-vn-semibold text-[#B42318]">
                    Đăng xuất
                  </AppText>
                </Pressable>
                <AppText className="text-[12px] text-[#8794A1]">Trao 1.0.0 · trao.app</AppText>
              </View>
            </>
          ) : null}
        </View>
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
