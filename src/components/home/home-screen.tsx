import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { FeedCardMenu } from '@/components/home/feed-card-menu';
import { HomeSearchPill } from '@/components/home/home-search-pill';
import { PendingDeals } from '@/components/home/pending-deals';
import { PenaltyBanner } from '@/components/home/penalty-banner';
import { CATEGORY_ICON_BY_SLUG, CatIcon, type CatIconKind } from '@/components/icons/cat-icon';
import { ListingCard } from '@/components/listings/listing-card';
import { TabHeader } from '@/components/navigation/tab-header';
import { PostStartSheet } from '@/components/post/post-start-sheet';
import { AppText } from '@/components/ui/app-text';
import { ErrorBox, SkeletonBlock } from '@/components/ui/form-controls';
import { ICON_CHEVRON_RIGHT, ICON_PLUS, PathIcon } from '@/components/ui/path-icon';
import { useAuth } from '@/hooks/useAuth';
import { usePostGuard } from '@/hooks/usePostGuard';
import {
  fetchHomeFeed,
  fetchLatestFeed,
  hideFeedItem,
  HOME_FEED_KEY,
  LATEST_FEED_KEY,
  unhideFeedItem,
} from '@/services/feed/feed-api';
import type { FeedCard, FeedStripId } from '@/types/feed';

const STRIP_ICON: Record<FeedStripId, CatIconKind> = {
  suggested: 'sale',
  auctions: 'auction',
  gifts: 'gift',
  trades: 'swap',
};

const GUTTER = 16;
const GAP = 10;

type Hidden = { listings: string[]; sellers: string[] };
type Notice = { text: string; undo: () => void };

/** One clock for every card, ticking once a minute (auction "time left"). */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/**
 * Home tab (canvas Main): search box, category row, the blocks (suggestions, auctions, gifts,
 * swaps) and "Tin mới đăng" with infinite scroll. The tab stays mounted while a listing is open,
 * so the scroll position is kept. Guests see the same feed; their actions go to the sign-in gate.
 */
export function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, status, getIdToken } = useAuth();
  const guardPost = usePostGuard();
  const { width } = useWindowDimensions();
  const now = useNow();
  const uid = session?.uid ?? null;
  const ready = status !== 'restoring';
  const cardWidth = (width - GUTTER * 2 - GAP) / 2;

  const [posting, setPosting] = useState(false);
  const [menuFor, setMenuFor] = useState<FeedCard | null>(null);
  const [hidden, setHidden] = useState<Hidden>({ listings: [], sellers: [] });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    []
  );

  const home = useQuery({
    queryKey: [...HOME_FEED_KEY, uid],
    queryFn: async () => fetchHomeFeed(session ? await getIdToken() : undefined),
    staleTime: 60_000,
    enabled: ready,
  });
  const excludeIds = home.data?.excludeIds;
  const latest = useInfiniteQuery({
    queryKey: [...LATEST_FEED_KEY, uid, excludeIds?.join(',') ?? ''],
    queryFn: async ({ pageParam }) =>
      fetchLatestFeed(
        { cursor: pageParam, exclude: excludeIds ?? [] },
        session ? await getIdToken() : undefined
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: ready && !!excludeIds,
    staleTime: 60_000,
  });

  // A hidden seller takes every one of their cards with them.
  const isShown = (card: FeedCard) =>
    !hidden.listings.includes(card.id) && !hidden.sellers.includes(card.ownerId);

  const strips = (home.data?.strips ?? [])
    .map((strip) => ({ ...strip, items: strip.items.filter(isShown) }))
    .filter((strip) => strip.items.length > 0);
  const cards = useMemo(() => {
    const seen = new Set<string>();
    const out: FeedCard[] = [];
    for (const page of latest.data?.pages ?? []) {
      for (const card of page.items) {
        if (seen.has(card.id)) continue;
        seen.add(card.id);
        out.push(card);
      }
    }
    return out;
  }, [latest.data]);
  const shownCards = cards.filter(isShown);

  async function refresh() {
    setRefreshing(true);
    try {
      await queryClient.resetQueries({ queryKey: LATEST_FEED_KEY });
      await home.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  function showNotice(next: Notice) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(next);
    noticeTimer.current = setTimeout(() => setNotice(null), 5000);
  }

  function restore(card: FeedCard, kind: 'listing' | 'seller') {
    setHidden((current) =>
      kind === 'listing'
        ? { ...current, listings: current.listings.filter((id) => id !== card.id) }
        : { ...current, sellers: current.sellers.filter((id) => id !== card.ownerId) }
    );
  }

  async function hide(card: FeedCard, kind: 'listing' | 'seller') {
    setMenuFor(null);
    if (!session) {
      router.push('/auth-gate');
      return;
    }
    setHidden((current) =>
      kind === 'listing'
        ? { ...current, listings: [...current.listings, card.id] }
        : { ...current, sellers: [...current.sellers, card.ownerId] }
    );
    try {
      await hideFeedItem(await getIdToken(), kind, card.id);
      showNotice({
        text: kind === 'listing' ? 'Đã ẩn tin này.' : 'Đã ẩn người bán này.',
        undo: () => {
          setNotice(null);
          restore(card, kind);
          void (async () => unhideFeedItem(await getIdToken(), kind, card.id))().catch(
            () => undefined
          );
        },
      });
    } catch (caught) {
      restore(card, kind);
      Alert.alert('Không ẩn được', caught instanceof Error ? caught.message : 'Bạn thử lại nhé.');
    }
  }

  function openPost() {
    if (!session) {
      router.push('/auth-gate');
      return;
    }
    if (guardPost()) setPosting(true);
  }

  const failed = (home.error && !home.data) || (latest.error && !latest.data);
  const finished = !!latest.data && !latest.hasNextPage;

  const header = (
    <View>
      <TabHeader />
      <HomeSearchPill />
      <View className="rounded-t-[26px] bg-white pt-[18px]">
        <PenaltyBanner />
        <PendingDeals />

        {failed ? (
          <ErrorBox
            message={(home.error ?? latest.error)?.message ?? 'Không tải được Trang chủ.'}
            onRetry={() => {
              void home.refetch();
              void latest.refetch();
            }}
          />
        ) : null}

        {home.isPending && ready ? <HomeSkeleton /> : null}

        {home.data ? (
          <>
            <ScrollView
              horizontal
              accessibilityLabel="Danh mục"
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-1 px-3 pb-1"
            >
              {home.data.categories.map((category) => (
                <Pressable
                  key={category.slug}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: '/search/results',
                      params: { category: category.slug },
                    })
                  }
                  className="w-[72px] items-center gap-1.5 py-1"
                >
                  <View className="h-14 w-14 items-center justify-center rounded-[18px] bg-[#F1F7FE]">
                    <CatIcon kind={CATEGORY_ICON_BY_SLUG[category.slug] ?? 'collect'} size={40} />
                  </View>
                  <AppText numberOfLines={1} className="text-[12px] font-vn-medium">
                    {category.name}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>

            {strips.map((strip) => (
              <View key={strip.id} accessibilityLabel={strip.title} className="pt-[22px]">
                <View className="mb-2 flex-row items-center gap-2 pl-4 pr-2">
                  <CatIcon kind={STRIP_ICON[strip.id]} size={26} />
                  <AppText
                    accessibilityRole="header"
                    numberOfLines={1}
                    className="min-w-0 flex-1 text-[17px] font-vn-bold"
                  >
                    {strip.title}
                  </AppText>
                  {strip.seeAll.type ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: '/search/results',
                          params: { form: strip.seeAll.type as string },
                        })
                      }
                      className="min-h-11 flex-row items-center px-2"
                    >
                      <AppText className="text-[13px] font-vn-semibold text-[#1673D9]">
                        Xem tất cả
                      </AppText>
                      <PathIcon d={ICON_CHEVRON_RIGHT} size={16} color="#1673D9" />
                    </Pressable>
                  ) : null}
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2.5 px-4"
                >
                  {strip.items.map((card) => (
                    <View key={card.id} className="w-[150px]">
                      <ListingCard listing={card} now={now} onMenu={() => setMenuFor(card)} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            ))}

            <View className="mt-[26px] h-2 bg-[#F2F5F8]" />
            <View className="flex-row items-baseline gap-2 px-4 pb-3 pt-5">
              <AppText accessibilityRole="header" className="text-[17px] font-vn-bold">
                Tin mới đăng
              </AppText>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#E6F1FF]">
      <FlatList
        data={home.data ? shownCards : []}
        keyExtractor={(card) => card.id}
        numColumns={2}
        renderItem={({ item }) => (
          <View style={{ width: cardWidth }}>
            <ListingCard listing={item} now={now} onMenu={() => setMenuFor(item)} />
          </View>
        )}
        columnWrapperStyle={{
          gap: GAP,
          paddingHorizontal: GUTTER,
          paddingBottom: 20,
          backgroundColor: '#FFFFFF',
        }}
        ListHeaderComponent={header}
        ListFooterComponent={
          <View className="min-h-40 bg-white px-8 pt-4">
            {latest.isFetchingNextPage || (latest.isPending && !!excludeIds) ? (
              <ActivityIndicator color="#1673D9" />
            ) : null}
            {finished ? (
              <AppText className="pt-2 text-center text-[13px] text-[#5A6772]">
                {shownCards.length === 0 && strips.length === 0
                  ? 'Chưa có tin nào. Hãy là người đăng đầu tiên!'
                  : 'Bạn đã xem hết tin mới.'}
              </AppText>
            ) : null}
          </View>
        }
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (latest.hasNextPage && !latest.isFetchingNextPage) void latest.fetchNextPage();
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
      />

      {notice ? (
        <View
          accessibilityRole="alert"
          className="absolute bottom-[86px] left-4 right-4 min-h-[48px] flex-row items-center gap-3 rounded-[14px] bg-[#0F2440] pl-4 pr-1"
        >
          <AppText className="flex-1 text-[14px] text-white">{notice.text}</AppText>
          <Pressable
            accessibilityRole="button"
            onPress={notice.undo}
            className="h-11 justify-center px-3"
          >
            <AppText className="text-[14px] font-vn-bold text-[#FFC22E]">Hoàn tác</AppText>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đăng tin"
        onPress={openPost}
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

      {menuFor ? (
        <FeedCardMenu
          card={menuFor}
          onClose={() => setMenuFor(null)}
          onHide={(kind) => void hide(menuFor, kind)}
        />
      ) : null}
      {posting ? <PostStartSheet onClose={() => setPosting(false)} /> : null}
    </View>
  );
}

function HomeSkeleton() {
  return (
    <View accessibilityLabel="Đang tải" className="px-4">
      <View className="flex-row gap-3 pb-6">
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonBlock key={index} className="h-14 w-14 rounded-[18px]" />
        ))}
      </View>
      <SkeletonBlock className="mb-3 h-5 w-40" />
      <View className="flex-row gap-2.5">
        {Array.from({ length: 2 }, (_, index) => (
          <View key={index} className="w-[150px] gap-2">
            <SkeletonBlock className="aspect-[4/5] w-full rounded-2xl" />
            <SkeletonBlock className="h-4 w-1/2" />
            <SkeletonBlock className="h-4 w-4/5" />
          </View>
        ))}
      </View>
    </View>
  );
}
