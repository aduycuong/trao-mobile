import type { ListingType } from '@/types/people';
import type { TransactionCancelReason, TransactionDetail } from '@/types/deals';
import { formatVnd } from '@/utils/format';

export const TRANSACTION_CANCEL_REASONS: { code: TransactionCancelReason; label: string }[] = [
  { code: 'no_show', label: 'Người kia không đến' },
  { code: 'not_as_described', label: 'Hàng không đúng mô tả' },
  { code: 'changed_mind', label: 'Tôi đổi ý' },
  { code: 'other', label: 'Khác' },
];

export const TRANSACTION_CANCEL_NOTE_MAX_LENGTH = 300;

export const TRANSACTION_DONE_LABELS: Record<ListingType, string> = {
  sell: 'Đã bán',
  auction: 'Đã đấu giá thành công',
  trade: 'Đã trao đổi',
  gift: 'Đã cho tặng',
};

export const FORM_LABEL: Record<ListingType, string> = {
  sell: 'Bán',
  auction: 'Đấu giá',
  trade: 'Trao đổi',
  gift: 'Cho tặng',
};
const SELLER_LABEL: Record<ListingType, string> = {
  sell: 'Người bán',
  auction: 'Người bán',
  trade: 'Người đăng',
  gift: 'Người tặng',
};
const BUYER_LABEL: Record<ListingType, string> = {
  sell: 'Người mua',
  auction: 'Người thắng',
  trade: 'Người đề nghị',
  gift: 'Người nhận',
};
const STEPS: Record<ListingType, [string, string]> = {
  sell: ['Gửi đề nghị', 'Người đăng đồng ý'],
  trade: ['Gửi đề nghị', 'Người đăng đồng ý'],
  gift: ['Đăng ký nhận', 'Người tặng chọn bạn'],
  auction: ['Đặt giá', 'Thắng phiên'],
};
const HANDOVER: Record<string, string> = { meet: 'Trực tiếp', ship: 'Gửi hàng' };

/** The rows of the terms block of Chi tiết giao dịch. */
export function buildTerms(deal: TransactionDetail): [string, string][] {
  const mine = deal.role === 'seller';
  const otherName = deal.counterpart.name ?? 'Người kia';
  const rows: [string, string][] = [
    [SELLER_LABEL[deal.type], mine ? 'Bạn' : otherName],
    [BUYER_LABEL[deal.type], mine ? otherName : 'Bạn'],
  ];
  if (deal.type === 'sell' || deal.type === 'auction')
    rows.push(['Giá', formatVnd(deal.price ?? 0)]);
  if (deal.type === 'trade') {
    rows.push(['Đổi', `${deal.item.title} ⇄ ${deal.counterItem?.title ?? '—'}`]);
    if (deal.tradeWants) rows.push(['Người đăng muốn', deal.tradeWants]);
  }
  if (deal.type === 'gift') rows.push(['Giá', 'Miễn phí']);
  rows.push([
    'Giao nhận',
    deal.handover.methods.map((method) => HANDOVER[method] ?? method).join(' · ') || '—',
  ]);
  if (deal.handover.note) rows.push(['Ghi chú của người đăng', deal.handover.note]);
  return rows;
}

export type ProgressStep = { title: string; sub: string | null; done: boolean; current: boolean };

/** The five steps: đề nghị, đồng ý, đang giao dịch, hoàn thành, đánh giá. */
export function progressSteps(deal: TransactionDetail): ProgressStep[] {
  const [first, second] = STEPS[deal.type];
  const completed = deal.status === 'completed';
  const otherName = deal.counterpart.name ?? 'bên kia';
  const confirmSub = completed
    ? null
    : deal.cancel
      ? 'Đã huỷ'
      : deal.meConfirmed
        ? `Bạn đã xác nhận · chờ ${otherName}`
        : deal.themConfirmed
          ? `${otherName} đã xác nhận · chờ bạn`
          : 'Giao nhận xong thì mỗi bên xác nhận';
  const titles = [first, second, 'Đang giao dịch', 'Hoàn thành', 'Đánh giá'];
  return titles.map((title, index) => ({
    title,
    sub: index === 2 ? confirmSub : index === 3 && !completed ? 'Cần cả hai bên xác nhận' : null,
    done: index < (completed ? 4 : 2) || (index === 4 && deal.review.mineSent),
    current: completed ? index === 4 && !deal.review.mineSent : index === 2 && !deal.cancel,
  }));
}
