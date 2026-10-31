import { keepPreviousData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CatIcon } from '@/components/icons/cat-icon';
import { AddTagSheet } from '@/components/stock/add-tag-sheet';
import { ItemThumb } from '@/components/stock/item-thumb';
import { NOTE_STYLE } from '@/components/stock/note-style';
import { AppText } from '@/components/ui/app-text';
import { ErrorBox, SkeletonBlock } from '@/components/ui/form-controls';
import {
  ICON_CHEVRON_RIGHT,
  ICON_CLOCK,
  ICON_CLOSE,
  ICON_PLUS,
  PathIcon,
} from '@/components/ui/path-icon';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { useItemMediaSignal } from '@/hooks/useItemMediaSignal';
import { fetchMyItems, MY_ITEMS_QUERY_KEY } from '@/services/stock/items-api';
import type { ItemListRow } from '@/types/stock';
import { getAsyncStorage } from '@/utils/async-storage';
import { StockRowsSkeleton, SkeletonGroup } from '@/components/ui/skeletons';
import { FilterChip } from '@/components/ui/filter-chip';

const INTRO_HIDDEN_KEY = 'trao.stock-intro-hidden';
/** While a photo or video of an item is being checked, the list is read again at this pace. */
// The doorbell says when to look again; this only covers RTDB being unavailable.
const CHECKING_REFETCH_MS = 30000;

/** The Kho đồ tab (canvas StockList): the items the user holds, filtered by tag, with "Thêm đồ". */
export default function StockTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { session, getIdToken } = useAuth();
  const [addingTag, setAddingTag] = useState(false);
  const [tag, setTag] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [text, setText] = useState('');
  const [introHidden, setIntroHidden] = useState(true);
  const keyword = useDebounce(text.trim(), 300);

  useEffect(() => {
    let alive = true;
    getAsyncStorage()
      .getItem(INTRO_HIDDEN_KEY)
      .then((value) => {
        if (alive) setIntroHidden(value === '1');
      })
      .catch(() => {
        if (alive) setIntroHidden(false);
      });
    return () => {
      alive = false;
    };
  }, []);

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
    queryKey: [...MY_ITEMS_QUERY_KEY, { tag, keyword, uid: session?.uid }],
    queryFn: async ({ pageParam }) =>
      fetchMyItems(await getIdToken(), {
        tag: tag ?? undefined,
        keyword: keyword || undefined,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    placeholderData: keepPreviousData,
    enabled: !!session,
    // Photos and videos are checked after an item is saved: look again until that is done.
    refetchInterval: (query) =>
      query.state.data?.pages.some((page) =>
        page.items.some((row) => row.mediaStatus === 'checking')
      )
        ? CHECKING_REFETCH_MS
        : false,
  });

  const anyChecking =
    data?.pages.some((page) => page.items.some((row) => row.mediaStatus === 'checking')) ?? false;
  useItemMediaSignal(anyChecking, () => {
    void queryClient.invalidateQueries({ queryKey: MY_ITEMS_QUERY_KEY });
  });

  const first = data?.pages[0];
  const rows = data?.pages.flatMap((page) => page.items) ?? [];
  const allCount = first?.allCount ?? 0;
  const isEmpty = first !== undefined && allCount === 0;
  const filtered = Boolean(tag || keyword);

  function hideIntro() {
    setIntroHidden(true);
    try {
      void getAsyncStorage().setItem(INTRO_HIDDEN_KEY, '1');
    } catch {
      // The card simply shows again next time.
    }
  }

  const stickyHeader = (
    // Stays put while the list scrolls, like the chat list.
    <View className="bg-white" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center pl-4 pr-2">
        <AppText
          accessibilityRole="header"
          className="flex-1 text-[20px] font-vn-bold tracking-[-0.2px]"
        >
          Kho đồ{' '}
          <AppText className="text-[15px] font-vn-medium text-[#5A6772]">{allCount} món</AppText>
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tìm trong kho đồ"
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
            accessibilityLabel="Tìm trong kho đồ"
            value={text}
            onChangeText={setText}
            placeholder="Tìm tên món…"
            placeholderTextColor="#8896A3"
            returnKeyType="search"
            className="h-11 rounded-[14px] border-[1.5px] border-[#D5DDE5] bg-white px-3.5 font-vn text-[15px] text-[#0F2440]"
          />
        </View>
      ) : null}

      {first && allCount > 0 ? (
        <ScrollView
          horizontal
          accessibilityRole="tablist"
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-4 py-2.5"
          className="border-b border-[#F2F5F8]"
        >
          <FilterChip
            label="Tất cả"
            count={allCount}
            on={tag === null}
            onPress={() => setTag(null)}
          />
          {first.tags.map((entry) => (
            <FilterChip
              key={entry.tag}
              label={entry.tag}
              count={entry.count}
              dot={entry.color}
              on={tag === entry.tag}
              onPress={() => setTag(entry.tag)}
            />
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => setAddingTag(true)}
            className="h-[34px] flex-row items-center gap-1 rounded-full border-[1.5px] border-dashed border-[#9CC3F0] px-3.5"
          >
            <PathIcon d={ICON_PLUS} size={14} color="#1673D9" strokeWidth={2.6} />
            <AppText className="text-[13.5px] font-vn-semibold text-[#1673D9]">Tag</AppText>
          </Pressable>
        </ScrollView>
      ) : null}
    </View>
  );

  const listHeader = (
    <View className="bg-white">
      {error && !data ? <ErrorBox message={error.message} onRetry={() => refetch()} /> : null}
      {isPending && session ? <StockRowsSkeleton /> : null}

      {first && allCount > 0 && !introHidden && !filtered ? (
        <View className="relative mx-4 mb-1.5 mt-1 flex-row gap-3 rounded-2xl bg-[#F1F7FE] py-3 pl-3 pr-10">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
            <CatIcon kind="stock" size={28} />
          </View>
          <View className="min-w-0 flex-1 gap-[3px]">
            <AppText className="text-[14px] font-vn-bold">Kho đồ là nơi giữ đồ của bạn</AppText>
            <AppText className="text-[13px] leading-[18.85px] text-[#33414D]">
              Đồ bạn mua, đổi hay được tặng trên Trao tự vào đây. Món nào bạn đăng tin cũng tự có
              trong kho. Gắn tag để dễ tìm, khi cần chỉ việc đăng lại.
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ẩn giới thiệu"
            onPress={hideIntro}
            className="absolute right-1 top-1 h-9 w-9 items-center justify-center"
          >
            <PathIcon d={ICON_CLOSE} size={16} color="#5A6772" strokeWidth={2.2} />
          </Pressable>
        </View>
      ) : null}

      {first && allCount > 0 && rows.length === 0 ? (
        <AppText className="px-8 py-10 text-center text-[14px] text-[#5A6772]">
          Không có món nào khớp.
        </AppText>
      ) : null}

      {isEmpty ? (
        <View className="items-center gap-2.5 px-8 pt-14">
          <CatIcon kind="stock" size={104} />
          <AppText className="mt-2.5 text-[18px] font-vn-bold">Kho đồ còn trống</AppText>
          <AppText className="text-center text-[14px] leading-[21.7px] text-[#5A6772]">
            Đồ bạn mua, đổi hay được tặng trên Trao sẽ tự vào đây. Bạn cũng có thể tự thêm những món
            đang có.
          </AppText>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/stock/new')}
            className="mt-2 h-12 flex-row items-center gap-2 rounded-[14px] bg-[#1673D9] px-5"
          >
            <PathIcon d={ICON_PLUS} size={18} color="#FFFFFF" strokeWidth={2.6} />
            <AppText className="text-[15px] font-vn-semibold text-white">Thêm món đầu tiên</AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      {stickyHeader}
      <FlatList
        data={rows}
        keyExtractor={(row) => row.id}
        renderItem={({ item }) => <StockRow row={item} />}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          <View className="min-h-24 flex-1 items-center bg-white pt-4">
            {isFetchingNextPage ? (
              <SkeletonGroup className="items-center">
                <SkeletonBlock className="h-4 w-24" />
              </SkeletonGroup>
            ) : null}
          </View>
        }
        contentContainerStyle={{ flexGrow: 1 }}
        // The footer's own wrapper has to grow too, or its white background stops short.
        ListFooterComponentStyle={{ flexGrow: 1 }}
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
        accessibilityLabel="Thêm đồ"
        onPress={() => router.push('/stock/new')}
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
        <AppText className="text-[15px] font-vn-semibold text-white">Thêm đồ</AppText>
      </Pressable>

      {addingTag ? (
        <AddTagSheet
          onClose={() => setAddingTag(false)}
          onAdded={async () => {
            setAddingTag(false);
            await queryClient.invalidateQueries({ queryKey: MY_ITEMS_QUERY_KEY });
          }}
        />
      ) : null}
    </View>
  );
}

function StockRow({ row }: { row: ItemListRow }) {
  const router = useRouter();
  const meta = [row.condition, row.categoryName, row.origin].filter(Boolean).join(' · ');
  const note = row.note ? NOTE_STYLE[row.note.tone] : null;

  return (
    <View className="border-t border-[#EEF2F6] bg-white">
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/stock/[id]', params: { id: row.id } })}
        className="flex-row gap-3 px-4 py-3.5"
      >
        <ItemThumb
          url={row.coverUrl}
          categorySlug={row.categorySlug}
          width={64}
          height={78}
          radius={14}
        />
        <View className="min-w-0 flex-1 gap-[5px]">
          <AppText numberOfLines={2} className="text-[15px] font-vn-semibold leading-[20px]">
            {row.title}
          </AppText>
          <AppText className="text-[12.5px] text-[#5A6772]">{meta}</AppText>
          {row.tags.length > 0 ? (
            <View className="flex-row flex-wrap gap-1.5">
              {row.tags.map((entry) => (
                <View
                  key={entry.tag}
                  className="h-[22px] flex-row items-center gap-1 rounded-md bg-[#F2F5F8] px-2"
                >
                  <View
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <AppText className="text-[11.5px] font-vn-semibold text-[#33414D]">
                    {entry.tag}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}
          {row.mediaStatus === 'checking' ? (
            <View className="flex-row items-center gap-1.5">
              <PathIcon d={ICON_CLOCK} size={13} color="#8A5A00" strokeWidth={2.2} />
              <AppText className="text-[12.5px] font-vn-semibold text-[#8A5A00]">
                Đang kiểm tra ảnh và video
              </AppText>
            </View>
          ) : null}
          {row.note && note ? (
            <View className="flex-row items-center gap-1.5">
              <PathIcon d={note.icon} size={13} color={note.color} strokeWidth={2.2} />
              <AppText
                numberOfLines={1}
                className="flex-1 text-[12.5px] font-vn-semibold"
                style={{ color: note.color }}
              >
                {row.note.text}
              </AppText>
            </View>
          ) : null}
        </View>
        <View className="self-center">
          <PathIcon d={ICON_CHEVRON_RIGHT} size={16} color="#A3AEB9" />
        </View>
      </Pressable>
    </View>
  );
}
