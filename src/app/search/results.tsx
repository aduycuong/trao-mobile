import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { CatIcon } from '@/components/icons/cat-icon';
import { ListingCard } from '@/components/listings/listing-card';
import { FORM_ICON } from '@/components/search/search-ui';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ErrorBox, SkeletonBlock } from '@/components/ui/form-controls';
import { useAuth } from '@/hooks/useAuth';
import { useGoBack } from '@/hooks/useGoBack';
import { fetchSearch, fetchSearchOptions, SEARCH_OPTIONS_KEY } from '@/services/search/search-api';
import type { ListingCardData } from '@/types/people';
import { SEARCH_FORMS, type SearchFilters, type SearchFix, type SearchForm } from '@/types/search';
import { parseSearchFilters, toSearchQuery, toSearchRouteParams } from '@/utils/search-params';
import {
  describeFilters,
  regionLabel,
  SEARCH_FORM_LABELS,
  SEARCH_SORTS_BY_FORM,
  withForm,
} from '@/utils/search-rules';

/** Cards before the "wider area" card (canvas SearchResults). */
const BEFORE_WIDEN = 4;
const GUTTER = 16;
const GAP = 10;

type Row = { kind: 'pair'; key: string; cards: ListingCardData[] } | { kind: 'widen'; key: string };

function pairs(cards: ListingCardData[]): Row[] {
  const rows: Row[] = [];
  for (let index = 0; index < cards.length; index += 2) {
    const chunk = cards.slice(index, index + 2);
    rows.push({ kind: 'pair', key: chunk.map((card) => card.id).join('|'), cards: chunk });
  }
  return rows;
}

/**
 * Search results (canvas SearchResults): the box and form tabs on top, the active filters as
 * removable chips, count and sort, the cards with the offer to widen the area between them, and
 * the way out when nothing matched.
 */
export default function SearchResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = useGoBack('/');
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<Record<string, string>>();
  const { session, status, getIdToken } = useAuth();
  const uid = session?.uid ?? null;
  const listRef = useRef<FlatList<Row>>(null);
  const [filters, setFilters] = useState<SearchFilters>(() => parseSearchFilters(params));
  const [sorting, setSorting] = useState(false);
  const [now] = useState(() => Date.now());
  const cardWidth = (width - GUTTER * 2 - GAP) / 2;
  const ready = status !== 'restoring';

  const { data: options } = useQuery({
    queryKey: [...SEARCH_OPTIONS_KEY, uid],
    queryFn: async () => fetchSearchOptions(session ? await getIdToken() : undefined),
    staleTime: 5 * 60_000,
    enabled: ready,
  });
  const { data, error, refetch, isPending, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ['search', 'results', uid, toSearchQuery(filters)],
      queryFn: async ({ pageParam }) =>
        fetchSearch(filters, pageParam, session ? await getIdToken() : undefined),
      initialPageParam: 0,
      getNextPageParam: (last) => last.nextOffset ?? undefined,
      staleTime: 60_000,
      enabled: ready,
    });

  const first = data?.pages[0];
  const cards = useMemo(() => {
    const seen = new Set<string>();
    const out: ListingCardData[] = [];
    for (const page of data?.pages ?? []) {
      for (const card of page.items) {
        if (seen.has(card.id)) continue;
        seen.add(card.id);
        out.push(card);
      }
    }
    return out;
  }, [data]);

  const chips = describeFilters(filters, options?.categories ?? []);
  const sorts = SEARCH_SORTS_BY_FORM[filters.form];
  const region = first?.region ?? filters.region ?? 'nation';
  const cityName = first?.cityName ?? options?.cityName ?? null;
  const noun = filters.form === 'auction' ? 'phiên' : 'món';
  const formName = filters.form === 'all' ? 'Tất cả hình thức' : SEARCH_FORM_LABELS[filters.form];
  const summary = [
    formName,
    regionLabel(region, cityName),
    ...chips.map((chip) => chip.label),
  ].join(' · ');

  const widen = first?.widen ?? null;
  const rows: Row[] = useMemo(() => {
    if (!widen) return pairs(cards);
    return [
      ...pairs(cards.slice(0, BEFORE_WIDEN)),
      { kind: 'widen', key: 'widen' } as Row,
      ...pairs(cards.slice(BEFORE_WIDEN)),
    ];
  }, [cards, widen]);

  function change(patch: Partial<SearchFilters>) {
    setFilters((previous) => ({ ...previous, ...patch }));
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }

  function pickForm(form: SearchForm) {
    if (form === filters.form) return;
    setFilters((previous) => withForm(previous, form));
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }

  function applyFix(fix: SearchFix) {
    if (fix.kind === 'region') change({ region: fix.region });
    else if (fix.kind === 'price') change({ price: undefined });
    else if (fix.kind === 'conditions') change({ conditions: [] });
    else if (fix.kind === 'extras') change({ extras: [] });
    else change({ category: undefined });
  }

  function edit() {
    router.replace({ pathname: '/search', params: toSearchRouteParams(filters) });
  }

  const header = (
    <View className="gap-2.5 pb-1 pt-3">
      {chips.length > 0 ? (
        <ScrollView
          horizontal
          accessibilityLabel="Bộ lọc đang bật"
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="items-center gap-2 px-4"
          className="flex-none"
        >
          {chips.map((chip) => (
            <View
              key={chip.key}
              className="h-8 flex-row items-center gap-0.5 rounded-full bg-[#F1F7FE] pl-3 pr-1"
            >
              <AppText className="text-[13px] font-vn-semibold text-[#0B4A99]">
                {chip.label}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Bỏ lọc ${chip.label}`}
                onPress={() => change(chip.remove)}
                className="h-[26px] w-[26px] items-center justify-center rounded-full"
              >
                <Svg
                  width={12}
                  height={12}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0B4A99"
                  strokeWidth={2.8}
                  strokeLinecap="round"
                >
                  <Path d="M6 6l12 12M18 6L6 18" />
                </Svg>
              </Pressable>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              change({ category: undefined, conditions: [], price: undefined, extras: [] })
            }
            className="h-8 justify-center px-2"
          >
            <AppText className="text-[13px] font-vn-semibold text-[#5A6772]">Xoá lọc</AppText>
          </Pressable>
        </ScrollView>
      ) : null}
      <View className="flex-row items-center gap-2 px-4">
        <View className="min-w-0 flex-1">
          {first ? (
            <AppText className="text-[13.5px] text-[#33414D]">
              <AppText className="text-[13.5px] font-vn-bold">{first.total}</AppText> {noun} ·{' '}
              {regionLabel(region, cityName)}
            </AppText>
          ) : (
            <SkeletonBlock className="h-4 w-32" />
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setSorting(true)}
          className="h-9 flex-row items-center gap-1 rounded-[10px] pl-2.5 pr-1"
        >
          <Svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0F2440"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3" />
          </Svg>
          <AppText className="text-[13.5px] font-vn-semibold">
            {sorts.find((option) => option.id === filters.sort)?.label}
          </AppText>
        </Pressable>
      </View>

      {error && !data ? <ErrorBox message={error.message} onRetry={() => void refetch()} /> : null}

      {isPending && ready ? (
        <View
          accessibilityLabel="Đang tìm"
          className="flex-row flex-wrap gap-x-2.5 gap-y-5 px-4 pt-3"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <View key={index} className="gap-2" style={{ width: cardWidth }}>
              <SkeletonBlock className="aspect-[4/5] w-full rounded-2xl" />
              <SkeletonBlock className="h-4 w-1/2" />
              <SkeletonBlock className="h-4 w-4/5" />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  const empty =
    first && cards.length === 0 ? (
      <View className="items-center gap-2.5 px-7 pt-9">
        <CatIcon kind={filters.form === 'all' ? 'sale' : FORM_ICON[filters.form]} size={96} />
        <AppText accessibilityRole="header" className="mt-2 text-[18px] font-vn-bold">
          Chưa có {noun} nào khớp
        </AppText>
        <AppText className="text-center text-[14px] leading-[21.7px] text-[#5A6772]">
          Thử bỏ bớt bộ lọc hoặc tìm ở khu vực rộng hơn.
        </AppText>
        <View className="mt-2 w-full gap-2">
          {first.fixes.map((fix) => (
            <Pressable
              key={fix.kind}
              accessibilityRole="button"
              onPress={() => applyFix(fix)}
              className="h-[52px] flex-row items-center gap-2.5 rounded-[14px] border-[1.5px] border-[#D5DDE5] bg-white px-3.5"
            >
              <AppText className="flex-1 text-[14px] font-vn-semibold">{fix.label}</AppText>
              <AppText className="text-[13px] font-vn-semibold text-[#1673D9]">
                {fix.count} {noun}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>
    ) : null;

  return (
    <View className="flex-1 bg-white">
      <View className="gap-2.5 bg-[#E6F1FF] pb-3" style={{ paddingTop: 12 + insets.top }}>
        <View className="flex-row items-center gap-1.5 pl-1 pr-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={goBack}
            className="h-11 w-11 items-center justify-center"
          >
            <Svg
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0F2440"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M15 6l-6 6 6 6" />
            </Svg>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sửa tìm kiếm: ${filters.q || 'Tất cả đồ'}`}
            onPress={edit}
            className="h-[52px] min-w-0 flex-1 flex-row items-center gap-2.5 rounded-[14px] bg-white px-3.5"
            style={{
              shadowColor: '#0F2440',
              shadowOpacity: 0.08,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
              elevation: 1,
            }}
          >
            <Svg
              width={19}
              height={19}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1673D9"
              strokeWidth={2.2}
              strokeLinecap="round"
            >
              <Circle cx={11} cy={11} r={7} />
              <Path d="M20 20l-4-4" />
            </Svg>
            <View className="min-w-0 flex-1 gap-px">
              <AppText numberOfLines={1} className="text-[15px] font-vn-bold">
                {filters.q || 'Tất cả đồ'}
              </AppText>
              <AppText numberOfLines={1} className="text-[12px] text-[#5A6772]">
                {summary}
              </AppText>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Bộ lọc, ${chips.length} đang bật`}
            onPress={edit}
            className="h-12 w-12 items-center justify-center rounded-[14px] bg-white"
          >
            <Svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0F2440"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <Path d="M4 6h16M7 12h10M10 18h4" />
            </Svg>
            {chips.length > 0 ? (
              <View className="absolute right-1.5 top-1.5 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#1673D9] px-[5px]">
                <AppText className="text-[11px] font-vn-bold text-white">{chips.length}</AppText>
              </View>
            ) : null}
          </Pressable>
        </View>
        <ScrollView
          horizontal
          accessibilityRole="tablist"
          accessibilityLabel="Hình thức"
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-4"
          className="flex-none"
        >
          {SEARCH_FORMS.map((form) => {
            const on = filters.form === form;
            return (
              <Pressable
                key={form}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => pickForm(form)}
                className={`h-9 flex-row items-center gap-1.5 rounded-full border-[1.5px] pl-2 pr-3 ${
                  on ? 'border-[#0F2440] bg-[#0F2440]' : 'border-transparent bg-white'
                }`}
              >
                <CatIcon kind={FORM_ICON[form]} size={22} />
                <AppText className={`text-[13.5px] font-vn-semibold ${on ? 'text-white' : ''}`}>
                  {SEARCH_FORM_LABELS[form]}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(row) => row.key}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        renderItem={({ item, index }) =>
          item.kind === 'widen' && widen ? (
            <View className="mx-4 mt-[22px] flex-row items-center gap-3 rounded-2xl bg-[#F1F7FE] p-3.5">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                <Svg
                  width={20}
                  height={20}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1673D9"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Circle cx={12} cy={10} r={3} />
                  <Path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
                </Svg>
              </View>
              <View className="min-w-0 flex-1 gap-0.5">
                <AppText className="text-[14px] font-vn-bold">
                  Thêm {widen.count} {noun} ở xa hơn
                </AppText>
                <AppText className="text-[12.5px] text-[#5A6772]">
                  {widen.region === 'city'
                    ? `Tìm ${regionLabel('city', cityName)}`
                    : 'Tìm toàn quốc · có gửi hàng'}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => applyFix(widen)}
                className="h-9 justify-center rounded-[10px] bg-[#1673D9] px-3"
              >
                <AppText className="text-[13px] font-vn-bold text-white">Xem</AppText>
              </Pressable>
            </View>
          ) : item.kind === 'pair' ? (
            <View
              className="flex-row px-4"
              style={{
                gap: GAP,
                paddingTop: index === 0 ? 8 : rows[index - 1]?.kind === 'widen' ? 22 : 20,
              }}
            >
              {item.cards.map((card) => (
                <View key={card.id} style={{ width: cardWidth }}>
                  <ListingCard listing={card} now={now} />
                </View>
              ))}
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={{ paddingBottom: 24 + insets.bottom }}>
            {isFetchingNextPage ? <ActivityIndicator color="#1673D9" className="mt-4" /> : null}
          </View>
        }
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
      />

      {sorting ? (
        <BottomSheet title="Sắp xếp" onClose={() => setSorting(false)}>
          <View accessibilityRole="radiogroup">
            {sorts.map((option) => {
              const on = filters.sort === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => {
                    setSorting(false);
                    change({ sort: option.id });
                  }}
                  className="flex-row items-center gap-3 border-b border-[#EEF2F6] px-1 py-3"
                >
                  <View className="flex-1 gap-0.5">
                    <AppText className={`text-[15px] ${on ? 'font-vn-bold' : 'font-vn-medium'}`}>
                      {option.label}
                    </AppText>
                    <AppText className="text-[12.5px] text-[#5A6772]">{option.sub}</AppText>
                  </View>
                  <View
                    className={`h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
                      on ? 'border-[#1673D9]' : 'border-[#C3CCD6]'
                    }`}
                  >
                    {on ? <View className="h-2.5 w-2.5 rounded-full bg-[#1673D9]" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </BottomSheet>
      ) : null}
    </View>
  );
}
