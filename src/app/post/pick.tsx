import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { ItemThumb } from '@/components/stock/item-thumb';
import { NOTE_STYLE } from '@/components/stock/note-style';
import { AppText } from '@/components/ui/app-text';
import { ErrorBox } from '@/components/ui/form-controls';
import { PathIcon } from '@/components/ui/path-icon';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { useGoBack } from '@/hooks/useGoBack';
import { usePenaltyGuard } from '@/hooks/usePenaltyGuard';
import { fetchMyItems } from '@/services/stock/items-api';
import { LISTING_TYPES } from '@/types/people';
import { canPostAlongside } from '@/utils/listing-rules';
import { RequireSession } from '@/components/auth/require-session';
import { PickRowsSkeleton } from '@/components/ui/skeletons';

/** "Chọn món để đăng" (canvas Post, step "pick"): items of Kho đồ to post. */
function PostPickContent() {
  const router = useRouter();
  const goBack = useGoBack('/listings');
  const postGuard = usePenaltyGuard();
  const { session, getIdToken } = useAuth();
  const [text, setText] = useState('');
  const keyword = useDebounce(text.trim(), 300);

  const { data, error, isPending, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useInfiniteQuery({
      queryKey: ['items', 'post-pick', keyword, session?.uid],
      queryFn: async ({ pageParam }) =>
        fetchMyItems(await getIdToken(), { keyword: keyword || undefined, offset: pageParam }),
      initialPageParam: 0,
      getNextPageParam: (last) => last.nextOffset ?? undefined,
      enabled: !!session,
    });
  const rows = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <View className="flex-1 bg-white">
      <ScreenBar title="Chọn món để đăng" onBack={goBack} />
      <View className="mx-4 mb-1 mt-3 h-11 flex-row items-center gap-2.5 rounded-xl bg-[#F2F5F8] px-3.5">
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
          accessibilityLabel="Tìm trong Kho đồ"
          value={text}
          onChangeText={setText}
          placeholder="Tìm trong Kho đồ"
          placeholderTextColor="#8A96A3"
          returnKeyType="search"
          className="min-w-0 flex-1 p-0 font-vn text-[14px] text-[#0F2440]"
        />
      </View>

      {error && !data ? <ErrorBox message={error.message} onRetry={() => refetch()} /> : null}
      {isPending && session ? <PickRowsSkeleton /> : null}
      {data && rows.length === 0 ? (
        <View className="items-center gap-3 px-8 pt-12">
          <AppText className="text-center text-[14px] leading-[21.7px] text-[#5A6772]">
            {keyword ? 'Không có món nào khớp.' : 'Kho đồ còn trống. Thêm món mới để đăng tin.'}
          </AppText>
          {!keyword ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace({ pathname: '/stock/new', params: { flow: 'post' } })}
              className="h-12 justify-center rounded-[14px] bg-[#1673D9] px-5"
            >
              <AppText className="text-[15px] font-vn-semibold text-white">Thêm món mới</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(row) => row.id}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="items-center py-4">
              <ActivityIndicator color="#1673D9" />
            </View>
          ) : null
        }
        renderItem={({ item: row }) => {
          // An item in a deal, or one with no form left to post, cannot be picked.
          const pickable =
            row.status !== 'in_transaction' &&
            LISTING_TYPES.some((candidate) => canPostAlongside(candidate, row.openListingTypes));
          const note = row.note ? NOTE_STYLE[row.note.tone] : null;
          return (
            <View className="border-t border-[#EEF2F6]">
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !pickable }}
                disabled={!pickable}
                onPress={() => {
                  if (!postGuard.guard('post')) return;
                  router.push({
                    pathname: '/stock/[id]/post',
                    params: { id: row.id, from: 'stock' },
                  });
                }}
                className={`flex-row items-center gap-3 px-4 py-3 ${pickable ? '' : 'opacity-50'}`}
              >
                <ItemThumb
                  url={row.coverUrl}
                  categorySlug={row.categorySlug}
                  width={56}
                  height={64}
                  radius={12}
                  iconSize={34}
                />
                <View className="min-w-0 flex-1 gap-[3px]">
                  <AppText
                    numberOfLines={2}
                    className="text-[14.5px] font-vn-semibold leading-[19.5px]"
                  >
                    {row.title}
                  </AppText>
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
              </Pressable>
            </View>
          );
        }}
      />
      {postGuard.sheet}
    </View>
  );
}

export default function PostPickScreen() {
  return (
    <RequireSession>
      <PostPickContent />
    </RequireSession>
  );
}
