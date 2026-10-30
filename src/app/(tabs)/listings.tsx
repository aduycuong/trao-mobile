import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { CatIcon, type CatIconKind } from '@/components/icons/cat-icon';
import { TabIcon } from '@/components/icons/tab-icon';
import { TabHeader } from '@/components/navigation/tab-header';
import { PostStartSheet } from '@/components/post/post-start-sheet';
import { ItemThumb } from '@/components/stock/item-thumb';
import { AppText } from '@/components/ui/app-text';
import { ErrorBox } from '@/components/ui/form-controls';
import { ICON_PLUS, PathIcon } from '@/components/ui/path-icon';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { usePostGuard } from '@/hooks/usePostGuard';
import { fetchMyListings, MY_LISTINGS_QUERY_KEY } from '@/services/listings/listings-api';
import type {
  ListingGroup,
  ListingMineRow,
  ListingPillTone,
  ListingSegment,
} from '@/types/listings';

const SEGMENTS: { id: ListingSegment; label: string }[] = [
  { id: 'draft', label: 'Chờ duyệt' },
  { id: 'open', label: 'Đang đăng' },
  { id: 'closed', label: 'Đã đóng' },
];

const GROUP_TITLE: Record<ListingGroup, string> = {
  rejected: 'Chưa được duyệt',
  review: 'Chờ duyệt',
  sell: 'Tin bán',
  auction: 'Tin đấu giá',
  trade: 'Tin trao đổi',
  gift: 'Tin cho tặng',
};

const GROUP_ICON: Partial<Record<ListingGroup, CatIconKind>> = {
  sell: 'sale',
  auction: 'auction',
  trade: 'swap',
  gift: 'gift',
};

const PILL: Record<ListingPillTone, { bg: string; fg: string; dot: string }> = {
  review: { bg: '#FFF4D6', fg: '#8A5A00', dot: '#E8A200' },
  bad: { bg: '#FDECEA', fg: '#B42318', dot: '#F0533A' },
  live: { bg: '#E6F1FF', fg: '#0B4A99', dot: '#F0533A' },
  sched: { bg: '#F2F5F8', fg: '#5A6772', dot: '#A3AEB9' },
  done: { bg: '#E3F4EA', fg: '#1E6B43', dot: '#2F9E63' },
  off: { bg: '#EEF1F4', fg: '#5A6772', dot: '#A3AEB9' },
};

const EMPTY_TEXT: Record<ListingSegment, { title: string; text: string }> = {
  draft: {
    title: 'Không có tin nào chờ duyệt',
    text: 'Tin và bản sửa đang chờ duyệt hoặc chưa được duyệt sẽ hiện ở đây.',
  },
  open: {
    title: 'Chưa có tin đăng nào',
    text: 'Chọn một món trong Kho đồ để bán, đấu giá, trao đổi hoặc cho tặng.',
  },
  closed: {
    title: 'Chưa có tin nào đã đóng',
    text: 'Tin đã bán, đã tặng hoặc do bạn đóng sẽ hiện ở đây.',
  },
};

/** The Tin đăng tab (canvas GroupList, kind "listings"): the owner's listings by segment and group. */
export default function ListingsTab() {
  const { session, getIdToken } = useAuth();
  const guardPost = usePostGuard();
  const [segment, setSegment] = useState<ListingSegment>('open');
  const [searching, setSearching] = useState(false);
  const [text, setText] = useState('');
  const [choosing, setChoosing] = useState(false);
  const keyword = useDebounce(text.trim(), 300);

  const {
    data,
    error,
    refetch,
    isPending,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: [...MY_LISTINGS_QUERY_KEY, { segment, keyword, uid: session?.uid }],
    queryFn: async ({ pageParam }) =>
      fetchMyListings(await getIdToken(), {
        segment,
        keyword: keyword || undefined,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    placeholderData: keepPreviousData,
    enabled: !!session,
  });

  const first = data?.pages[0];
  const rows = data?.pages.flatMap((page) => page.items) ?? [];
  const total = first ? first.counts.draft + first.counts.open + first.counts.closed : 0;
  const empty = total === 0 ? EMPTY_TEXT.open : EMPTY_TEXT[segment];

  const header = (
    <View>
      <TabHeader />
      <View className="mt-1 rounded-t-[26px] bg-white pt-[18px]">
        <View className="flex-row items-center pl-4 pr-2">
          <AppText
            accessibilityRole="header"
            className="flex-1 text-[20px] font-vn-bold tracking-[-0.2px]"
          >
            Tin đăng
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tìm trong tin đăng"
            accessibilityState={{ selected: searching }}
            onPress={() => {
              setSearching((on) => !on);
              if (searching) setText('');
            }}
            className="h-11 w-11 items-center justify-center rounded-full"
          >
            <Svg
              width={21}
              height={21}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0F2440"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <Circle cx={11} cy={11} r={7} />
              <Path d="M20 20l-4-4" />
            </Svg>
          </Pressable>
        </View>

        {searching ? (
          <View className="px-4 pb-2 pt-1">
            <TextInput
              autoFocus
              accessibilityLabel="Tìm trong tin đăng"
              value={text}
              onChangeText={setText}
              placeholder="Tìm tên món…"
              placeholderTextColor="#8896A3"
              returnKeyType="search"
              className="h-11 rounded-[14px] border-[1.5px] border-[#D5DDE5] bg-white px-3.5 font-vn text-[15px] text-[#0F2440]"
            />
          </View>
        ) : null}

        <ScrollView
          horizontal
          accessibilityRole="tablist"
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-4 py-2.5"
          className="border-b border-[#F2F5F8]"
        >
          {SEGMENTS.map((entry) => {
            const on = entry.id === segment;
            const n = first?.counts[entry.id] ?? 0;
            return (
              <Pressable
                key={entry.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setSegment(entry.id)}
                className={`h-[34px] flex-row items-center gap-1.5 rounded-full border-[1.5px] px-3.5 ${
                  on ? 'border-[#0F2440] bg-[#0F2440]' : 'border-[#D5DDE5] bg-white'
                }`}
              >
                <AppText
                  className={`text-[13.5px] font-vn-semibold ${on ? 'text-white' : 'text-[#0F2440]'}`}
                >
                  {entry.label}
                </AppText>
                {n > 0 ? (
                  <View
                    className={`h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] ${
                      entry.id === 'draft' ? 'bg-[#FFC22E]' : on ? 'bg-white/20' : 'bg-[#EEF2F6]'
                    }`}
                  >
                    <AppText
                      className={`text-[11px] font-vn-bold ${
                        entry.id === 'draft'
                          ? 'text-[#3D2A00]'
                          : on
                            ? 'text-white'
                            : 'text-[#33414D]'
                      }`}
                    >
                      {n}
                    </AppText>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {error && !data ? <ErrorBox message={error.message} onRetry={() => refetch()} /> : null}
        {isPending && session ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#1673D9" />
          </View>
        ) : null}

        {first && rows.length === 0 ? (
          <View className="items-center gap-2.5 px-8 pt-12">
            <CatIcon kind="sale" size={96} />
            <AppText className="mt-2 text-center text-[17px] font-vn-bold">
              {keyword ? 'Không có tin nào khớp' : empty.title}
            </AppText>
            <AppText className="text-center text-[14px] leading-[21.7px] text-[#5A6772]">
              {keyword ? 'Thử tên khác hoặc đổi sang mục khác.' : empty.text}
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#E6F1FF]">
      <FlatList
        data={rows}
        keyExtractor={(row) => row.id}
        renderItem={({ item, index }) => {
          const startsGroup = index === 0 || rows[index - 1]!.group !== item.group;
          return (
            <View className="bg-white">
              {startsGroup ? (
                <GroupHeader
                  group={item.group}
                  count={rows.filter((entry) => entry.group === item.group).length}
                  first={index === 0}
                />
              ) : null}
              <ListingRow row={item} segment={segment} />
            </View>
          );
        }}
        ListHeaderComponent={header}
        ListFooterComponent={
          <View className="min-h-24 flex-1 items-center bg-white pt-4">
            {isFetchingNextPage ? <ActivityIndicator color="#1673D9" /> : null}
          </View>
        }
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        refreshControl={
          <RefreshControl refreshing={isRefetching && !isPending} onRefresh={() => refetch()} />
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đăng tin"
        onPress={() => {
          if (guardPost()) setChoosing(true);
        }}
        className="absolute bottom-4 right-4 h-[54px] flex-row items-center justify-center gap-2 rounded-[18px] bg-[#1673D9] pl-4 pr-[22px]"
        style={{
          shadowColor: '#1673D9',
          shadowOpacity: 0.35,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
        }}
      >
        <PathIcon d={ICON_PLUS} size={22} color="#FFFFFF" strokeWidth={2.6} />
        <AppText className="text-[15px] font-vn-semibold text-white">Đăng tin</AppText>
      </Pressable>

      {choosing ? <PostStartSheet onClose={() => setChoosing(false)} /> : null}
    </View>
  );
}

function GroupHeader({
  group,
  count,
  first,
}: {
  group: ListingGroup;
  count: number;
  first: boolean;
}) {
  const icon = GROUP_ICON[group];
  return (
    <View className={`flex-row items-center gap-2 px-4 pb-1.5 ${first ? 'pt-3.5' : 'pt-5'}`}>
      {icon ? <CatIcon kind={icon} size={24} /> : <TabIcon kind="listings" active size={24} />}
      <AppText className="flex-1 text-[15px] font-vn-bold">{GROUP_TITLE[group]}</AppText>
      <AppText className="text-[13px] font-vn-medium text-[#5A6772]">{count}</AppText>
    </View>
  );
}

function ListingRow({ row, segment }: { row: ListingMineRow; segment: ListingSegment }) {
  const router = useRouter();
  const pill = PILL[row.pill.tone];
  const off = row.pill.tone === 'off';

  function open() {
    // In Đang đăng a listing opens its page; in Chờ duyệt (an edit too) and Đã đóng it opens its status page with the review.
    const onMarket = row.status === 'published' || row.status === 'scheduled';
    if (segment === 'open' && onMarket) {
      router.push({ pathname: '/l/[id]', params: { id: row.id } });
    } else {
      router.push({ pathname: '/listings/[id]', params: { id: row.id } });
    }
  }

  return (
    <View className="border-t border-[#EEF2F6]" style={{ opacity: off ? 0.6 : 1 }}>
      <Pressable accessibilityRole="button" onPress={open} className="flex-row gap-3 px-4 py-3">
        <ItemThumb
          url={row.coverUrl}
          categorySlug={row.categorySlug}
          width={56}
          height={68}
          radius={12}
          iconSize={34}
        />
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row items-baseline gap-2">
            <AppText numberOfLines={1} className="min-w-0 flex-1 text-[14.5px] font-vn-semibold">
              {row.title}
            </AppText>
            {row.badge > 0 ? (
              <View className="h-5 min-w-5 items-center justify-center rounded-full bg-[#F0533A] px-1.5">
                <AppText className="text-[11.5px] font-vn-bold text-white">{row.badge}</AppText>
              </View>
            ) : null}
          </View>
          <AppText
            numberOfLines={1}
            className={`text-[13.5px] font-vn-semibold ${off ? 'text-[#5A6772]' : ''}`}
          >
            {row.main}
          </AppText>
          <View className="flex-row items-center gap-2">
            <View
              className="h-[22px] flex-row items-center gap-[5px] rounded-full px-2"
              style={{ backgroundColor: pill.bg }}
            >
              <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pill.dot }} />
              <AppText className="text-[11.5px] font-vn-semibold" style={{ color: pill.fg }}>
                {row.pill.text}
              </AppText>
            </View>
            <AppText numberOfLines={1} className="min-w-0 flex-1 text-[12.5px] text-[#5A6772]">
              {row.who}
            </AppText>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
