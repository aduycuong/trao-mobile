import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, SectionList, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { NotificationRow } from '@/components/notifications/notification-row';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { AppText } from '@/components/ui/app-text';
import { ErrorBox, SkeletonBlock } from '@/components/ui/form-controls';
import { useAuth } from '@/hooks/useAuth';
import { useGoBack } from '@/hooks/useGoBack';
import { useMarkNotificationsRead } from '@/hooks/useMarkNotificationsRead';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import {
  groupNotificationsByDay,
  NOTIFICATION_FILTERS,
  type NotificationFilter,
} from '@/services/notifications/notification-rules';
import {
  fetchNotifications,
  NOTIFICATIONS_KEY,
  notificationsListKey,
} from '@/services/notifications/notifications-api';
import { routeForNotification } from '@/services/push/push-routing';
import type { NotificationItem } from '@/types/notifications';
import { FilterChip } from '@/components/ui/filter-chip';

const GEAR_PATH =
  'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z';

/** One clock for the whole list, ticking once a minute. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function RowSkeleton() {
  return (
    <View className="flex-row gap-3 px-4 py-3">
      <SkeletonBlock className="h-12 w-12 rounded-xl" />
      <View className="flex-1 gap-2">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3.5 w-full" />
        <SkeletonBlock className="h-3 w-16" />
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View className="items-center gap-2.5 px-8 pt-16">
      <View className="h-[88px] w-[88px] items-center justify-center rounded-full bg-[#F1F7FE]">
        <Svg
          width={40}
          height={40}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1673D9"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />
        </Svg>
      </View>
      <AppText accessibilityRole="header" className="mt-2 text-[18px] font-vn-bold">
        Chưa có thông báo
      </AppText>
      <AppText className="text-center text-[14px] leading-[21.7px] text-[#5A6772]">
        Khi có người đặt giá cao hơn bạn, tin được duyệt, tin bạn thích giảm giá… Trao sẽ báo ở đây.
      </AppText>
    </View>
  );
}

/**
 * Thông báo (canvas Notifs, Home → bell): the system events of the last 30 days in four groups,
 * newest first. A row opens the place it is about and is marked read; "Đọc hết" marks all.
 */
export function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const goBack = useGoBack('/');
  const { session, status, getIdToken } = useAuth();
  const uid = session?.uid;
  const now = useNow();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  // The bell sends a guest to sign in; a link or a push can still land here signed out.
  useEffect(() => {
    if (status !== 'restoring' && !session) router.replace('/auth-gate');
  }, [status, session, router]);

  const list = useInfiniteQuery({
    queryKey: notificationsListKey(uid, filter),
    queryFn: async ({ pageParam }) =>
      fetchNotifications(await getIdToken(), {
        group: filter === 'all' ? undefined : filter,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!session,
  });
  const unread = useUnreadNotifications();
  const markRead = useMarkNotificationsRead();

  const sections = useMemo(() => {
    const seen = new Set<string>();
    const items: NotificationItem[] = [];
    for (const page of list.data?.pages ?? []) {
      for (const item of page.items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        items.push(item);
      }
    }
    return groupNotificationsByDay(items, now).map((section) => ({
      title: section.title,
      data: section.rows,
    }));
  }, [list.data, now]);

  const open = useCallback(
    (item: NotificationItem) => {
      if (!item.read) markRead.mutate(item.id);
      router.push(routeForNotification(item) as Href);
    },
    [markRead, router]
  );

  async function refresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    } finally {
      setRefreshing(false);
    }
  }

  const counts = unread.data;
  const noUnread = !counts || counts.all === 0;
  const failed = !!list.error && !list.data;

  return (
    <View className="flex-1 bg-white">
      <ScreenBar
        title="Thông báo"
        onBack={goBack}
        trailing={
          <>
            <Pressable
              accessibilityRole="button"
              disabled={noUnread || markRead.isPending}
              onPress={() => markRead.mutate(undefined)}
              className="h-10 justify-center px-2.5"
            >
              <AppText
                className={`text-[13.5px] font-vn-semibold ${noUnread ? 'text-[#A3AEB9]' : 'text-[#1673D9]'}`}
              >
                Đọc hết
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cài đặt thông báo"
              onPress={() => router.push('/notifications/settings')}
              className="h-11 w-11 items-center justify-center"
            >
              <Svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0F2440"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Circle cx={12} cy={12} r={3} />
                <Path d={GEAR_PATH} />
              </Svg>
            </Pressable>
          </>
        }
      />

      <ScrollView
        horizontal
        accessibilityRole="tablist"
        showsHorizontalScrollIndicator={false}
        // Beside the list, which takes the rest: the chips keep their full height and padding.
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerClassName="gap-2 px-4 py-2.5"
        className="border-b border-[#F2F5F8]"
      >
        {NOTIFICATION_FILTERS.map(([id, label]) => {
          const on = id === filter;
          const count = id === 'all' ? 0 : (counts?.[id] ?? 0);
          return (
            <FilterChip
              key={id}
              label={label}
              on={on}
              onPress={() => setFilter(id)}
              count={count > 0 ? count : undefined}
              badge="alert"
            />
          );
        })}
      </ScrollView>

      {list.isPending && session ? (
        <View accessibilityLabel="Đang tải">
          {Array.from({ length: 5 }, (_, index) => (
            <RowSkeleton key={index} />
          ))}
        </View>
      ) : failed ? (
        <ErrorBox message={list.error.message} onRetry={() => list.refetch()} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationRow item={item} now={now} onOpen={open} />}
          renderSectionHeader={({ section }) => (
            <AppText
              accessibilityRole="header"
              className="bg-white px-4 pb-1.5 pt-3.5 text-[13px] font-vn-bold text-[#5A6772]"
            >
              {section.title}
            </AppText>
          )}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
          }}
          ListEmptyComponent={list.data ? <EmptyState /> : null}
          ListFooterComponent={
            <View>
              {list.isFetchingNextPage ? <RowSkeleton /> : null}
              <AppText className="px-4 pb-6 pt-[18px] text-center text-[12.5px] leading-[18.75px] text-[#A3AEB9]">
                Tin nhắn và đề nghị nằm ở tab Tin nhắn. Thông báo giữ trong 30 ngày.
              </AppText>
            </View>
          }
        />
      )}
    </View>
  );
}
