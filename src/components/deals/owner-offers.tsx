import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { DeclineSheet } from '@/components/deals/decline-sheet';
import { ConfirmSheet } from '@/components/me/confirm-sheet';
import { UserAvatar } from '@/components/me/user-avatar';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { useDealActions } from '@/hooks/useDealActions';
import { describeOffer } from '@/services/deals/deal-banner';
import { fetchListingOffers } from '@/services/deals/deals-api';
import type { ListingOfferEntry } from '@/types/deals';
import type { ListingType } from '@/types/people';
import { formatRelativeTime } from '@/utils/format';

type OffersKind = Exclude<ListingType, 'auction'> | 'buy';

/** Where an offer that is no longer waiting stands; a waiting one has its two answers instead. */
const ANSWERED: Partial<
  Record<ListingOfferEntry['offer']['status'], { label: string; bg: string; fg: string }>
> = {
  accepted: { label: 'Đã đồng ý', bg: '#E3F4EA', fg: '#1E6B43' },
  declined: { label: 'Đã từ chối', bg: '#F1F4F7', fg: '#5A6772' },
  auto_declined: { label: 'Tự động từ chối', bg: '#F1F4F7', fg: '#5A6772' },
  withdrawn: { label: 'Đã rút', bg: '#F1F4F7', fg: '#5A6772' },
};

/** A sale that takes no offers only gets buyers at the asked price. */
const TITLE: Record<OffersKind, string> = {
  sell: 'Đề nghị',
  buy: 'Người muốn mua',
  trade: 'Đề nghị đổi',
  gift: 'Người đăng ký',
};
const EMPTY: Record<OffersKind, string> = {
  sell: 'Chưa có đề nghị nào. Khi có, bạn đồng ý hoặc từ chối ở đây.',
  buy: 'Chưa có ai muốn mua. Khi có, bạn đồng ý hoặc từ chối ở đây.',
  trade: 'Chưa có đề nghị đổi nào. Khi có, bạn đồng ý hoặc từ chối ở đây.',
  gift: 'Chưa có đăng ký nhận nào. Khi có, bạn chọn một người ở đây.',
};

/**
 * The offers on the owner's listing (canvas Detail, owner): each with who sent it, what it says, a
 * way into the chat and the two answers, Từ chối and Đồng ý. Opening the list marks the waiting
 * offers as seen, so the count on the Tin đăng tab goes down.
 */
export function OwnerOffers({
  listingId,
  type,
  allowOffers,
  locked,
}: {
  listingId: string;
  type: Exclude<ListingType, 'auction'>;
  allowOffers: boolean;
  locked: boolean;
}) {
  const { session, getIdToken } = useAuth();
  const kind: OffersKind = type === 'sell' && !allowOffers ? 'buy' : type;
  const { data, isPending } = useQuery({
    queryKey: ['listing-offers', listingId, session?.uid],
    queryFn: async () => fetchListingOffers(await getIdToken(), listingId),
    enabled: !!session,
  });
  const [now] = useState(() => Date.now());

  return (
    <View className="mx-4 mt-[18px] overflow-hidden rounded-[20px] border border-[#E1E7EE]">
      <View className="flex-row items-center px-3.5 pb-2 pt-3.5">
        <AppText accessibilityRole="header" className="flex-1 text-[16px] font-vn-bold">
          {TITLE[kind]}
          {data?.items.length ? (
            <AppText className="text-[16px] font-vn-medium text-[#5A6772]">
              {' '}
              {data.items.length}
            </AppText>
          ) : null}
        </AppText>
      </View>
      {isPending ? (
        <View className="items-center pb-4">
          <ActivityIndicator color="#1673D9" />
        </View>
      ) : null}
      {data && data.items.length === 0 ? (
        <AppText className="px-3.5 pb-4 text-[13.5px] leading-[20px] text-[#5A6772]">
          {EMPTY[kind]}
        </AppText>
      ) : null}
      {(data?.items ?? []).map((entry) => (
        <OfferRow
          key={entry.offer.id}
          entry={entry}
          listingId={listingId}
          now={now}
          locked={locked}
        />
      ))}
    </View>
  );
}

function OfferRow({
  entry,
  listingId,
  now,
  locked,
}: {
  entry: ListingOfferEntry;
  listingId: string;
  now: number;
  locked: boolean;
}) {
  const router = useRouter();
  const actions = useDealActions();
  const [declining, setDeclining] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const name = entry.asker.name ?? 'Thành viên Trao';
  const waiting = entry.offer.status === 'pending';
  const answered = ANSWERED[entry.offer.status];
  const inboxId = entry.inboxId;

  return (
    <View className="gap-2.5 border-t border-[#EEF2F6] px-3.5 py-3">
      <View className="flex-row items-center gap-2.5">
        <Pressable
          accessibilityRole="link"
          onPress={() =>
            router.push({ pathname: '/u/[handle]', params: { handle: entry.asker.handle } })
          }
        >
          <UserAvatar
            name={entry.asker.name}
            avatarUrl={entry.asker.avatarUrl}
            size={40}
            textClassName="text-[14px] text-[#0F2440]"
          />
        </Pressable>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            <AppText numberOfLines={1} className="shrink text-[14px] font-vn-semibold">
              {name}
            </AppText>
            {entry.isNew ? (
              <View className="rounded-md bg-[#1673D9] px-1.5 py-px">
                <AppText className="text-[10.5px] font-vn-bold text-white">Mới</AppText>
              </View>
            ) : null}
            {answered ? (
              <View className="rounded-md px-1.5 py-px" style={{ backgroundColor: answered.bg }}>
                <AppText className="text-[10.5px] font-vn-bold" style={{ color: answered.fg }}>
                  {answered.label}
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText className="text-[13px] leading-[18px] text-[#33414D]">
            {describeOffer(entry.offer)} ·{' '}
            <AppText className="text-[13px] text-[#8A96A3]">
              {formatRelativeTime(entry.offer.createdAt, now)}
            </AppText>
          </AppText>
        </View>
        {inboxId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Mở chat với ${name}`}
            onPress={() =>
              router.push({ pathname: '/chat/[inboxId]', params: { inboxId, listing: listingId } })
            }
            className="h-9 justify-center rounded-full bg-[#F1F7FE] px-3"
          >
            <AppText className="text-[12.5px] font-vn-semibold text-[#1673D9]">Chat</AppText>
          </Pressable>
        ) : null}
      </View>
      {waiting ? (
        <View className="flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            disabled={actions.busy}
            onPress={() => setDeclining(true)}
            className={`h-10 flex-1 items-center justify-center rounded-xl bg-[#F1F7FE] ${
              actions.busy ? 'opacity-60' : ''
            }`}
          >
            <AppText className="text-[13.5px] font-vn-semibold">Từ chối</AppText>
          </Pressable>
          {locked ? null : (
            <Pressable
              accessibilityRole="button"
              disabled={actions.busy}
              onPress={() => setAccepting(true)}
              className={`h-10 flex-1 items-center justify-center rounded-xl bg-[#1673D9] ${
                actions.busy ? 'opacity-60' : ''
              }`}
            >
              <AppText className="text-[13.5px] font-vn-bold text-white">Đồng ý</AppText>
            </Pressable>
          )}
        </View>
      ) : null}
      {declining ? (
        <DeclineSheet
          offerId={entry.offer.id}
          askerName={name}
          onClose={() => setDeclining(false)}
        />
      ) : null}
      {accepting ? (
        <ConfirmSheet
          title="Đồng ý đề nghị này?"
          description={`${name} ${describeOffer(entry.offer)}. Các đề nghị khác được giữ lại đến khi giao dịch xong.`}
          confirmLabel="Đồng ý"
          onConfirm={async () => {
            await actions.accept(entry.offer.id);
            setAccepting(false);
          }}
          onCancel={() => setAccepting(false)}
        />
      ) : null}
    </View>
  );
}
