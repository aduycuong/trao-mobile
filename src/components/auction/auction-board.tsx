import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { fetchAuctionBoard } from '@/services/auctions/auctions-api';
import { subscribeAuctionSignal } from '@/services/chat/rtdb';
import { formatVnd } from '@/utils/format';

const STATUS: Record<string, { label: string; dot: string }> = {
  scheduled: { label: 'Chưa bắt đầu', dot: '#8A96A3' },
  running: { label: 'Đang diễn ra', dot: '#F0533A' },
  ended: { label: 'Đã kết thúc', dot: '#8A96A3' },
  failed: { label: 'Không thành', dot: '#8A96A3' },
  cancelled: { label: 'Đã huỷ', dot: '#8A96A3' },
};

/**
 * The bid board of an auction (canvas Detail, Bảng đặt giá): top ten bidders with masked names
 * (the owner sees them in full) and where the viewer stands. It reads again when the server rings
 * the auction's doorbell (someone bid) and when the clock runs out.
 */
export function AuctionBoard({ listingId, endsAt }: { listingId: string; endsAt: string }) {
  const queryClient = useQueryClient();
  const { session, getIdToken } = useAuth();
  const { data, isPending } = useQuery({
    queryKey: ['auction-board', listingId, session?.uid ?? null],
    queryFn: async () => fetchAuctionBoard(listingId, session ? await getIdToken() : undefined),
  });

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ['auction-board', listingId] });
      void queryClient.invalidateQueries({ queryKey: ['listing-page', listingId] });
    };
    return subscribeAuctionSignal(listingId, refresh) ?? undefined;
  }, [listingId, queryClient]);

  // When the time is up the sweeper settles the round within a minute: look again then, and once
  // more shortly after.
  useEffect(() => {
    const wait = new Date(endsAt).getTime() - Date.now();
    if (wait <= 0 || wait > 2_147_000_000) return;
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ['auction-board', listingId] });
      void queryClient.invalidateQueries({ queryKey: ['listing-page', listingId] });
    };
    const first = setTimeout(refresh, wait + 1500);
    const second = setTimeout(refresh, wait + 65_000);
    return () => {
      clearTimeout(first);
      clearTimeout(second);
    };
  }, [endsAt, listingId, queryClient]);

  const status = STATUS[data?.status ?? 'running'] ?? STATUS.running!;

  return (
    <View className="mx-4 mt-[18px] overflow-hidden rounded-[20px] border border-[#E1E7EE]">
      <LinearGradient
        colors={['#FFF7E0', '#FFFFFF']}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: 10,
        }}
      >
        <Svg
          width={22}
          height={22}
          viewBox="0 0 24 24"
          fill="#FFC22E"
          stroke="#E8A200"
          strokeWidth={1.4}
          strokeLinejoin="round"
        >
          <Path d="M7 4h10v4a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M10 14h4v3h-4zM8 20h8v-3H8z" />
        </Svg>
        <AppText accessibilityRole="header" className="flex-1 text-[16px] font-vn-bold">
          Bảng đặt giá
        </AppText>
        <View className="flex-row items-center gap-1.5">
          <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: status.dot }} />
          <AppText className="text-[12.5px] font-vn-semibold text-[#5A6772]">
            {status.label}
          </AppText>
        </View>
      </LinearGradient>

      {isPending ? (
        <View className="items-center pb-4">
          <ActivityIndicator color="#1673D9" />
        </View>
      ) : null}

      {data && data.entries.length === 0 ? (
        <AppText className="px-3.5 pb-4 text-[13.5px] leading-[20px] text-[#5A6772]">
          Chưa có lượt đặt giá nào. Người đặt đầu tiên sẽ dẫn đầu.
        </AppText>
      ) : null}

      {data?.me ? (
        <AppText
          className={`mx-3.5 mb-2.5 rounded-xl px-3 py-2 text-[13.5px] font-vn-semibold ${
            data.me.leading ? 'bg-[#E3F4EA] text-[#1E6B43]' : 'bg-[#FFF4D6] text-[#8A5A00]'
          }`}
        >
          {data.me.leading
            ? `Bạn đang dẫn đầu với ${formatVnd(data.me.amount)}.`
            : `Bạn đứng hạng ${data.me.rank} với ${formatVnd(data.me.amount)}. Đặt giá cao hơn để dẫn đầu.`}
        </AppText>
      ) : null}

      {data && data.entries.length > 0 ? (
        <View className="px-3.5 pb-3">
          {data.entries.map((entry) => (
            <View
              key={entry.rank}
              className="flex-row items-center gap-3 border-t border-[#EEF2F6] py-2.5"
            >
              <View
                className={`h-6 w-6 items-center justify-center rounded-full ${
                  entry.rank === 1 ? 'bg-[#FFC22E]' : 'bg-[#F1F4F7]'
                }`}
              >
                <AppText
                  className={`text-[12px] font-vn-bold ${
                    entry.rank === 1 ? 'text-[#0F2440]' : 'text-[#33414D]'
                  }`}
                >
                  {entry.rank}
                </AppText>
              </View>
              <AppText
                numberOfLines={1}
                className={`min-w-0 flex-1 text-[14px] ${entry.isMe ? 'font-vn-semibold' : ''}`}
              >
                {entry.name}
              </AppText>
              <AppText
                className={`text-[14px] ${entry.isMe ? 'font-vn-semibold' : ''}`}
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatVnd(entry.amount)}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
      {data && data.bidderCount > data.entries.length ? (
        <AppText className="px-3.5 pb-3.5 text-[12.5px] text-[#5A6772]">
          {data.bidderCount} người đã đặt giá.
        </AppText>
      ) : null}
    </View>
  );
}
