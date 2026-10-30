import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, Pressable, Share, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ListingCard } from '@/components/listings/listing-card';
import { ConfirmSheet } from '@/components/me/confirm-sheet';
import { VerifiedTick } from '@/components/me/reputation-card';
import { UserAvatar } from '@/components/me/user-avatar';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { FollowButton } from '@/components/profile/follow-button';
import { ProfileMoreSheet } from '@/components/profile/profile-more-sheet';
import { ReviewRow, ReviewsHeader } from '@/components/profile/review-parts';
import { TypeChips } from '@/components/profile/type-chips';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { useOpenChat } from '@/hooks/useOpenChat';
import { useSetFollowingInCache, useUserListings, useUserProfile } from '@/hooks/useUserProfile';
import { fetchUserReviews, setBlocked } from '@/services/profile/people-api';
import type { ListingType, PublicProfile, ReviewerRole } from '@/types/people';
import { ACTIVITY_LEVEL_LABELS, formatWarning } from '@/utils/format';
import {
  CardGridSkeleton,
  ProfileReviewsSkeleton,
  ProfileSkeleton,
} from '@/components/ui/skeletons';

const STAR_PATH = 'M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z';

type Tab = 'listings' | 'reviews';

function Header({
  profile,
  onFollowed,
  onMessage,
}: {
  profile: PublicProfile;
  onFollowed: (following: boolean) => void;
  onMessage: () => void;
}) {
  const levels = [
    {
      k: 'Tài khoản',
      v: profile.verified ? '✓ Đã xác thực' : 'Thành viên',
      note: profile.verified ? 'số điện thoại' : '',
      color: profile.verified ? '#1673D9' : '#0F2440',
    },
    {
      k: 'Thâm niên',
      v: profile.tenure.label,
      note: `từ ${profile.tenure.since}`,
      color: '#0F2440',
    },
    { k: 'Hoạt động', v: ACTIVITY_LEVEL_LABELS[profile.activityLevel], note: '', color: '#0F2440' },
    {
      k: 'Cảnh báo',
      v: formatWarning(profile.warning),
      note: '',
      color: profile.warning ? (profile.warning.kind === 'red' ? '#B42318' : '#8A5A00') : '#0F2440',
    },
  ];

  return (
    <View>
      {profile.isSelf ? (
        <View className="flex-row items-center gap-2 bg-[#F1F7FE] px-4 py-2.5">
          <Svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1673D9"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
            <Circle cx={12} cy={12} r={3} />
          </Svg>
          <AppText className="flex-1 text-[13px] text-[#0B4A99]">
            Bạn đang xem hồ sơ như người khác thấy
          </AppText>
        </View>
      ) : null}

      <View className="gap-3.5 px-4 pt-[18px]">
        <View className="flex-row items-center gap-3.5">
          <UserAvatar
            name={profile.displayName}
            avatarUrl={profile.avatarUrl}
            size={76}
            textClassName="text-[26px]"
          />
          <View className="min-w-0 flex-1 gap-[3px]">
            <View className="flex-row items-center gap-1.5">
              <AppText
                numberOfLines={1}
                className="shrink text-[20px] font-vn-bold tracking-[-0.2px]"
              >
                {profile.displayName ?? 'Thành viên Trao'}
              </AppText>
              {profile.verified ? <VerifiedTick size={18} width={2.4} /> : null}
            </View>
            <AppText numberOfLines={1} className="text-[13px] text-[#5A6772]">
              {[profile.username ? `@${profile.username}` : null, profile.areaName]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
            <AppText className="text-[13px] text-[#33414D]">
              Tham gia từ {profile.tenure.since}
            </AppText>
          </View>
        </View>

        {!profile.isSelf ? (
          <View className="flex-row gap-2.5">
            <FollowButton
              handle={profile.handle}
              following={profile.following}
              size="large"
              onChanged={onFollowed}
            />
            <Pressable
              accessibilityRole="button"
              onPress={onMessage}
              className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#C9DDF4] bg-white"
            >
              <Svg
                width={17}
                height={17}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1673D9"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M4 5h16v11H8l-4 4z" />
              </Svg>
              <AppText className="text-[14.5px] font-vn-semibold text-[#1673D9]">Nhắn tin</AppText>
            </Pressable>
          </View>
        ) : null}

        <View className="flex-row rounded-2xl border border-[#E8ECF0] py-3">
          <View className="flex-1 items-center gap-0.5">
            <AppText className="text-[18px] font-vn-bold">{profile.completedCount}</AppText>
            <AppText className="text-[12px] text-[#5A6772]">giao dịch</AppText>
          </View>
          <View className="flex-1 items-center gap-0.5 border-l border-[#EEF2F6]">
            <View className="flex-row items-center gap-1">
              <AppText className="text-[18px] font-vn-bold">
                {profile.ratingAverage !== null ? profile.ratingAverage.toFixed(1) : '–'}
              </AppText>
              <Svg
                width={15}
                height={15}
                viewBox="0 0 24 24"
                fill="#FFC22E"
                stroke="#E8A200"
                strokeWidth={1.5}
                strokeLinejoin="round"
              >
                <Path d={STAR_PATH} />
              </Svg>
            </View>
            <AppText className="text-[12px] text-[#5A6772]">{profile.ratingCount} đánh giá</AppText>
          </View>
          <View className="flex-1 items-center gap-0.5 border-l border-[#EEF2F6]">
            <AppText className="text-[18px] font-vn-bold">{profile.followerCount}</AppText>
            <AppText className="text-[12px] text-[#5A6772]">followers</AppText>
          </View>
        </View>

        <View accessibilityLabel="Uy tín" className="overflow-hidden rounded-2xl bg-[#F7F9FB]">
          <View className="p-3">
            <View className="gap-0.5 rounded-xl bg-white px-3 py-2.5">
              <AppText className="text-[17px] font-vn-bold">
                {profile.cancelRatePercent ?? 0}%
              </AppText>
              <AppText className="text-[12px] leading-[16px] text-[#5A6772]">
                tỉ lệ huỷ khi đang giao dịch
              </AppText>
            </View>
          </View>
          {levels.map((level) => (
            <View
              key={level.k}
              className="flex-row items-center gap-2 border-t border-[#EAEFF4] px-3.5 py-[11px]"
            >
              <AppText className="flex-1 text-[13.5px] text-[#5A6772]">{level.k}</AppText>
              <AppText className="text-[13.5px] font-vn-semibold" style={{ color: level.color }}>
                {level.v}
              </AppText>
              {level.note ? (
                <AppText className="text-[12px] text-[#5A6772]">· {level.note}</AppText>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** Public profile (canvas Profile). Open to guests; also shows your own as others see it. */
export default function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, getIdToken } = useAuth();
  const openChat = useOpenChat();
  const [tab, setTab] = useState<Tab>('listings');
  const [type, setType] = useState<ListingType | undefined>(undefined);
  const [role, setRole] = useState<ReviewerRole | undefined>(undefined);
  const [sheet, setSheet] = useState<'none' | 'more' | 'block'>('none');
  // One clock for every card of the list, so "time left" does not jump between cards.
  const [now] = useState(() => Date.now());

  const profileQuery = useUserProfile(handle);
  const profile = profileQuery.data;
  const setFollowingInCache = useSetFollowingInCache(handle);

  const listings = useUserListings(handle, type, tab === 'listings' && !!profile);
  const reviews = useInfiniteQuery({
    queryKey: ['user', handle, 'reviews', role ?? 'all'],
    queryFn: ({ pageParam }) => fetchUserReviews({ handle, role, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: tab === 'reviews' && !!profile,
  });

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  async function share() {
    setSheet('none');
    const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '') ?? '';
    const url = `${baseUrl}/app/u/${profile?.handle ?? handle}`;
    try {
      await Share.share({ message: url, url });
    } catch {
      Alert.alert('Không chia sẻ được', 'Thử lại sau.');
    }
  }

  async function block() {
    try {
      await setBlocked(await getIdToken(), handle, true);
    } catch (caught) {
      setSheet('none');
      Alert.alert('Không chặn được', caught instanceof Error ? caught.message : 'Thử lại sau.');
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ['me'] });
    router.replace('/');
  }

  function openMore() {
    if (!session) {
      router.push('/auth-gate');
      return;
    }
    setSheet('more');
  }

  const listingItems = listings.data?.pages.flatMap((page) => page.items) ?? [];
  const reviewItems = reviews.data?.pages.flatMap((page) => page.items) ?? [];
  const active = tab === 'listings' ? listings : reviews;
  const notFound = profileQuery.error?.message === 'Không tìm thấy người dùng.';

  const header = profile ? (
    <View>
      <Header
        profile={profile}
        onFollowed={setFollowingInCache}
        onMessage={() => void openChat(profile.handle)}
      />
      <View
        accessibilityRole="tablist"
        className="mt-[18px] flex-row border-b border-[#E8ECF0] bg-white"
      >
        {(
          [
            ['listings', 'Tin đăng', profile.listingCounts.all],
            ['reviews', 'Đánh giá', profile.ratingCount],
          ] as const
        ).map(([value, label, count]) => {
          const on = tab === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setTab(value)}
              className="h-12 flex-1 items-center justify-center"
              style={{ borderBottomWidth: 2.5, borderBottomColor: on ? '#1673D9' : 'transparent' }}
            >
              <AppText
                className={`text-[14.5px] ${on ? 'font-vn-bold' : 'font-vn-medium text-[#5A6772]'}`}
              >
                {label}
                {count > 0 ? (
                  <AppText className="text-[14.5px] font-vn-medium text-[#5A6772]">
                    {' '}
                    {count}
                  </AppText>
                ) : null}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {tab === 'listings' ? (
        <TypeChips counts={profile.listingCounts} value={type} onChange={setType} />
      ) : (
        <ReviewsHeader summary={reviews.data?.pages[0]?.summary} role={role} onRole={setRole} />
      )}
    </View>
  ) : null;

  const footer = profile ? (
    <View className="px-4 pb-6 pt-2">
      {active.isPending ? (
        tab === 'listings' ? (
          <CardGridSkeleton />
        ) : (
          <ProfileReviewsSkeleton />
        )
      ) : null}
      {active.error ? (
        <View accessibilityRole="alert" className="rounded-2xl bg-[#FDECEA] px-4 py-3">
          <AppText className="text-[14px] text-[#B42318]">{active.error.message}</AppText>
          <Pressable onPress={() => active.refetch()} className="mt-1.5">
            <AppText className="text-[14px] font-vn-semibold text-[#B42318] underline">
              Thử lại
            </AppText>
          </Pressable>
        </View>
      ) : null}
      {active.isFetchingNextPage ? (
        <AppText className="py-3 text-center text-[13px] text-[#5A6772]">Đang tải thêm…</AppText>
      ) : null}
      {tab === 'listings' && listings.data && listingItems.length === 0 ? (
        <AppText className="py-10 text-center text-[14px] text-[#5A6772]">
          Chưa có tin đang đăng.
        </AppText>
      ) : null}
      {tab === 'reviews' && reviews.data && reviewItems.length === 0 ? (
        <AppText className="py-6 text-center text-[14px] text-[#5A6772]">
          Chưa có đánh giá nào.
        </AppText>
      ) : null}
      {tab === 'reviews' && reviews.data ? (
        <AppText className="mt-4 text-[12.5px] leading-[18.75px] text-[#A3AEB9]">
          Chỉ hiện đánh giá đã công khai: khi cả hai bên đã đánh giá, hoặc sau 7 ngày kể từ khi giao
          dịch hoàn tất.
        </AppText>
      ) : null}
    </View>
  ) : null;

  return (
    <View className="flex-1 bg-white">
      <ScreenBar
        title={profile?.displayName ?? 'Hồ sơ'}
        onBack={back}
        trailing={
          profile && !profile.isSelf ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tuỳ chọn"
              onPress={openMore}
              className="h-11 w-11 items-center justify-center"
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="#0F2440">
                <Circle cx={5} cy={12} r={2} />
                <Circle cx={12} cy={12} r={2} />
                <Circle cx={19} cy={12} r={2} />
              </Svg>
            </Pressable>
          ) : null
        }
      />

      {profileQuery.isPending ? <ProfileSkeleton /> : null}
      {profileQuery.error ? (
        <View accessibilityRole="alert" className="m-4 rounded-2xl bg-[#FDECEA] px-4 py-3">
          <AppText className="text-[14px] text-[#B42318]">{profileQuery.error.message}</AppText>
          {!notFound ? (
            <Pressable onPress={() => profileQuery.refetch()} className="mt-1.5">
              <AppText className="text-[14px] font-vn-semibold text-[#B42318] underline">
                Thử lại
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {profile ? (
        tab === 'listings' ? (
          <FlatList
            key="listings"
            data={listingItems}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 10, paddingHorizontal: 16, marginTop: 20 }}
            renderItem={({ item }) => (
              <View style={{ flex: 1, maxWidth: '50%' }}>
                <ListingCard listing={item} now={now} />
              </View>
            )}
            ListHeaderComponent={header}
            ListFooterComponent={footer}
            onEndReached={() => {
              if (listings.hasNextPage && !listings.isFetchingNextPage)
                void listings.fetchNextPage();
            }}
            onEndReachedThreshold={0.6}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            key="reviews"
            data={reviewItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ReviewRow review={item} />}
            ListHeaderComponent={header}
            ListFooterComponent={footer}
            onEndReached={() => {
              if (reviews.hasNextPage && !reviews.isFetchingNextPage) void reviews.fetchNextPage();
            }}
            onEndReachedThreshold={0.6}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : null}

      {sheet === 'more' ? (
        <ProfileMoreSheet
          onClose={() => setSheet('none')}
          onShare={() => void share()}
          onBlock={() => setSheet('block')}
          onReport={() => {
            setSheet('none');
            if (!session) router.push('/auth-gate');
            else {
              router.push({
                pathname: '/report',
                params: { type: 'user', id: profile?.handle ?? handle },
              });
            }
          }}
        />
      ) : null}
      {sheet === 'block' ? (
        <ConfirmSheet
          title={`Chặn ${profile?.displayName ?? 'người này'}?`}
          description="Hai bên không thấy tin của nhau và không nhắn tin được. Giao dịch đang dở vẫn hoàn tất. Nếu đang follow nhau, cả hai follow đều bị gỡ."
          confirmLabel="Chặn"
          destructive
          onConfirm={block}
          onCancel={() => setSheet('none')}
        />
      ) : null}
    </View>
  );
}
