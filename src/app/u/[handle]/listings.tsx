import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ListingCard } from '@/components/listings/listing-card';
import { UserAvatar } from '@/components/me/user-avatar';
import { FollowButton } from '@/components/profile/follow-button';
import { TypeChips } from '@/components/profile/type-chips';
import { AppText } from '@/components/ui/app-text';
import { useSetFollowingInCache, useUserListings, useUserProfile } from '@/hooks/useUserProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ListingType } from '@/types/people';
import { CardGridSkeleton } from '@/components/ui/skeletons';

/** Listings of one person (canvas UserListings): opened from a follower or following row. */
export default function UserListingsScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<ListingType | undefined>(undefined);
  const [now] = useState(() => Date.now());

  const { data: profile, error, refetch } = useUserProfile(handle);
  const setFollowingInCache = useSetFollowingInCache(handle);
  const listings = useUserListings(handle, type, !!profile);
  const items = listings.data?.pages.flatMap((page) => page.items) ?? [];

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/follows');
  };

  const header = profile ? (
    <View>
      <View className="flex-row items-baseline gap-2 px-4 pt-3.5">
        <AppText accessibilityRole="header" className="text-[18px] font-vn-bold">
          Tin đang đăng
        </AppText>
        <AppText className="text-[13px] text-[#5A6772]">{profile.listingCounts.all}</AppText>
      </View>
      <TypeChips counts={profile.listingCounts} value={type} onChange={setType} variant="badge" />
    </View>
  ) : null;

  return (
    <View className="flex-1 bg-white">
      <View
        className="flex-row items-center gap-2.5 border-b border-[#EEF2F6] bg-white pl-2 pr-3"
        style={{ height: 64 + insets.top, paddingTop: insets.top }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={back}
          className="h-11 w-10 items-center justify-center"
        >
          <Svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0F2440"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M15 6l-6 6 6 6" />
          </Svg>
        </Pressable>
        {profile ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/u/[handle]', params: { handle: profile.handle } })
              }
              className="min-w-0 flex-1 flex-row items-center gap-2.5"
            >
              <UserAvatar
                name={profile.displayName}
                avatarUrl={profile.avatarUrl}
                size={40}
                textClassName="text-[14px]"
              />
              <View className="min-w-0 flex-1 gap-px">
                <AppText numberOfLines={1} className="text-[15px] font-vn-bold">
                  {profile.displayName ?? 'Thành viên Trao'}
                </AppText>
                <AppText className="text-[12.5px] font-vn-semibold text-[#1673D9]">
                  Xem hồ sơ
                </AppText>
              </View>
            </Pressable>
            {!profile.isSelf ? (
              <FollowButton
                handle={profile.handle}
                following={profile.following}
                onChanged={setFollowingInCache}
              />
            ) : null}
          </>
        ) : (
          <View className="flex-1" />
        )}
      </View>

      {error ? (
        <View accessibilityRole="alert" className="m-4 rounded-2xl bg-[#FDECEA] px-4 py-3">
          <AppText className="text-[14px] text-[#B42318]">{error.message}</AppText>
          {error.message !== 'Không tìm thấy người dùng.' ? (
            <Pressable onPress={() => refetch()} className="mt-1.5">
              <AppText className="text-[14px] font-vn-semibold text-[#B42318] underline">
                Thử lại
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {profile ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 16, marginTop: 20 }}
          renderItem={({ item }) => (
            <View style={{ flex: 1, maxWidth: '50%' }}>
              <ListingCard listing={item} now={now} />
            </View>
          )}
          ListHeaderComponent={header}
          ListFooterComponent={
            <View className="px-4 pb-6 pt-2">
              {listings.isPending ? <CardGridSkeleton /> : null}
              {listings.error ? (
                <Pressable onPress={() => listings.refetch()}>
                  <AppText className="py-4 text-center text-[14px] font-vn-semibold text-[#B42318] underline">
                    {listings.error.message} Thử lại
                  </AppText>
                </Pressable>
              ) : null}
              {listings.data && items.length === 0 ? (
                <AppText className="py-10 text-center text-[14px] text-[#5A6772]">
                  Chưa có tin đang đăng.
                </AppText>
              ) : null}
            </View>
          }
          onEndReached={() => {
            if (listings.hasNextPage && !listings.isFetchingNextPage) void listings.fetchNextPage();
          }}
          onEndReachedThreshold={0.6}
          showsVerticalScrollIndicator={false}
        />
      ) : null}
    </View>
  );
}
