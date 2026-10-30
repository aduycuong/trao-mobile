import type { DealView } from '@/types/deals';
import type { ListingType } from '@/types/people';
import { describeTimeLeft, formatDayMonth, formatVnd } from '@/utils/format';

/** The form of a deal as the banner's white label says it (canvas DealBanner). */
export const DEAL_TYPE_LABEL: Record<ListingType, string> = {
  sell: 'Mua bán',
  auction: 'Đấu giá',
  trade: 'Trao đổi',
  gift: 'Cho tặng',
};

/** The label's icon path, per form (canvas DealBanner). */
export const DEAL_TYPE_ICON: Record<ListingType, string> = {
  sell: 'M6 7h12l-1 13H7zM9 7a3 3 0 0 1 6 0',
  auction: 'M14 4l6 6M11 7l6 6M8 10l6-6M10 12l-7 7M16 20h5',
  trade: 'M7 7h11l-3-3M17 17H6l3 3',
  gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0',
};

export type DealBannerActionKey =
  | 'offer'
  | 'buy'
  | 'swap'
  | 'gift'
  | 'bid'
  | 'reoffer'
  | 'withdraw'
  | 'decline'
  | 'agree'
  | 'bidDecline'
  | 'bidAccept'
  | 'cancelTransaction'
  | 'confirmTransaction'
  | 'review';

export type DealBannerAction = {
  key: DealBannerActionKey;
  label: string;
  primary: boolean;
  wide?: boolean;
};

/**
 * The tone of the deal: the banner ground (`cancelled` is grey) and the chat-list chip colors.
 * `act` the viewer must answer, `offer` waiting on the other person, `deal` in progress, `live`
 * outbid or declined, `done` completed, `ref` asking or over.
 */
export type DealTone = 'act' | 'offer' | 'deal' | 'live' | 'done' | 'ref';

export type DealBannerData = {
  typeLabel: string;
  typeIcon: string;
  main: string;
  status: string;
  tone: DealTone;
  cancelled: boolean;
  actions: DealBannerAction[];
};

const A = (
  key: DealBannerActionKey,
  label: string,
  primary = false,
  wide = false
): DealBannerAction => ({ key, label, primary, wide });

function open(deal: DealView): boolean {
  return deal.listing.status === 'published';
}

function agreedText(deal: DealView): string {
  const price = deal.transaction?.price ?? deal.offer?.amount ?? null;
  if (deal.listing.type === 'auction') {
    return price !== null
      ? `${deal.role === 'asker' ? 'Thắng' : 'Chốt'} với ${formatVnd(price)}`
      : 'Đã chốt';
  }
  if (deal.listing.type === 'trade') {
    return deal.offer?.offeredItem ? `Đổi bằng ${deal.offer.offeredItem.title}` : 'Đã chốt đổi';
  }
  if (deal.listing.type === 'gift') {
    return deal.role === 'asker'
      ? 'Được chọn nhận'
      : `Tặng cho ${deal.counterpart.name ?? 'người nhận'}`;
  }
  if (deal.offer?.kind === 'buy_now' && price !== null) return `Mua ngay ${formatVnd(price)}`;
  return price !== null ? `Đã chốt ${formatVnd(price)}` : 'Đã chốt';
}

function offerText(deal: DealView): string {
  const offer = deal.offer;
  if (!offer) return DEAL_TYPE_LABEL[deal.listing.type];
  if (offer.kind === 'price_offer') return `Trả giá ${formatVnd(offer.amount ?? 0)}`;
  if (offer.kind === 'buy_now') {
    return `Mua ngay${offer.amount !== null ? ` ${formatVnd(offer.amount)}` : ''}`;
  }
  if (offer.kind === 'swap') return `Đổi bằng ${offer.offeredItem?.title ?? 'một món'}`;
  return 'Đã đăng ký nhận';
}

function offerVerb(deal: DealView): string {
  const offer = deal.offer;
  if (!offer) return 'đã hỏi';
  if (offer.kind === 'price_offer') return `trả giá ${formatVnd(offer.amount ?? 0)}`;
  if (offer.kind === 'buy_now') {
    return `muốn mua ngay${offer.amount !== null ? ` ${formatVnd(offer.amount)}` : ''}`;
  }
  if (offer.kind === 'swap') return `muốn đổi bằng ${offer.offeredItem?.title ?? 'một món'}`;
  return 'đăng ký nhận';
}

/** What an offer says as a short phrase: "trả giá 6.500.000đ", "đổi bằng Canon AE-1". */
export function describeOffer(offer: NonNullable<DealView['offer']>): string {
  if (offer.kind === 'price_offer') return `trả giá ${formatVnd(offer.amount ?? 0)}`;
  if (offer.kind === 'buy_now') {
    return `mua ngay${offer.amount !== null ? ` ${formatVnd(offer.amount)}` : ''}`;
  }
  if (offer.kind === 'swap') return `đổi bằng ${offer.offeredItem?.title ?? 'một món'}`;
  return 'đăng ký nhận';
}

/** The listing's own terms ("Giá 7.500.000đ · cho trả giá"): a chat with no offer yet. */
export function describeDealTerms(deal: DealView, now = new Date()): string {
  const { listing } = deal;
  if (listing.type === 'auction') {
    const round = deal.auction ?? deal.bidder;
    if (!round) {
      return listing.price !== null ? `Giá khởi điểm ${formatVnd(listing.price)}` : 'Đấu giá';
    }
    const left = describeTimeLeft(new Date(round.endsAt), now);
    return `Giá hiện tại ${formatVnd(round.currentPrice)}${left ? ` · còn ${left}` : ''}`;
  }
  if (listing.type === 'trade') {
    return listing.tradeWants ? `Muốn đổi ${listing.tradeWants}` : 'Trao đổi';
  }
  if (listing.type === 'gift') {
    return listing.offerCount > 0
      ? `Miễn phí · ${listing.offerCount} người đã đăng ký`
      : 'Miễn phí';
  }
  return `Giá ${formatVnd(listing.price ?? 0)}${listing.allowOffers ? ' · cho trả giá' : ''}`;
}

function startActions(deal: DealView, again: boolean): DealBannerAction[] {
  if (!open(deal)) return [];
  const { listing } = deal;
  if (listing.type === 'auction') return [A('bid', 'Đặt giá', true)];
  if (listing.type === 'trade') return [A('swap', again ? 'Đổi món khác' : 'Đề nghị đổi', true)];
  if (listing.type === 'gift') return again ? [] : [A('gift', 'Đăng ký nhận', true)];
  return [
    ...(listing.allowOffers ? [A('offer', again ? 'Trả giá khác' : 'Trả giá')] : []),
    A('buy', 'Mua ngay', true),
  ];
}

/**
 * One deal as its banner shows it from the viewer's side (canvas DealBanner and DealStates). The
 * chat, the chat list and the listing page all read it from here, so they agree.
 */
export function describeDealBanner(deal: DealView, now = new Date()): DealBannerData {
  const other = deal.counterpart.name ?? (deal.role === 'owner' ? 'Người mua' : 'Người đăng');
  const asker = deal.role === 'asker';
  const base = {
    typeLabel: DEAL_TYPE_LABEL[deal.listing.type],
    typeIcon: DEAL_TYPE_ICON[deal.listing.type],
    cancelled: false,
  };
  const transaction = deal.transaction;

  if (deal.status === 'cancelled' || transaction?.status === 'cancelled') {
    return {
      ...base,
      cancelled: true,
      main: agreedText(deal),
      status: transaction?.cancelledByMe
        ? 'Bạn đã huỷ giao dịch này'
        : `${other} đã huỷ giao dịch này`,
      tone: 'ref',
      actions: [],
    };
  }
  if (deal.status === 'completed' || transaction?.status === 'completed') {
    const reviewed = transaction?.reviewedByMe ?? false;
    return {
      ...base,
      main: agreedText(deal),
      status: reviewed ? 'Giao dịch thành công · bạn đã đánh giá' : 'Giao dịch thành công',
      tone: 'done',
      actions: reviewed || !transaction ? [] : [A('review', 'Đánh giá giao dịch', true)],
    };
  }
  if (deal.status === 'in_transaction') {
    if (transaction?.confirmedByMe) {
      return {
        ...base,
        main: agreedText(deal),
        status: `Chờ ${other} xác nhận`,
        tone: 'act',
        actions: [],
      };
    }
    return {
      ...base,
      main: agreedText(deal),
      status: 'Chờ bạn xác nhận',
      tone: 'deal',
      actions: transaction
        ? [
            A('cancelTransaction', 'Huỷ'),
            A('confirmTransaction', 'Xác nhận hoàn thành', true, true),
          ]
        : [],
    };
  }

  if (deal.listing.type === 'auction') {
    const round = asker ? deal.auction : deal.bidder;
    const left = round ? describeTimeLeft(new Date(round.endsAt), now) : null;
    const bid = round?.myBid ?? null;
    if (deal.status === 'declined') {
      return asker
        ? {
            ...base,
            main: bid !== null ? `Bạn đặt ${formatVnd(bid)}` : 'Đấu giá',
            status: 'Phiên đã kết thúc · bạn không thắng',
            tone: 'live',
            actions: [],
          }
        : {
            ...base,
            main: bid !== null ? `${other} đặt ${formatVnd(bid)}` : other,
            status: `Phiên đã kết thúc · ${other} không thắng`,
            tone: 'ref',
            actions: [],
          };
    }
    if (round?.offerForMe) {
      const until = round.offerForMe.expiresAt
        ? ` · trả lời trước ${formatDayMonth(new Date(round.offerForMe.expiresAt))}`
        : '';
      return asker
        ? {
            ...base,
            main: `Mời bạn mua với ${formatVnd(round.offerForMe.amount)}`,
            status: `Người thắng không giao dịch${until}`,
            tone: 'act',
            actions: [
              A('bidDecline', 'Không mua'),
              A('bidAccept', `Mua với ${formatVnd(round.offerForMe.amount)}`, true),
            ],
          }
        : {
            ...base,
            main: `Đã mời ${other} mua với ${formatVnd(round.offerForMe.amount)}`,
            status: `Chờ ${other} trả lời${until}`,
            tone: 'offer',
            actions: [],
          };
    }
    if (deal.status === 'offered' && bid !== null && round) {
      const running = round.roundStatus === 'running';
      const tail = running && left ? ` · còn ${left}` : '';
      if (asker) {
        return round.leading
          ? {
              ...base,
              main: `Bạn đặt ${formatVnd(bid)}`,
              status: `Đang dẫn đầu${tail}`,
              tone: 'offer',
              actions: [],
            }
          : {
              ...base,
              main: `Bạn đặt ${formatVnd(bid)}`,
              status: `Bị vượt giá · cao nhất ${formatVnd(round.currentPrice)}`,
              tone: 'live',
              actions: running ? [A('bid', 'Đặt giá mới', true)] : [],
            };
      }
      return round.leading
        ? {
            ...base,
            main: `${other} đặt ${formatVnd(bid)}`,
            status: `Đang dẫn đầu${tail}`,
            tone: 'offer',
            actions: [],
          }
        : {
            ...base,
            main: `${other} đặt ${formatVnd(bid)}`,
            status: `Cao nhất ${formatVnd(round.currentPrice)}${tail}`,
            tone: 'ref',
            actions: [],
          };
    }
    return {
      ...base,
      main: describeDealTerms(deal, now),
      status: 'Đang hỏi',
      tone: 'ref',
      actions: asker ? startActions(deal, false) : [],
    };
  }

  const pending = deal.status === 'offered' && deal.offer?.status === 'pending';
  if (pending) {
    const buyNow = deal.offer?.kind === 'buy_now';
    if (!asker) {
      if (deal.itemLocked) {
        return {
          ...base,
          main: `${other} ${offerVerb(deal)}`,
          status: 'Món đang giao dịch với người khác',
          tone: 'ref',
          actions: [A('decline', 'Từ chối')],
        };
      }
      return {
        ...base,
        main: `${other} ${offerVerb(deal)}`,
        status: buyNow ? 'Chờ bạn đồng ý' : 'Chờ bạn trả lời',
        tone: 'act',
        actions: [A('decline', 'Từ chối'), A('agree', 'Đồng ý', true)],
      };
    }
    const actions =
      deal.listing.type === 'gift'
        ? [A('withdraw', 'Huỷ đăng ký')]
        : buyNow
          ? [A('withdraw', 'Huỷ yêu cầu mua')]
          : [
              A('withdraw', 'Huỷ'),
              ...(open(deal)
                ? [
                    A(
                      'reoffer',
                      deal.listing.type === 'trade' ? 'Đổi món khác' : 'Trả giá khác',
                      true
                    ),
                  ]
                : []),
            ];
    return { ...base, main: offerText(deal), status: 'Chờ trả lời', tone: 'offer', actions };
  }
  if (deal.status === 'declined') {
    return asker
      ? {
          ...base,
          main: offerText(deal),
          status: `${other} đã từ chối`,
          tone: 'live',
          actions: startActions(deal, true),
        }
      : {
          ...base,
          main: `${other} ${offerVerb(deal)}`,
          status: 'Bạn đã từ chối',
          tone: 'ref',
          actions: [],
        };
  }
  return {
    ...base,
    main: describeDealTerms(deal, now),
    status: 'Đang hỏi',
    tone: 'ref',
    actions: asker ? startActions(deal, false) : [],
  };
}

/** The colors of a tone in the chat list: chip ground, text, dot. */
export const DEAL_TONE_COLORS: Record<DealTone, { bg: string; fg: string; dot: string }> = {
  act: { bg: '#FFF4D6', fg: '#8A5A00', dot: '#E8A200' },
  offer: { bg: '#E6F1FF', fg: '#0B4A99', dot: '#1673D9' },
  deal: { bg: '#FFC22E', fg: '#3D2A00', dot: '#3D2A00' },
  live: { bg: '#FDECEA', fg: '#B42318', dot: '#F0533A' },
  done: { bg: '#E3F4EA', fg: '#1E6B43', dot: '#2F9E63' },
  ref: { bg: '#F2F5F8', fg: '#33414D', dot: '#A3AEB9' },
};

/** The chat-list chip status of a deal ("Chờ bạn trả lời"), or null when it adds nothing. */
export function dealChipStatus(deal: DealView, now = new Date()): string | null {
  const status = describeDealBanner(deal, now).status;
  return status === 'Đang hỏi' ? null : status;
}
