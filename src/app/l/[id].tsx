import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { AuctionBoard } from '@/components/auction/auction-board';
import { BidSheet } from '@/components/auction/bid-sheet';
import { DealBanner } from '@/components/deals/deal-banner';
import { OfferSheet, type OfferMode } from '@/components/deals/offer-sheet';
import { OwnerOffers } from '@/components/deals/owner-offers';
import { CatIcon } from '@/components/icons/cat-icon';
import { ListingComments } from '@/components/listing/listing-comments';
import { OwnerMenuSheet } from '@/components/listing/owner-menu-sheet';
import { UserAvatar } from '@/components/me/user-avatar';
import { PolicySheet } from '@/components/post/policy-sheet';
import { FollowButton } from '@/components/profile/follow-button';
import { MediaGallery, RoundOverlayButton } from '@/components/stock/media-gallery';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ErrorBox } from '@/components/ui/form-controls';
import {
  ICON_CHEVRON_LEFT,
  ICON_CHEVRON_RIGHT,
  ICON_PENCIL,
  PathIcon,
} from '@/components/ui/path-icon';
import { useAuth } from '@/hooks/useAuth';
import { useGoBack } from '@/hooks/useGoBack';
import { useOpenChat } from '@/hooks/useOpenChat';
import { auctionIsOver, bidMinimum, canBid } from '@/services/auctions/auction-rules';
import { fetchDeals } from '@/services/deals/deals-api';
import {
  fetchListingPage,
  listingPageKey,
  recordListingView,
} from '@/services/listings/listings-api';
import { setListingLiked } from '@/services/profile/people-api';
import { fetchMyProfile, MY_PROFILE_QUERY_KEY } from '@/services/profile/profile-api';
import type { ListingPageAuction, ListingPageData } from '@/types/listings';
import type { ListingType } from '@/types/people';
import { formatClock, formatCountdown, formatDayMonth, formatVnd } from '@/utils/format';

type AvailablePage = Extract<ListingPageData, { available: true }>;

const FORM_STYLE: Record<ListingType, { label: string; bg: string; fg: string }> = {
  sell: { label: 'Bán', bg: '#E6F1FF', fg: '#0B4A99' },
  auction: { label: 'Đấu giá', bg: '#0F2440', fg: '#FFFFFF' },
  trade: { label: 'Trao đổi', bg: '#E6F1FF', fg: '#0B4A99' },
  gift: { label: 'Cho tặng', bg: '#FFC22E', fg: '#3D2A00' },
};

const POLICY_TITLE: Record<ListingType, string> = {
  sell: 'Quy định khi mua bán',
  auction: 'Quy định đấu giá',
  trade: 'Quy định trao đổi',
  gift: 'Quy định cho tặng',
};

const ALSO_LABEL: Record<ListingType, string> = {
  sell: 'Cũng đang bán',
  trade: 'Cũng nhận trao đổi',
  auction: 'Cũng đấu giá',
  gift: 'Cũng cho tặng',
};

const ACTIVITY_LABEL = {
  daily: 'Hoạt động liên tục',
  regular: 'Hoạt động thường xuyên',
  occasional: 'Hoạt động không thường xuyên',
} as const;

const SHIP_ICONS = {
  meet: {
    name: 'Trực tiếp',
    d: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  },
  ship: {
    name: 'Gửi hàng',
    d: 'M2 6h11v10H2zM13 9h4l3 3v4h-7M5 18a1.8 1.8 0 1 0 3.6 0 1.8 1.8 0 1 0-3.6 0M15 18a1.8 1.8 0 1 0 3.6 0 1.8 1.8 0 1 0-3.6 0',
  },
} as const;

const HEART =
  'M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z';
const ICON_SHARE = 'M12 15V3M7.5 7.5L12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7';
/** The collapsed height of the "Thông tin" block (web: max-h-[300px]). */
const INFO_COLLAPSED = 300;

function shareUrl(id: string): string {
  const base = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '') ?? '';
  return `${base}/app/l/${id}`;
}

/** Now, moving every second while `active`. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

/**
 * The page of a listing (canvas Detail), for a viewer and for its owner. Open to guests.
 * Likes, comments and Nhắn tin work; the deal buttons and the report link are drawn but answer "sắp có"
 * until the deal and report parts are built.
 */
export default function ListingPageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const goBack = useGoBack('/');
  const { session, getIdToken } = useAuth();
  const openChat = useOpenChat();
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoHeight, setInfoHeight] = useState(0);
  const [menu, setMenu] = useState(false);
  const [policy, setPolicy] = useState(false);
  const [offering, setOffering] = useState<OfferMode | null>(null);
  const [bidding, setBidding] = useState(false);
  const [levelNotice, setLevelNotice] = useState(false);
  const viewed = useRef(false);

  const queryKey = listingPageKey(id, session?.uid);
  const { data, error, refetch, isPending } = useQuery({
    queryKey,
    queryFn: async () => fetchListingPage(id, session ? await getIdToken() : undefined),
    retry: false,
  });

  const auction = data?.available && data.auction ? data.auction : null;
  const now = useNow(auction !== null);

  // The viewer's agreements about this listing: their own (asker) or the ones on their listing (owner).
  const dealable = data?.available === true && !data.isOwner;
  const { data: profile } = useQuery({
    queryKey: [...MY_PROFILE_QUERY_KEY, session?.uid],
    queryFn: async () => fetchMyProfile(await getIdToken()),
    enabled: dealable && data?.type === 'auction' && !!session,
  });
  const { data: dealList } = useQuery({
    queryKey: ['deals', 'listing', id, session?.uid],
    queryFn: async () => fetchDeals(await getIdToken(), { listingId: id }),
    enabled: data?.available === true && !!session,
  });
  const myDeal = dealable ? (dealList?.items[0] ?? null) : null;
  // The owner's own page: the deal in progress (done, or cancelled after the agreement) above the offers.
  const ownerDeal =
    data?.available === true && data.isOwner
      ? (dealList?.items.find(
          (deal) =>
            deal.status === 'in_transaction' ||
            deal.status === 'completed' ||
            deal.transaction?.status === 'cancelled'
        ) ?? null)
      : null;

  // Others looking at a listing raise its view count (the server decides how often).
  const countable = data?.available === true && !data.isOwner;
  useEffect(() => {
    if (!countable || viewed.current) return;
    viewed.current = true;
    (async () => recordListingView(id, session ? await getIdToken() : undefined))().catch(
      () => undefined
    );
  }, [countable, id, session, getIdToken]);

  // The owner's page for a listing that is not live is its status page.
  const ownerElsewhere = data?.available === false && data.isOwner;
  useEffect(() => {
    if (ownerElsewhere) router.replace({ pathname: '/listings/[id]', params: { id } });
  }, [ownerElsewhere, id, router]);

  async function share(title: string) {
    try {
      await Share.share({ message: `${title}\n${shareUrl(id)}`, url: shareUrl(id) });
    } catch {
      Alert.alert('Không chia sẻ được', 'Thử lại sau.');
    }
  }

  /** The report link waits for the report part: a guest is asked to sign in, everyone else hears "sắp có". */
  function comingSoon(what: string) {
    if (!session) {
      router.push('/auth-gate');
      return;
    }
    Alert.alert(what, 'Tính năng này sắp có.');
  }

  function startOffer(mode: OfferMode) {
    if (!session) {
      router.push('/auth-gate');
      return;
    }
    setOffering(mode);
  }

  function startBid() {
    if (!session) {
      router.push('/auth-gate');
      return;
    }
    // Some auctions take only verified accounts; the page is readable by everyone, the button explains.
    if (
      data?.available === true &&
      data.auction &&
      !canBid(data.auction.minBidderLevel, profile?.accountLevel)
    ) {
      setLevelNotice(true);
      return;
    }
    setBidding(true);
  }

  /** Whether the agreement has something to show on the page: a deal in progress, an answer, an offer to the viewer. */
  function showDealPanel(deal: NonNullable<typeof myDeal>) {
    if (deal.listing.type === 'auction') {
      return deal.status === 'in_transaction' || deal.auction?.offerForMe != null;
    }
    return (
      deal.status !== 'asking' &&
      (deal.status !== 'cancelled' || deal.transaction?.status === 'cancelled')
    );
  }

  if (isPending || ownerElsewhere) {
    return (
      <View className="flex-1 bg-white">
        <View
          className="h-[400px] bg-[#DCEBFB]"
          style={{ paddingTop: insets.top + 12, paddingLeft: 12 }}
        >
          <View className="self-start">
            <RoundOverlayButton label="Quay lại" onPress={goBack}>
              <PathIcon d={ICON_CHEVRON_LEFT} size={20} strokeWidth={2.2} />
            </RoundOverlayButton>
          </View>
        </View>
        <View className="items-center py-10">
          <ActivityIndicator color="#1673D9" />
        </View>
      </View>
    );
  }
  if (error || !data) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <ErrorBox
          message={error?.message ?? 'Không mở được tin.'}
          onRetry={() => refetch()}
          onBack={goBack}
        />
      </View>
    );
  }
  if (!data.available) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <View className="h-14 justify-center px-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={goBack}
            className="h-11 w-11 items-center justify-center"
          >
            <PathIcon d="M15 6l-6 6 6 6" size={20} strokeWidth={2.2} />
          </Pressable>
        </View>
        <View className="items-center gap-2.5 px-8 pt-10">
          <CatIcon kind="collect" size={96} />
          <AppText accessibilityRole="header" className="mt-2 text-center text-[18px] font-vn-bold">
            Tin này không còn trên chợ
          </AppText>
          <AppText className="text-center text-[14px] leading-[21.7px] text-[#5A6772]">
            Tin có thể đã được bán, đã đóng hoặc đang được người đăng cập nhật.
          </AppText>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/')}
            className="mt-2 h-12 justify-center rounded-[14px] bg-[#1673D9] px-6"
          >
            <AppText className="text-[15px] font-vn-semibold text-white">Về trang chủ</AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  const page: AvailablePage = data;
  const form = FORM_STYLE[page.type];
  const wants = (page.tradeWants ?? '')
    .split(/[,;\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const tools = page.ownerTools;
  const auctionOver = page.auction ? auctionIsOver(page.auction, now) : false;
  // The page stays open while the item is in a deal or the deal is done; only new offers are refused.
  const dealt = page.dealState !== 'open';
  const infoOverflows = infoHeight > INFO_COLLAPSED;
  const inMyDeal = myDeal?.status === 'in_transaction' || myDeal?.status === 'completed';

  const asks: { mode: OfferMode; label: string; primary: boolean }[] =
    page.type === 'sell'
      ? [
          ...(page.allowOffers
            ? [{ mode: 'price' as const, label: 'Trả giá', primary: false }]
            : []),
          { mode: 'buy' as const, label: 'Mua ngay', primary: true },
        ]
      : page.type === 'trade'
        ? [{ mode: 'swap' as const, label: 'Đề nghị đổi', primary: true }]
        : page.type === 'gift'
          ? [{ mode: 'gift' as const, label: 'Đăng ký nhận', primary: true }]
          : [];

  const policyDot = (
    <PathIcon
      d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6zM9 12l2 2 4-4"
      size={18}
      color="#1673D9"
    />
  );

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <MediaGallery
          photos={page.photos}
          videos={page.videos}
          height={400}
          overlay={
            <>
              <View style={{ marginTop: insets.top }}>
                <RoundOverlayButton label="Quay lại" onPress={goBack}>
                  <PathIcon d={ICON_CHEVRON_LEFT} size={20} strokeWidth={2.2} />
                </RoundOverlayButton>
              </View>
              <View className="flex-row gap-2" style={{ marginTop: insets.top }}>
                <RoundOverlayButton label="Chia sẻ" onPress={() => void share(page.title)}>
                  <PathIcon d={ICON_SHARE} size={19} />
                </RoundOverlayButton>
                {page.isOwner && tools ? (
                  <RoundOverlayButton label="Tuỳ chọn tin" onPress={() => setMenu(true)}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="#0F2440">
                      <Circle cx={5} cy={12} r={2} />
                      <Circle cx={12} cy={12} r={2} />
                      <Circle cx={19} cy={12} r={2} />
                    </Svg>
                  </RoundOverlayButton>
                ) : null}
              </View>
            </>
          }
        />

        <View className="gap-3.5 px-4 pt-4">
          <View className="flex-row flex-wrap items-center gap-1.5">
            <View
              className="h-[26px] justify-center rounded-full px-2.5"
              style={{ backgroundColor: form.bg }}
            >
              <AppText className="text-[12.5px] font-vn-bold" style={{ color: form.fg }}>
                {form.label}
              </AppText>
            </View>
            {page.also.map((other) => (
              <Pressable
                key={other.id}
                accessibilityRole="link"
                onPress={() => router.push({ pathname: '/l/[id]', params: { id: other.id } })}
                className="h-[26px] flex-row items-center gap-1 rounded-full border border-[#C9DDF4] px-2.5"
              >
                <AppText className="text-[12.5px] font-vn-semibold text-[#1673D9]">
                  {ALSO_LABEL[other.type]}
                </AppText>
                <PathIcon d={ICON_CHEVRON_RIGHT} size={12} color="#1673D9" strokeWidth={2.4} />
              </Pressable>
            ))}
          </View>

          <View className="flex-row items-start gap-2.5">
            <AppText
              accessibilityRole="header"
              className="flex-1 text-[21px] font-vn-bold leading-[27.3px] tracking-[-0.21px]"
            >
              {page.title}
            </AppText>
            {!page.isOwner ? (
              <LikeButton
                key={`${page.id}-${page.liked}`}
                listingId={page.id}
                liked={page.liked}
                likeCount={page.likeCount}
                onChanged={(state) =>
                  queryClient.setQueryData(queryKey, (current: ListingPageData | undefined) =>
                    current && current.available ? { ...current, ...state } : current
                  )
                }
              />
            ) : null}
          </View>

          {page.isOwner ? (
            <View className="flex-row flex-wrap gap-x-3.5 gap-y-1.5">
              <AppText className="text-[13px] font-vn-semibold text-[#0B4A99]">Tin của bạn</AppText>
              <AppText className="text-[13px] text-[#5A6772]">{page.viewCount} lượt xem</AppText>
              <AppText className="text-[13px] text-[#5A6772]">{page.likeCount} lượt thích</AppText>
            </View>
          ) : null}

          {page.status === 'scheduled' && page.auction ? (
            <Note>
              Phiên sắp bắt đầu lúc {formatClock(page.auction.startsAt)}{' '}
              {formatDayMonth(new Date(page.auction.startsAt))}. Đến giờ tin tự lên chợ.
            </Note>
          ) : null}
          {dealt && (page.isOwner ? dealList !== undefined && !ownerDeal : !inMyDeal) ? (
            // Not on the canvas: the same note as "Tin đang được cập nhật" below.
            <Note>
              {page.dealState === 'completed'
                ? 'Món này đã giao dịch xong.'
                : page.isOwner
                  ? 'Món này đang giao dịch.'
                  : 'Món này đang giao dịch với người khác nên chưa gửi đề nghị được.'}
            </Note>
          ) : null}
          {page.updating && !page.isOwner ? (
            // Not on the canvas: the same note as "Phiên sắp bắt đầu" above.
            <Note>
              Tin đang được cập nhật. Người đăng vừa sửa tin, đề nghị gửi lúc này sẽ cần gửi lại khi
              bản mới được duyệt.
            </Note>
          ) : null}

          {page.type === 'sell' ? (
            <View className="flex-row flex-wrap items-baseline gap-x-2.5">
              <AppText className="text-[26px] font-vn-bold tracking-[-0.26px] text-[#1673D9]">
                {formatVnd(page.price ?? 0)}
              </AppText>
              <AppText className="text-[13px] text-[#5A6772]">
                {page.allowOffers ? 'Cho trả giá' : 'Không trả giá'}
                {page.allowOffers && page.offerCount > 0
                  ? ` · ${page.offerCount} người đã trả giá`
                  : ''}
              </AppText>
            </View>
          ) : null}

          {page.type === 'auction' && page.auction ? (
            <AuctionBlock auction={page.auction} now={now} />
          ) : null}

          {page.type === 'trade' ? (
            <View className="gap-2.5 rounded-[18px] bg-[#F1F7FE] p-3.5">
              <AppText className="text-[12.5px] font-vn-semibold text-[#5A6772]">
                Người đăng muốn đổi lấy
              </AppText>
              <View className="flex-row flex-wrap gap-2">
                {wants.map((entry) => (
                  <View key={entry} className="h-8 justify-center rounded-full bg-white px-3">
                    <AppText className="text-[14px] font-vn-semibold text-[#0B4A99]">
                      {entry}
                    </AppText>
                  </View>
                ))}
              </View>
              <AppText className="text-[13px] text-[#5A6772]">
                {page.offerCount} đề nghị đổi đã gửi
              </AppText>
            </View>
          ) : null}

          {page.type === 'gift' ? (
            <View className="flex-row items-center justify-between gap-2.5 rounded-[18px] bg-[#FFF4D6] p-3.5">
              <AppText className="text-[22px] font-vn-bold text-[#8A5A00]">Miễn phí</AppText>
              <AppText className="text-[13.5px] font-vn-semibold text-[#3D2A00]">
                {page.offerCount} người đã đăng ký
              </AppText>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => setPolicy(true)}
            className="min-h-[46px] flex-row items-center gap-2.5 rounded-xl border border-[#E1E7EE] bg-white px-3"
          >
            {policyDot}
            <AppText className="flex-1 text-[14px] font-vn-semibold">
              {POLICY_TITLE[page.type]}
            </AppText>
            <PathIcon d={ICON_CHEVRON_RIGHT} size={16} color="#5A6772" strokeWidth={2.2} />
          </Pressable>
        </View>

        {ownerDeal ? (
          <View className="px-4 pt-[18px]">
            <DealBanner deal={ownerDeal} screen="item" onBid={startBid} />
          </View>
        ) : null}

        {page.type === 'auction' ? (
          page.auction ? (
            <AuctionBoard listingId={page.id} endsAt={page.auction.endsAt} />
          ) : null
        ) : page.isOwner ? (
          <OwnerOffers
            listingId={page.id}
            type={page.type}
            allowOffers={page.allowOffers}
            locked={dealt}
          />
        ) : null}

        {!page.isOwner ? (
          <View className="gap-2 px-4 pt-4">
            {myDeal && showDealPanel(myDeal) ? (
              <DealBanner deal={myDeal} screen="item" onBid={startBid} />
            ) : null}
            <View className="flex-row gap-2">
              <ActionButton
                outline
                onPress={() => void openChat(page.seller.handle, page.id)}
                flex={0}
              >
                <Svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1673D9"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="M4 5h16v11H9l-5 4z" />
                </Svg>
                <AppText className="text-[15px] font-vn-bold">Nhắn tin</AppText>
              </ActionButton>
              {!dealt && (!myDeal || myDeal.status === 'asking' || myDeal.status === 'cancelled')
                ? asks.map((ask) => (
                    <ActionButton
                      key={ask.mode}
                      outline={!ask.primary}
                      onPress={() => startOffer(ask.mode)}
                    >
                      <AppText
                        className={`text-[15px] font-vn-bold ${ask.primary ? 'text-white' : ''}`}
                      >
                        {ask.label}
                      </AppText>
                    </ActionButton>
                  ))
                : null}
              {page.type === 'auction' && page.auction ? (
                auctionOver ? (
                  <View className="h-[50px] flex-1 items-center justify-center rounded-[14px] bg-[#E1E7EE]">
                    <AppText className="text-[15px] font-vn-bold text-[#8A96A3]">
                      Phiên đã kết thúc
                    </AppText>
                  </View>
                ) : (
                  <ActionButton onPress={startBid}>
                    <AppText className="text-[15px] font-vn-bold text-white">Đặt giá</AppText>
                  </ActionButton>
                )
              ) : null}
            </View>
          </View>
        ) : tools ? (
          <View className="px-4 pt-4">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !tools.canEdit }}
              disabled={!tools.canEdit}
              onPress={() =>
                router.push({ pathname: '/listings/[id]/edit', params: { id: tools.id } })
              }
              className={`h-[50px] flex-row items-center justify-center gap-2 rounded-[14px] ${
                tools.canEdit ? 'bg-[#1673D9]' : 'bg-[#E1E7EE]'
              }`}
            >
              <PathIcon d={ICON_PENCIL} size={18} color={tools.canEdit ? '#FFFFFF' : '#8A96A3'} />
              <AppText
                className={`text-[15px] font-vn-bold ${tools.canEdit ? 'text-white' : 'text-[#8A96A3]'}`}
              >
                Sửa tin
              </AppText>
            </Pressable>
            {!tools.canEdit && tools.editBlockedReason ? (
              <AppText className="mt-1.5 text-center text-[12.5px] text-[#5A6772]">
                {tools.editBlockedReason}
              </AppText>
            ) : null}
          </View>
        ) : null}

        <View className="gap-4 px-4 pt-6">
          <View className="gap-3 rounded-[18px] border border-[#E8ECF0] p-3.5">
            <View className="flex-row items-center gap-3">
              <UserAvatar
                name={page.seller.displayName}
                avatarUrl={page.seller.avatarUrl}
                size={48}
                textClassName="text-[17px] text-[#0F2440]"
              />
              <View className="min-w-0 flex-1 gap-0.5">
                <AppText numberOfLines={1} className="text-[15.5px] font-vn-bold">
                  {page.seller.displayName ?? 'Thành viên Trao'}
                </AppText>
                <AppText className="text-[13px] text-[#33414D]">
                  {page.seller.completedCount} giao dịch thành công
                </AppText>
              </View>
              {!page.isOwner ? (
                <FollowButton
                  handle={page.seller.handle}
                  following={page.seller.following}
                  size="compact"
                  onChanged={(following) => {
                    queryClient.setQueryData(queryKey, (current: ListingPageData | undefined) =>
                      current && current.available
                        ? { ...current, seller: { ...current.seller, following } }
                        : current
                    );
                  }}
                />
              ) : null}
            </View>
            <View className="flex-row flex-wrap gap-1.5">
              {[
                page.seller.verified ? '✓ Đã xác thực' : 'Thành viên',
                page.seller.tenureLabel.toLowerCase().startsWith('trên')
                  ? `Tham gia ${page.seller.tenureLabel.toLowerCase()}`
                  : page.seller.tenureLabel,
                ACTIVITY_LABEL[page.seller.activityLevel],
              ].map((label) => (
                <View
                  key={label}
                  className="h-[26px] justify-center rounded-full bg-[#F1F7FE] px-[9px]"
                >
                  <AppText className="text-[12px] font-vn-semibold text-[#0B4A99]">{label}</AppText>
                </View>
              ))}
            </View>
            <Pressable
              accessibilityRole="link"
              onPress={() =>
                router.push({ pathname: '/u/[handle]', params: { handle: page.seller.handle } })
              }
              className="flex-row items-center justify-between border-t border-[#EEF2F6] pt-2.5"
            >
              <AppText className="text-[13.5px] font-vn-semibold text-[#1673D9]">
                Xem hồ sơ
                {page.seller.otherListingCount > 0
                  ? ` và ${page.seller.otherListingCount} tin khác`
                  : ''}
              </AppText>
              <PathIcon d={ICON_CHEVRON_RIGHT} size={16} color="#1673D9" strokeWidth={2.2} />
            </Pressable>
          </View>

          <AppText accessibilityRole="header" className="mt-2 text-[17px] font-vn-bold">
            Thông tin
          </AppText>
          <View className="gap-2.5">
            <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
              Hình thức giao dịch
            </AppText>
            <View className="flex-row flex-wrap gap-1.5">
              {page.handoverMethods.map((method) => {
                const ship = SHIP_ICONS[method as keyof typeof SHIP_ICONS];
                if (!ship) return null;
                return (
                  <View
                    key={method}
                    className="h-9 flex-row items-center gap-[5px] rounded-[11px] bg-[#E6F1FF] pl-[9px] pr-[11px]"
                  >
                    <PathIcon d={ship.d} size={17} color="#1673D9" />
                    <AppText className="text-[13.5px] font-vn-semibold text-[#0B4A99]">
                      {ship.name}
                    </AppText>
                  </View>
                );
              })}
            </View>
            {page.handoverNote ? (
              <View className="flex-row gap-2 rounded-xl bg-[#FFF9EA] px-3 py-2.5">
                <View className="mt-[3px]">
                  <PathIcon
                    d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3"
                    size={14}
                    color="#8A5A00"
                    strokeWidth={2.2}
                  />
                </View>
                <AppText className="flex-1 text-[13.5px] leading-[20px] text-[#3D2A00]">
                  {page.handoverNote}
                </AppText>
              </View>
            ) : null}
          </View>

          <View
            className="overflow-hidden"
            style={infoOpen ? undefined : { maxHeight: INFO_COLLAPSED }}
          >
            <View
              className="gap-4"
              onLayout={(event) => setInfoHeight(event.nativeEvent.layout.height)}
            >
              <View className="flex-row rounded-2xl border border-[#E8ECF0]">
                {[
                  ['Tình trạng', page.conditionLabel],
                  [
                    'Khu vực',
                    [page.areaName, page.distanceText].filter(Boolean).join(' · ') || '—',
                  ],
                  ['Danh mục', page.categoryName ?? '—'],
                ].map(([key, value], index) => (
                  <View
                    key={key}
                    className={`flex-1 gap-[3px] px-3 py-2.5 ${index > 0 ? 'border-l border-[#E8ECF0]' : ''}`}
                  >
                    <AppText className="text-[11.5px] text-[#5A6772]">{key}</AppText>
                    <AppText className="text-[13.5px] font-vn-semibold leading-[18px]">
                      {value}
                    </AppText>
                  </View>
                ))}
              </View>
              {page.description ? (
                <AppText className="text-[14.5px] leading-[23.2px] text-[#33414D]">
                  {page.description}
                </AppText>
              ) : null}
              {page.attributes.length > 0 ? (
                <View>
                  {page.attributes.map((attribute) => (
                    <View
                      key={attribute.key}
                      className="flex-row justify-between gap-3 border-t border-[#EEF2F6] py-[9px]"
                    >
                      <AppText className="text-[13.5px] text-[#5A6772]">{attribute.key}</AppText>
                      <AppText className="flex-1 text-right text-[13.5px] font-vn-medium">
                        {attribute.value}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}
              {page.story ? (
                <View className="gap-1.5 rounded-[18px] bg-[#FFF9EA] px-4 py-3.5">
                  <AppText className="text-[13px] font-vn-semibold text-[#8A5A00]">
                    Câu chuyện món đồ
                  </AppText>
                  <AppText className="text-[14.5px] italic leading-[23.2px] text-[#3D2A00]">
                    “{page.story}”
                  </AppText>
                </View>
              ) : null}
            </View>
            {!infoOpen && infoOverflows ? (
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.85)', '#FFFFFF']}
                locations={[0, 0.6, 1]}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 }}
              />
            ) : null}
          </View>
          {infoOverflows || infoOpen ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: infoOpen }}
              onPress={() => setInfoOpen((open) => !open)}
              className="h-[42px] flex-row items-center justify-center gap-1 rounded-xl border border-[#E1E7EE] bg-white"
            >
              <AppText className="text-[13.5px] font-vn-bold text-[#1673D9]">
                {infoOpen ? 'Thu gọn' : 'Xem thêm thông tin'}
              </AppText>
              <PathIcon
                d={infoOpen ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}
                size={14}
                color="#1673D9"
                strokeWidth={2.4}
              />
            </Pressable>
          ) : null}
        </View>

        <ListingComments listingId={id} />
        <View className="px-4">
          {!page.isOwner ? (
            <Pressable accessibilityRole="button" onPress={() => comingSoon('Báo cáo tin này')}>
              <AppText className="py-2 text-[13px] text-[#5A6772]">Báo cáo tin này</AppText>
            </Pressable>
          ) : null}
        </View>
        <View style={{ height: insets.bottom + 8 }} />
      </ScrollView>

      {menu && tools ? (
        <OwnerMenuSheet
          tools={tools}
          onChanged={() => void queryClient.invalidateQueries({ queryKey })}
          onShare={() => void share(page.title)}
          onClose={() => setMenu(false)}
        />
      ) : null}
      {policy ? <PolicySheet slug="four-forms" onClose={() => setPolicy(false)} /> : null}
      {offering ? (
        <OfferSheet
          listing={{
            id: page.id,
            title: page.title,
            price: page.type === 'sell' ? page.price : null,
          }}
          mode={offering}
          onClose={() => setOffering(null)}
        />
      ) : null}
      {bidding && page.auction ? (
        <BidSheet
          listing={{ id: page.id, title: page.title }}
          minimum={bidMinimum(page.auction)}
          step={page.auction.minIncrement}
          currentPrice={page.auction.currentPrice}
          bidCount={page.auction.bidCount}
          onClose={() => setBidding(false)}
        />
      ) : null}
      {levelNotice ? (
        <BottomSheet
          title="Phiên này cần tài khoản Đã xác thực"
          onClose={() => setLevelNotice(false)}
        >
          <AppText className="text-[14px] leading-[21.7px] text-[#33414D]">
            Người đăng chỉ nhận lượt đặt giá từ tài khoản đã xác minh số điện thoại. Bạn vẫn xem
            được phiên và bảng đặt giá.
          </AppText>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setLevelNotice(false);
              router.push('/verify-phone');
            }}
            className="h-[50px] items-center justify-center rounded-[14px] bg-[#1673D9]"
          >
            <AppText className="text-[15px] font-vn-bold text-white">
              Xác minh số điện thoại
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setLevelNotice(false)}
            className="h-[50px] items-center justify-center rounded-[14px] bg-[#F1F7FE]"
          >
            <AppText className="text-[15px] font-vn-semibold">Để sau</AppText>
          </Pressable>
        </BottomSheet>
      ) : null}
    </View>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <AppText className="rounded-xl bg-[#FFF4D6] px-3 py-2.5 text-[13px] leading-[19.5px] text-[#3D2A00]">
      {children}
    </AppText>
  );
}

/** The heart beside the title: saves the listing and asks for a push when it changes. */
function LikeButton(props: {
  listingId: string;
  liked: boolean;
  likeCount: number;
  onChanged: (state: { liked: boolean; likeCount: number }) => void;
}) {
  const router = useRouter();
  const { session, getIdToken } = useAuth();
  const [state, setState] = useState({ liked: props.liked, likeCount: props.likeCount });
  const busy = useRef(false);

  async function toggle() {
    if (busy.current) return;
    if (!session) {
      router.push('/auth-gate');
      return;
    }
    busy.current = true;
    const before = state;
    const next = !before.liked;
    setState({ liked: next, likeCount: Math.max(0, before.likeCount + (next ? 1 : -1)) });
    try {
      const result = await setListingLiked(await getIdToken(), props.listingId, next);
      setState(result);
      props.onChanged(result);
    } catch (caught) {
      setState(before);
      Alert.alert(
        'Không thực hiện được',
        caught instanceof Error ? caught.message : 'Thử lại sau.'
      );
    } finally {
      busy.current = false;
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        state.liked ? 'Bỏ thích' : 'Thích tin này (nhận thông báo khi có cập nhật)'
      }
      accessibilityState={{ selected: state.liked }}
      onPress={toggle}
      className="min-w-11 items-center gap-px pt-0.5"
    >
      <Svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill={state.liked ? '#F0533A' : 'none'}
        stroke={state.liked ? '#F0533A' : '#0F2440'}
        strokeWidth={2}
        strokeLinejoin="round"
      >
        <Path d={HEART} />
      </Svg>
      <AppText
        className={`text-[12px] font-vn-semibold ${state.liked ? 'text-[#F0533A]' : 'text-[#5A6772]'}`}
      >
        {state.likeCount}
      </AppText>
    </Pressable>
  );
}

function ActionButton({
  children,
  outline,
  onPress,
  flex = 1,
}: {
  children: React.ReactNode;
  outline?: boolean;
  onPress: () => void;
  flex?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={flex === 0 ? { paddingHorizontal: 14 } : { flex }}
      className={`h-[50px] min-w-0 flex-row items-center justify-center gap-1.5 rounded-[14px] ${
        outline ? 'border-[1.5px] border-[#C9DDF4] bg-white' : 'bg-[#1673D9]'
      }`}
    >
      {children}
    </Pressable>
  );
}

function AuctionBlock({ auction, now }: { auction: ListingPageAuction; now: number }) {
  const startsIn = new Date(auction.startsAt).getTime() - now;
  const endsIn = new Date(auction.endsAt).getTime() - now;
  const upcoming = !auction.running && startsIn > 0;
  const ended = !upcoming && endsIn <= 0;
  const params: [string, string][] = [
    ['Giá khởi điểm', formatVnd(auction.startPrice)],
    ['Bước giá', formatVnd(auction.minIncrement)],
    [
      'Ai được đặt giá',
      auction.minBidderLevel >= 2 ? 'Chỉ tài khoản Đã xác thực' : 'Mọi thành viên',
    ],
    ['Thời gian phiên', `${auction.durationDays} ngày`],
  ];
  return (
    <View className="gap-3 rounded-[18px] bg-[#F1F7FE] p-3.5">
      <View className="flex-row items-end justify-between gap-2.5">
        <View className="gap-0.5">
          <AppText className="text-[12.5px] text-[#5A6772]">
            Giá hiện tại · {auction.bidCount} lượt đặt
          </AppText>
          <AppText className="text-[26px] font-vn-bold tracking-[-0.26px] text-[#1673D9]">
            {formatVnd(auction.currentPrice)}
          </AppText>
        </View>
        <View className="items-end gap-0.5">
          <AppText className="text-[12.5px] text-[#5A6772]">
            {ended ? 'Phiên đã kết thúc' : upcoming ? 'Bắt đầu sau' : 'Kết thúc sau'}
          </AppText>
          <AppText
            className="text-[20px] font-vn-bold text-[#B42318]"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {ended ? '—' : formatCountdown(upcoming ? startsIn : endsIn)}
          </AppText>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {params.map(([key, value]) => (
          <View
            key={key}
            className="gap-px rounded-xl bg-white px-2.5 py-2"
            style={{ width: '48.5%' }}
          >
            <AppText className="text-[11.5px] text-[#5A6772]">{key}</AppText>
            <AppText className="text-[13.5px] font-vn-semibold">{value}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
