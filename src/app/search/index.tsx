import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { CATEGORY_ICON_BY_SLUG } from '@/components/icons/cat-icon';
import { Chip, Chips, FORM_ICON, Group, Tile } from '@/components/search/search-ui';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { useGoBack } from '@/hooks/useGoBack';
import {
  fetchSearchCount,
  fetchSearchOptions,
  saveSearch,
  SEARCH_OPTIONS_KEY,
} from '@/services/search/search-api';
import { SEARCH_FORMS, SEARCH_REGIONS, type SearchFilters, type SearchForm } from '@/types/search';
import { ITEM_CONDITIONS } from '@/types/stock';
import {
  filtersFromHistory,
  parseSearchFilters,
  toSearchQuery,
  toSearchRouteParams,
} from '@/utils/search-params';
import {
  defaultSearchRegion,
  regionLabel,
  SEARCH_EXTRA_LABELS,
  SEARCH_EXTRAS_BY_FORM,
  SEARCH_FORM_LABELS,
  SEARCH_PLACEHOLDERS,
  SEARCH_PRICE_BUCKETS,
  SEARCH_QUERY_MAX_LENGTH,
  SEARCH_SORTS_BY_FORM,
  toggleInList,
  withForm,
} from '@/utils/search-rules';
import { useBottomInset } from '@/hooks/useBottomInset';

/**
 * The search sheet (canvas Main, search open): the box, recent searches, form, category and the
 * filters of that form, with the live count on "Xem N món". It starts from the filters in the
 * params, so "Sửa tìm kiếm" on the results comes back with them.
 */
export default function SearchEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const queryClient = useQueryClient();
  const goBack = useGoBack('/');
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<Record<string, string>>();
  const { session, status, getIdToken } = useAuth();
  const uid = session?.uid ?? null;
  const [filters, setFilters] = useState<SearchFilters>(() => parseSearchFilters(params));
  const [text, setText] = useState(filters.q);

  const { data: options } = useQuery({
    queryKey: [...SEARCH_OPTIONS_KEY, uid],
    queryFn: async () => fetchSearchOptions(session ? await getIdToken() : undefined),
    staleTime: 5 * 60_000,
    enabled: status !== 'restoring',
  });

  const current: SearchFilters = { ...filters, q: text.trim() };
  const typed = useDebounce(text.trim(), 300);
  const countFilters: SearchFilters = { ...filters, q: typed };
  const { data: count } = useQuery({
    queryKey: ['search', 'count', uid, toSearchQuery(countFilters)],
    queryFn: async () => fetchSearchCount(countFilters, session ? await getIdToken() : undefined),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled: status !== 'restoring',
  });

  const { form } = filters;
  const region = filters.region ?? defaultSearchRegion(form);
  const buckets = SEARCH_PRICE_BUCKETS[form];
  const extras = SEARCH_EXTRAS_BY_FORM[form];
  const sorts = SEARCH_SORTS_BY_FORM[form];
  const cityName = options?.cityName ?? null;
  const noun = form === 'auction' ? 'phiên' : 'món';
  const tileWidth = (width - 32 - 8 * 3) / 4;

  function patch(next: Partial<SearchFilters>) {
    setFilters((previous) => ({ ...previous, ...next }));
  }

  function reset() {
    setFilters((previous) => ({
      ...previous,
      category: undefined,
      region: undefined,
      conditions: [],
      price: undefined,
      extras: [],
      sort: 'rel',
    }));
  }

  function showResults(next: SearchFilters = current) {
    if (next.q && session) {
      void (async () => {
        await saveSearch(await getIdToken(), next);
        await queryClient.invalidateQueries({ queryKey: SEARCH_OPTIONS_KEY });
      })().catch(() => undefined);
    }
    router.replace({ pathname: '/search/results', params: toSearchRouteParams(next) });
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-[#E6F1FF]"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center gap-1 py-3.5 pl-1 pr-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng tìm kiếm"
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
        <View className="flex-1 justify-center">
          <View className="absolute left-3.5 z-10" pointerEvents="none">
            <Svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1673D9"
              strokeWidth={2.2}
              strokeLinecap="round"
            >
              <Circle cx={11} cy={11} r={7} />
              <Path d="M20 20l-4-4" />
            </Svg>
          </View>
          <TextInput
            autoFocus
            accessibilityLabel="Tìm món"
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => showResults()}
            maxLength={SEARCH_QUERY_MAX_LENGTH}
            returnKeyType="search"
            placeholder={SEARCH_PLACEHOLDERS[form]}
            placeholderTextColor="#8896A3"
            className="h-12 rounded-[14px] border-2 border-[#1673D9] bg-white pl-11 pr-3.5 font-vn text-[15px] text-[#0F2440]"
          />
        </View>
      </View>

      <ScrollView
        className="flex-1 rounded-t-[26px] bg-white"
        contentContainerClassName="gap-6 px-4 pb-6 pt-[18px]"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {options && options.history.length > 0 ? (
          <ScrollView
            horizontal
            accessibilityLabel="Tìm gần đây"
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="items-center gap-2"
            className="flex-none"
          >
            <AppText className="text-[12.5px] text-[#5A6772]">Gần đây</AppText>
            {options.history.map((entry) => (
              <Pressable
                key={entry.id}
                accessibilityRole="button"
                onPress={() => showResults(filtersFromHistory(entry))}
                className="h-[34px] flex-row items-center gap-[5px] rounded-full bg-[#F1F7FE] px-3"
              >
                <Svg
                  width={13}
                  height={13}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#5A6772"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                >
                  <Circle cx={12} cy={12} r={8} />
                  <Path d="M12 8v4l3 2" />
                </Svg>
                <AppText className="text-[13px] text-[#33414D]">{entry.query}</AppText>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <Group title="Hình thức">
          <View className="flex-row gap-1.5">
            {SEARCH_FORMS.map((id: SearchForm) => (
              <Tile
                key={id}
                on={form === id}
                onPress={() => setFilters((previous) => withForm(previous, id))}
                icon={FORM_ICON[id]}
                iconSize={32}
                label={SEARCH_FORM_LABELS[id]}
                height={78}
                radius={14}
                textSize={11.5}
              />
            ))}
          </View>
        </Group>

        <Group title="Danh mục">
          <View className="flex-row flex-wrap gap-2">
            <Tile
              width={tileWidth}
              on={!filters.category}
              onPress={() => patch({ category: undefined })}
              icon="all"
              iconSize={38}
              label="Tất cả"
              height={84}
              radius={16}
              textSize={12}
            />
            {(options?.categories ?? []).map((category) => (
              <Tile
                key={category.slug}
                width={tileWidth}
                on={filters.category === category.slug}
                onPress={() => patch({ category: category.slug })}
                icon={CATEGORY_ICON_BY_SLUG[category.slug] ?? 'collect'}
                iconSize={38}
                label={category.name}
                height={84}
                radius={16}
                textSize={12}
              />
            ))}
          </View>
        </Group>

        <Group title={cityName ? `Khu vực · ${cityName}` : 'Khu vực'}>
          <Chips>
            {SEARCH_REGIONS.filter((id) => id !== 'city' || cityName).map((id) => (
              <Chip key={id} on={region === id} onPress={() => patch({ region: id })}>
                {regionLabel(id, cityName, true)}
              </Chip>
            ))}
          </Chips>
        </Group>

        {buckets ? (
          <Group title={form === 'auction' ? 'Giá hiện tại' : 'Giá'}>
            <Chips>
              {buckets.map((bucket) => (
                <Chip
                  key={bucket.id}
                  on={filters.price === bucket.id}
                  onPress={() =>
                    patch({ price: filters.price === bucket.id ? undefined : bucket.id })
                  }
                >
                  {bucket.label}
                </Chip>
              ))}
            </Chips>
          </Group>
        ) : null}

        <Group title="Tình trạng">
          <Chips>
            {ITEM_CONDITIONS.map((condition) => (
              <Chip
                key={condition.code}
                on={filters.conditions.includes(condition.code)}
                onPress={() =>
                  patch({ conditions: toggleInList(filters.conditions, condition.code) })
                }
              >
                {condition.label}
              </Chip>
            ))}
          </Chips>
        </Group>

        {extras.length > 0 ? (
          <Group title={form === 'auction' ? 'Phiên' : 'Thêm'}>
            <Chips>
              {extras.map((extra) => (
                <Chip
                  key={extra}
                  on={filters.extras.includes(extra)}
                  onPress={() => patch({ extras: toggleInList(filters.extras, extra) })}
                >
                  {SEARCH_EXTRA_LABELS[extra]}
                </Chip>
              ))}
            </Chips>
          </Group>
        ) : null}

        <Group title="Sắp xếp">
          <Chips>
            {sorts.map((sort) => (
              <Chip
                key={sort.id}
                on={filters.sort === sort.id}
                onPress={() => patch({ sort: sort.id })}
              >
                {sort.label}
              </Chip>
            ))}
          </Chips>
        </Group>
      </ScrollView>

      <View
        className="flex-row gap-2.5 border-t border-[#E8ECF0] bg-white px-4 pt-3"
        style={{ paddingBottom: 16 + bottomInset }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={reset}
          className="h-[50px] justify-center rounded-[14px] bg-[#F1F7FE] px-5"
        >
          <AppText className="text-[14px] font-vn-semibold">Xoá lọc</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => showResults()}
          className="h-[50px] flex-1 items-center justify-center rounded-[14px] bg-[#1673D9]"
        >
          <AppText className="text-[15px] font-vn-semibold text-white">
            {count ? `Xem ${count.total} ${noun}` : 'Xem kết quả'}
          </AppText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
