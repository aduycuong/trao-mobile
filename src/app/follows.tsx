import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { VerifiedTick } from '@/components/me/reputation-card';
import { UserAvatar } from '@/components/me/user-avatar';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { FollowButton } from '@/components/profile/follow-button';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchFollowPeople, MY_FOLLOWS_QUERY_KEY } from '@/services/profile/people-api';
import { fetchMyProfile, MY_PROFILE_QUERY_KEY } from '@/services/profile/profile-api';
import type { FollowTab, ListFollowPeopleResult } from '@/types/people';

const SEARCH_DEBOUNCE_MS = 300;

/** Followers · Following of the signed-in user (canvas People): search by name, follow back at once. */
export default function FollowsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, getIdToken } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<FollowTab>(params.tab === 'following' ? 'following' : 'followers');
  const [search, setSearch] = useState('');
  const keyword = useDebounce(search.trim(), SEARCH_DEBOUNCE_MS);

  const { data: me } = useQuery({
    queryKey: [...MY_PROFILE_QUERY_KEY, session?.uid],
    queryFn: async () => fetchMyProfile(await getIdToken()),
    enabled: !!session,
  });

  const queryKey = [...MY_FOLLOWS_QUERY_KEY, session?.uid, tab, keyword] as const;
  const list = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) =>
      fetchFollowPeople({
        token: await getIdToken(),
        tab,
        keyword: keyword || undefined,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: !!session,
  });

  const first = list.data?.pages[0];
  const counts = {
    followers: first?.followerCount ?? me?.followerCount ?? 0,
    following: first?.followingCount ?? me?.followingCount ?? 0,
  };
  const people = list.data?.pages.flatMap((page) => page.items) ?? [];

  function setFollowingInCache(id: string, following: boolean) {
    queryClient.setQueryData<InfiniteData<ListFollowPeopleResult>>(queryKey, (current) =>
      current
        ? {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              items: page.items.map((person) =>
                person.id === id ? { ...person, following } : person
              ),
            })),
          }
        : current
    );
    // The other tab and the counters change with a follow.
    void queryClient.invalidateQueries({ queryKey: MY_FOLLOWS_QUERY_KEY, refetchType: 'none' });
    void queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY });
  }

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/me');
  };

  const header = (
    <View>
      <View accessibilityRole="tablist" className="flex-row gap-2 px-4 pb-2.5 pt-1">
        {(
          [
            ['followers', 'Followers', counts.followers],
            ['following', 'Following', counts.following],
          ] as const
        ).map(([value, label, count]) => {
          const on = tab === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setTab(value)}
              className={`h-[34px] flex-row items-center gap-1.5 rounded-full border-[1.5px] px-3.5 ${
                on ? 'border-[#0F2440] bg-[#0F2440]' : 'border-[#D5DDE5] bg-white'
              }`}
            >
              <AppText className={`text-[13.5px] font-vn-semibold ${on ? 'text-white' : ''}`}>
                {label}
              </AppText>
              <View
                className={`h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] ${
                  on ? '' : 'bg-[#EEF2F6]'
                }`}
                style={on ? { backgroundColor: 'rgba(255,255,255,0.2)' } : undefined}
              >
                <AppText
                  className={`text-[11px] font-vn-bold ${on ? 'text-white' : 'text-[#33414D]'}`}
                >
                  {count}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View className="px-4 pb-2">
        <View className="h-11 flex-row items-center gap-2 rounded-xl bg-[#F2F5F8] px-3">
          <Svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5A6772"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <Circle cx={11} cy={11} r={7} />
            <Path d="M20 20l-4-4" />
          </Svg>
          <TextInput
            accessibilityLabel="Tìm theo tên"
            value={search}
            onChangeText={setSearch}
            maxLength={100}
            placeholder="Tìm theo tên"
            placeholderTextColor="#A3AEB9"
            returnKeyType="search"
            autoCorrect={false}
            className="h-full min-w-0 flex-1 font-vn text-[14px] text-[#0F2440]"
          />
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      <ScreenBar title={me?.displayName ?? 'Followers · Following'} onBack={back} />
      <FlatList
        data={people}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        renderItem={({ item: person }) => (
          <View className="flex-row items-center gap-3 px-4 py-2.5">
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/u/[handle]/listings', params: { handle: person.handle } })
              }
              className="min-w-0 flex-1 flex-row items-center gap-3"
            >
              <UserAvatar
                name={person.displayName}
                avatarUrl={person.avatarUrl}
                size={48}
                textClassName="text-[16px]"
              />
              <View className="min-w-0 flex-1 gap-0.5">
                <View className="flex-row items-center gap-[5px]">
                  <AppText numberOfLines={1} className="shrink text-[14.5px] font-vn-bold">
                    {person.displayName ?? 'Thành viên Trao'}
                  </AppText>
                  {person.verified ? <VerifiedTick size={14} width={2.6} /> : null}
                </View>
                <AppText numberOfLines={1} className="text-[12.5px] text-[#5A6772]">
                  {[
                    person.areaName,
                    `${person.completedCount} giao dịch`,
                    person.listingCount > 0
                      ? `${person.listingCount} tin đang đăng`
                      : 'chưa có tin',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
              </View>
            </Pressable>
            <FollowButton
              handle={person.handle}
              following={person.following}
              idleLabel={tab === 'followers' ? 'Follow lại' : 'Follow'}
              onChanged={(following) => setFollowingInCache(person.id, following)}
            />
          </View>
        )}
        ListFooterComponent={
          <View>
            {list.isPending ? (
              <AppText className="py-6 text-center text-[14px] text-[#5A6772]">Đang tải…</AppText>
            ) : null}
            {list.error ? (
              <View accessibilityRole="alert" className="m-4 rounded-2xl bg-[#FDECEA] px-4 py-3">
                <AppText className="text-[14px] text-[#B42318]">{list.error.message}</AppText>
                <Pressable onPress={() => list.refetch()} className="mt-1.5">
                  <AppText className="text-[14px] font-vn-semibold text-[#B42318] underline">
                    Thử lại
                  </AppText>
                </Pressable>
              </View>
            ) : null}
            {list.data && people.length === 0 ? (
              <AppText className="px-4 py-10 text-center text-[14px] text-[#5A6772]">
                {keyword
                  ? 'Không tìm thấy ai với tên này.'
                  : tab === 'followers'
                    ? 'Chưa có ai follow bạn.'
                    : 'Bạn chưa follow ai.'}
              </AppText>
            ) : null}
          </View>
        }
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
