import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import { CatIcon, type CatIconKind } from '@/components/icons/cat-icon';
import { LIST_DOT, PresenceAvatar } from '@/components/chat/presence-avatar';
import { AppText } from '@/components/ui/app-text';
import { usePeerPresence } from '@/hooks/useChatRealtime';
import {
  describeDealChip,
  type ChatDealSummary,
  type ChatListRowData,
} from '@/services/chat/chat-list';
import { formatChatListTime, getDialogPreview } from '@/services/chat/chat-view';
import type { ListingType } from '@/types/people';

const DEAL_ICON: Record<ListingType, CatIconKind> = {
  sell: 'sale',
  auction: 'auction',
  trade: 'swap',
  gift: 'gift',
};

/** Chip colors of the canvas Chat list (`DT`): [background, text]. */
const CHIP_TONES = {
  going: ['#E6F1FF', '#0B4A99'],
  idle: ['#F2F5F8', '#33414D'],
} as const;

/**
 * Where part 7B puts the short deal status on the chip ("Chờ bạn trả lời"). Returning null shows
 * the form and the item only, which is all the deal index says without the deal rules.
 */
export type DealStatusOf = (deal: ChatDealSummary) => string | null;

function DealThumb({ deal, size }: { deal: ChatDealSummary; size: number }) {
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-[5px] bg-[#DCEBFB]"
      style={{ width: size, height: size }}
    >
      {deal.listing.coverUrl ? (
        <Image
          source={{ uri: deal.listing.coverUrl }}
          style={{ width: size, height: size }}
          contentFit="cover"
        />
      ) : (
        <CatIcon kind={DEAL_ICON[deal.listing.type]} size={size - 4} />
      )}
    </View>
  );
}

/** The deals of the chat under the last message (canvas Chat list). */
function DealChip({ deals, statusOf }: { deals: ChatDealSummary[]; statusOf?: DealStatusOf }) {
  const chip = describeDealChip(deals, statusOf);
  if (!chip) return null;
  const [bg, fg] = chip.first.active ? CHIP_TONES.going : CHIP_TONES.idle;

  return (
    <View
      className="h-6 max-w-full flex-row items-center gap-1.5 self-start rounded-lg pl-1 pr-2"
      style={{ backgroundColor: bg }}
    >
      <DealThumb deal={chip.first} size={18} />
      {chip.second ? (
        <View className="rounded-[5px] border-[1.5px] border-white" style={{ marginLeft: -10 }}>
          <DealThumb deal={chip.second} size={15} />
        </View>
      ) : null}
      <AppText
        numberOfLines={1}
        className="shrink text-[12px] font-vn-semibold"
        style={{ color: fg }}
      >
        {chip.text}
      </AppText>
    </View>
  );
}

type ChatListRowProps = {
  row: ChatListRowData;
  meUserId: string | null;
  statusOf?: DealStatusOf;
};

/** One chat of the list: the person (dot when online), the last message, the time, the unread count. */
function ChatListRowView({ row, meUserId, statusOf }: ChatListRowProps) {
  const router = useRouter();
  const { dialog, peer, deals, lastActivityAt } = row;
  const online = usePeerPresence(peer?.firebaseUid);
  const unread = dialog.unreadCount > 0;
  const name = peer?.name ?? 'Thành viên Trao';
  const preview = getDialogPreview(dialog, meUserId);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}${unread ? `, ${dialog.unreadCount} tin chưa đọc` : ''}. ${preview}`}
      onPress={() => router.push({ pathname: '/chat/[inboxId]', params: { inboxId: dialog.id } })}
      className="flex-row gap-3 border-b border-[#F2F5F8] px-4 py-3 active:bg-[#F7F9FB]"
    >
      <PresenceAvatar
        name={peer?.name}
        avatarUrl={peer?.avatar}
        size={50}
        online={online}
        dot={LIST_DOT}
        textClassName="text-[16px]"
      />
      <View className="min-w-0 flex-1 gap-[3px]">
        <View className="flex-row items-baseline gap-2">
          <AppText
            numberOfLines={1}
            className={`min-w-0 flex-1 text-[15px] ${unread ? 'font-vn-bold' : 'font-vn-semibold'}`}
          >
            {name}
          </AppText>
          <AppText className={`text-[12px] ${unread ? 'text-[#1673D9]' : 'text-[#8A96A3]'}`}>
            {formatChatListTime(lastActivityAt)}
          </AppText>
        </View>
        <View className="flex-row items-center gap-2">
          <AppText
            numberOfLines={1}
            className={`min-w-0 flex-1 text-[13.5px] ${
              unread ? 'font-vn-semibold text-[#0F2440]' : 'text-[#5A6772]'
            }`}
          >
            {preview}
          </AppText>
          {unread ? (
            <View className="h-5 min-w-5 items-center justify-center rounded-full bg-[#1673D9] px-1.5">
              <AppText className="text-[11.5px] font-vn-bold text-white">
                {dialog.unreadCount > 99 ? '99+' : dialog.unreadCount}
              </AppText>
            </View>
          ) : null}
        </View>
        <DealChip deals={deals} statusOf={statusOf} />
      </View>
    </Pressable>
  );
}

export const ChatListRow = memo(ChatListRowView);
