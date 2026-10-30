import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { ChatListRow } from '@/components/chat/chat-list-row';
import { CatIcon } from '@/components/icons/cat-icon';
import { AppText } from '@/components/ui/app-text';
import { useChat } from '@/hooks/useChat';
import { useChatDealIndex } from '@/hooks/useChatDealIndex';
import {
  buildChatListRows,
  type ChatDealSummary,
  type ChatListFilter,
  type ChatListRowData,
} from '@/services/chat/chat-list';
import { describeDealBanner } from '@/services/deals/deal-banner';

const FILTERS: { id: ChatListFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'deal', label: 'Đang giao dịch' },
];

function SkeletonRows() {
  return (
    <View accessibilityLabel="Đang tải" accessibilityRole="progressbar">
      {Array.from({ length: 5 }, (_, index) => (
        <View key={index} className="flex-row gap-3 border-b border-[#F2F5F8] px-4 py-3">
          <View className="h-[50px] w-[50px] rounded-full bg-[#EEF2F6]" />
          <View className="flex-1 gap-2 pt-1">
            <View className="h-4 w-1/3 rounded bg-[#EEF2F6]" />
            <View className="h-3.5 w-4/5 rounded bg-[#EEF2F6]" />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * The Tin nhắn tab (canvas Chat, list): one row per person with the last message, the time and
 * the unread count; search by name; filter Tất cả / Đang giao dịch. Each chat shows its deals
 * under the last message with the same short status as the chat banner.
 */
export function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { ready, allDialogs, meUserId, firebaseUid, engine } = useChat();
  const [filter, setFilter] = useState<ChatListFilter>('all');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Something new in a chat may be an offer or an answer: read the deal index again.
  const activity = allDialogs.map((dialog) => `${dialog.id}:${dialog.lastSeq}`).join(',');
  const { deals, dialogs: indexDialogs } = useChatDealIndex(activity);
  // A chat that has a deal but no message yet is not in the local store: the deal index carries its row.
  const dialogs = useMemo(() => {
    const known = new Set(allDialogs.map((dialog) => dialog.id));
    return [...allDialogs, ...indexDialogs.filter((dialog) => !known.has(dialog.id))];
  }, [allDialogs, indexDialogs]);
  const dealById = useMemo(() => new Map(deals.map((deal) => [deal.id, deal])), [deals]);
  const statusOf = useCallback(
    (deal: ChatDealSummary) => {
      const full = dealById.get(deal.id);
      return full ? describeDealBanner(full).status : null;
    },
    [dealById]
  );
  const toneOf = useCallback(
    (deal: ChatDealSummary) => {
      const full = dealById.get(deal.id);
      return full ? describeDealBanner(full).tone : 'ref';
    },
    [dealById]
  );

  const { rows, dealCount } = useMemo(
    () => buildChatListRows({ dialogs, firebaseUid, deals, filter, query }),
    [dialogs, firebaseUid, deals, filter, query]
  );

  async function refresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        engine?.syncNow(),
        queryClient.invalidateQueries({ queryKey: ['chat', 'deal-index'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  const needle = query.trim();
  const empty = !ready ? null : needle ? (
    <EmptyState title="Không tìm thấy ai" text="Thử tên khác nhé." />
  ) : filter === 'deal' ? (
    <EmptyState
      title="Chưa có giao dịch nào"
      text="Chat có đề nghị đang chờ hoặc giao dịch đang diễn ra sẽ hiện ở đây."
    />
  ) : (
    <EmptyState
      title="Chưa có tin nhắn nào"
      text="Mở một tin đăng rồi bấm Nhắn tin để hỏi người đăng. Cuộc trò chuyện sẽ hiện ở đây."
    />
  );

  return (
    <View className="flex-1 bg-white">
      <View
        className="flex-row items-center gap-1.5 border-b border-[#EEF2F6] pl-4 pr-2"
        style={{ height: 60 + insets.top, paddingTop: insets.top }}
      >
        <AppText accessibilityRole="header" className="flex-1 text-[20px] font-vn-bold">
          Tin nhắn
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tìm tin nhắn"
          accessibilityState={{ selected: searching }}
          onPress={() => {
            setSearching((on) => !on);
            setQuery('');
          }}
          className="h-11 w-11 items-center justify-center"
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
        <View className="border-b border-[#F2F5F8] px-4 py-2.5">
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm theo tên…"
            placeholderTextColor="#8896A3"
            accessibilityLabel="Tìm theo tên"
            returnKeyType="search"
            autoCorrect={false}
            className="h-11 rounded-[14px] border-[1.5px] border-[#D5DDE5] bg-white px-3.5 font-vn text-[15px] text-[#0F2440]"
          />
        </View>
      ) : null}

      <View
        accessibilityRole="tablist"
        className="flex-row gap-2 border-b border-[#F2F5F8] px-4 py-2.5"
      >
        {FILTERS.map(({ id, label }) => {
          const on = filter === id;
          const count = id === 'deal' ? dealCount : 0;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setFilter(id)}
              className={`h-[34px] flex-row items-center gap-1.5 rounded-full border-[1.5px] px-3.5 ${
                on ? 'border-[#0F2440] bg-[#0F2440]' : 'border-[#D5DDE5] bg-white'
              }`}
            >
              <AppText
                className={`text-[13.5px] font-vn-semibold ${on ? 'text-white' : 'text-[#0F2440]'}`}
              >
                {label}
              </AppText>
              {count > 0 ? (
                <View className="h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FFC22E] px-[5px]">
                  <AppText className="text-[11px] font-vn-bold text-[#3D2A00]">{count}</AppText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <FlatList<ChatListRowData>
        data={ready ? rows : []}
        keyExtractor={(row) => row.dialog.id}
        renderItem={({ item }) => (
          <ChatListRow row={item} meUserId={meUserId} statusOf={statusOf} toneOf={toneOf} />
        )}
        ListEmptyComponent={ready ? empty : <SkeletonRows />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
        initialNumToRender={12}
        windowSize={7}
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </View>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <View className="items-center gap-2.5 px-8 pt-16">
      <CatIcon kind="collect" size={96} />
      <AppText accessibilityRole="header" className="mt-2 text-[18px] font-vn-bold">
        {title}
      </AppText>
      <AppText className="text-center text-[14px] leading-[22px] text-[#5A6772]">{text}</AppText>
    </View>
  );
}
