import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { DeclineSheet } from '@/components/deals/decline-sheet';
import { OfferSheet, type OfferMode } from '@/components/deals/offer-sheet';
import { ConfirmSheet } from '@/components/me/confirm-sheet';
import { UserAvatar } from '@/components/me/user-avatar';
import { ItemThumb } from '@/components/stock/item-thumb';
import { CancelSheet } from '@/components/transactions/cancel-sheet';
import { AppText } from '@/components/ui/app-text';
import { PathIcon } from '@/components/ui/path-icon';
import { useDealActions } from '@/hooks/useDealActions';
import { usePenaltyGuard } from '@/hooks/usePenaltyGuard';
import { useTransactionActions } from '@/hooks/useTransactionActions';
import {
  describeDealBanner,
  describeOffer,
  type DealBannerActionKey,
} from '@/services/deals/deal-banner';
import type { DealView } from '@/types/deals';

const OFFER_MODE: Partial<Record<DealBannerActionKey, OfferMode>> = {
  offer: 'price',
  buy: 'buy',
  swap: 'swap',
  gift: 'gift',
};

type Screen = 'chat' | 'item';

/** Space between two banners while they slide, so they never touch. */
const PAGE_GAP = 12;

/**
 * The deals of a chat (or of the viewer on a listing page) as banners (canvas DealBanner), newest
 * activity first, the one about `firstListingId` (the listing the chat was opened from) before
 * them. Several slide sideways, with dots and "1/2 giao dịch với …".
 */
export function DealBanners({
  deals,
  screen = 'chat',
  firstListingId,
  onBid,
}: {
  deals: DealView[];
  screen?: Screen;
  firstListingId?: string | null;
  onBid?: () => void;
}) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const sorted = [...deals].sort(
    (a, b) =>
      Number(b.listing.id === firstListingId) - Number(a.listing.id === firstListingId) ||
      b.updatedAt.localeCompare(a.updatedAt)
  );

  if (sorted.length === 0) return null;
  if (sorted.length === 1) return <DealBanner deal={sorted[0]!} screen={screen} onBid={onBid} />;

  const partner = sorted[0]!.counterpart.name ?? 'người kia';
  return (
    <View onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <ScrollView
          horizontal
          // One banner per swipe, with a gap between them (paging would glue the pages together).
          snapToInterval={width + PAGE_GAP}
          snapToAlignment="start"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) =>
            setIndex(Math.round(event.nativeEvent.contentOffset.x / (width + PAGE_GAP)))
          }
          style={{ overflow: 'visible' }}
        >
          {sorted.map((deal, at) => (
            <View
              key={deal.id}
              style={{ width, marginRight: at < sorted.length - 1 ? PAGE_GAP : 0 }}
            >
              <DealBanner
                deal={deal}
                screen={screen}
                onBid={onBid}
                slides={{ index, count: sorted.length, partner }}
              />
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

/**
 * One deal (canvas DealBanner): in a chat the item on the left opens the listing; on a listing
 * page the other person is on the left. The white label gives the form, the title (or "với …")
 * follows, then the terms and a short status. The body opens the transaction once there is one
 * (else the listing, or the chat from a listing page). The buttons are the next steps; the yellow
 * one is the main step.
 */
export function DealBanner({
  deal,
  screen = 'chat',
  slides,
  onBid,
}: {
  deal: DealView;
  screen?: Screen;
  slides?: { index: number; count: number; partner: string };
  onBid?: () => void;
}) {
  const router = useRouter();
  const actions = useDealActions();
  const tradeGuard = usePenaltyGuard();
  const transactionActions = useTransactionActions();
  const [offering, setOffering] = useState<OfferMode | null>(null);
  const [sheet, setSheet] = useState<'decline' | 'agree' | 'confirm' | 'cancel' | null>(null);

  const banner = describeDealBanner(deal);
  const other = deal.counterpart.name ?? 'Người kia';
  const onItem = screen === 'item';

  function openListing() {
    router.push({ pathname: '/l/[id]', params: { id: deal.listing.id } });
  }

  function openDetail() {
    if (deal.transaction) {
      router.push({ pathname: '/transactions/[id]', params: { id: deal.transaction.id } });
    } else if (onItem && deal.inboxId) {
      router.push({
        pathname: '/chat/[inboxId]',
        params: { inboxId: deal.inboxId, listing: deal.listing.id },
      });
    } else {
      openListing();
    }
  }

  function run(key: DealBannerActionKey) {
    const mode =
      key === 'reoffer' ? (deal.listing.type === 'trade' ? 'swap' : 'price') : OFFER_MODE[key];
    if (mode) {
      if (tradeGuard.guard('trade')) setOffering(mode);
      return;
    }
    if (key === 'bid') {
      if (onBid) onBid();
      else openListing();
    } else if (key === 'withdraw' && deal.offer) void actions.withdraw(deal.offer.id);
    else if (key === 'decline') setSheet('decline');
    else if (key === 'agree') setSheet('agree');
    else if (key === 'bidDecline' && deal.auction?.offerForMe) {
      void actions.declineBidOffer(deal.auction.offerForMe.bidId);
    } else if (key === 'bidAccept' && deal.auction?.offerForMe) {
      if (tradeGuard.guard('trade')) void actions.acceptBidOffer(deal.auction.offerForMe.bidId);
    } else if (key === 'confirmTransaction') setSheet('confirm');
    else if (key === 'cancelTransaction') setSheet('cancel');
    else if (key === 'review' && deal.transaction) {
      router.push({
        pathname: '/transactions/[id]/review',
        params: { id: deal.transaction.id },
      });
    }
  }

  const busy = actions.busy || transactionActions.busy;
  return (
    <View
      style={{
        borderRadius: 18,
        shadowColor: '#0B4A99',
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      }}
    >
      <LinearGradient
        colors={banner.cancelled ? ['#5A6772', '#33414D'] : ['#1673D9', '#0B4A99']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 18, padding: 14, gap: 12 }}
      >
        <View className="flex-row items-center gap-3">
          {onItem ? (
            <View
              className="rounded-full border-2"
              style={{ borderColor: 'rgba(255,255,255,0.6)' }}
            >
              <UserAvatar
                name={deal.counterpart.name}
                avatarUrl={deal.counterpart.avatarUrl}
                size={42}
                textClassName="text-[16px] text-[#0F2440]"
              />
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Xem tin đăng ${deal.listing.title}`}
              onPress={openListing}
              className="overflow-hidden rounded-xl border-2"
              style={{ borderColor: 'rgba(255,255,255,0.6)' }}
            >
              <ItemThumb
                url={deal.listing.coverUrl}
                categorySlug={null}
                width={42}
                height={42}
                radius={10}
                iconSize={30}
              />
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xem chi tiết giao dịch"
            onPress={openDetail}
            className="min-w-0 flex-1 flex-row items-center gap-2"
          >
            <View className="min-w-0 flex-1 gap-[3px]">
              <View className="flex-row items-center gap-1.5">
                <View className="h-5 flex-row items-center gap-1 rounded-md bg-white pl-[5px] pr-[7px]">
                  <PathIcon d={banner.typeIcon} size={12} color="#1673D9" strokeWidth={2.4} />
                  <AppText className="text-[11px] font-vn-bold text-[#0B4A99]">
                    {banner.typeLabel}
                  </AppText>
                </View>
                <AppText numberOfLines={1} className="min-w-0 flex-1 text-[12.5px] text-[#D6E8FC]">
                  {onItem ? `với ${other}` : deal.listing.title}
                </AppText>
              </View>
              <AppText numberOfLines={1} className="text-[15.5px] font-vn-bold text-white">
                {banner.main}
              </AppText>
              <AppText className="text-[13px] text-white">{banner.status}</AppText>
            </View>
            <PathIcon d="M9 6l6 6-6 6" size={16} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>
        </View>

        {banner.actions.length > 0 ? (
          <View className="flex-row gap-2">
            {banner.actions.map((action) => (
              <Pressable
                key={action.key}
                accessibilityRole="button"
                disabled={busy}
                onPress={() => run(action.key)}
                className="h-[42px] min-w-0 items-center justify-center rounded-xl px-2.5"
                style={{
                  flex: action.wide ? 2 : 1,
                  backgroundColor: action.primary ? '#FFC22E' : 'rgba(255,255,255,0.12)',
                  borderWidth: action.primary ? 0 : 1.5,
                  borderColor: 'rgba(255,255,255,0.55)',
                  opacity: busy ? 0.6 : 1,
                }}
              >
                <AppText
                  numberOfLines={1}
                  className="text-[14px] font-vn-bold"
                  style={{ color: action.primary ? '#3D2A00' : '#FFFFFF' }}
                >
                  {action.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        ) : null}

        {slides ? (
          <View className="-mt-1 flex-row items-center justify-center gap-1.5">
            {Array.from({ length: slides.count }, (_, dot) => (
              <View
                key={dot}
                className="h-1.5 rounded-full"
                style={{
                  width: dot === slides.index ? 16 : 6,
                  backgroundColor: dot === slides.index ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                }}
              />
            ))}
            <AppText className="text-[12px] text-[#D6E8FC]">
              {slides.index + 1}/{slides.count} giao dịch với {slides.partner}
            </AppText>
          </View>
        ) : null}
      </LinearGradient>

      {tradeGuard.sheet}
      {offering ? (
        <OfferSheet
          listing={{ id: deal.listing.id, title: deal.listing.title, price: deal.listing.price }}
          mode={offering}
          onClose={() => setOffering(null)}
        />
      ) : null}
      {sheet === 'decline' && deal.offer ? (
        <DeclineSheet offerId={deal.offer.id} askerName={other} onClose={() => setSheet(null)} />
      ) : null}
      {sheet === 'agree' && deal.offer ? (
        <ConfirmSheet
          title={deal.listing.type === 'gift' ? `Chọn tặng cho ${other}?` : `Đồng ý với ${other}?`}
          description={`${other} ${describeOffer(deal.offer)}. Các đề nghị khác được giữ lại đến khi giao dịch xong.`}
          confirmLabel="Đồng ý"
          onConfirm={async () => {
            await actions.accept(deal.offer!.id);
            setSheet(null);
          }}
          onCancel={() => setSheet(null)}
        />
      ) : null}
      {sheet === 'confirm' && deal.transaction ? (
        <ConfirmSheet
          title="Xác nhận giao dịch đã xong?"
          description="Xác nhận khi bạn đã giao nhận và thanh toán xong. Khi cả hai cùng xác nhận, giao dịch hoàn tất. Không thể hoàn tác."
          confirmLabel="Đã xong"
          onConfirm={async () => {
            await transactionActions.confirm(deal.transaction!.id);
            setSheet(null);
          }}
          onCancel={() => setSheet(null)}
        />
      ) : null}
      {sheet === 'cancel' && deal.transaction ? (
        <CancelSheet
          transactionId={deal.transaction.id}
          otherName={other}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </View>
  );
}
