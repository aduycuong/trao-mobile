import type { ChatDialog, ChatDialogMember } from '@/types/chat';
import type { ListingType } from '@/types/people';
import { getPeerMember } from './chat-view';

/** The part of a deal the chat list needs (`GET /api/chat/deal-index`, a subset of the web `DealView`). */
export type ChatDealSummary = {
  id: string;
  inboxId: string | null;
  /** "Đang giao dịch": the listing is still on the market, or the deal is in progress. */
  active: boolean;
  updatedAt: string;
  listing: { id: string; type: ListingType; title: string; coverUrl: string | null };
};

export type ChatListFilter = 'all' | 'deal';

export type ChatListRowData = {
  dialog: ChatDialog;
  peer: ChatDialogMember | undefined;
  /** Every deal of this chat, newest first. */
  deals: ChatDealSummary[];
  lastActivityAt: string;
};

export const CHAT_DEAL_TYPE_LABEL: Record<ListingType, string> = {
  sell: 'Mua bán',
  auction: 'Đấu giá',
  trade: 'Trao đổi',
  gift: 'Cho tặng',
};

/** Lower case without accents, so "ha" finds "Hà". */
export function stripDiacritics(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function groupDealsByInbox(deals: ChatDealSummary[]) {
  const byInbox = new Map<string, ChatDealSummary[]>();
  for (const deal of deals) {
    if (!deal.inboxId) continue;
    byInbox.set(deal.inboxId, [...(byInbox.get(deal.inboxId) ?? []), deal]);
  }
  for (const list of byInbox.values()) list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return byInbox;
}

const later = (a: string, b: string | undefined) => (b && b > a ? b : a);

/**
 * The rows of the Tin nhắn tab: direct chats that have a message or a deal, newest activity
 * first. `deal` keeps the chats with an "Đang giao dịch" deal; `query` matches the name.
 */
export function buildChatListRows(input: {
  dialogs: ChatDialog[];
  firebaseUid: string | null;
  deals: ChatDealSummary[];
  filter: ChatListFilter;
  query: string;
}): { rows: ChatListRowData[]; dealCount: number } {
  const byInbox = groupDealsByInbox(input.deals);
  const needle = stripDiacritics(input.query.trim());

  const all: ChatListRowData[] = [];
  for (const dialog of input.dialogs) {
    if (dialog.type !== 'direct') continue;
    const deals = byInbox.get(dialog.id) ?? [];
    if (dialog.lastSeq === 0 && deals.length === 0) continue;
    all.push({
      dialog,
      peer: input.firebaseUid ? getPeerMember(dialog, input.firebaseUid) : undefined,
      deals,
      lastActivityAt: later(dialog.lastActivityAt, deals[0]?.updatedAt),
    });
  }
  all.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));

  const isDealRow = (row: ChatListRowData) => row.deals.some((deal) => deal.active);
  const rows = all
    .filter((row) => input.filter === 'all' || isDealRow(row))
    .filter((row) => !needle || stripDiacritics(row.peer?.name ?? '').includes(needle));
  return { rows, dealCount: all.filter(isDealRow).length };
}

/**
 * The chip under the last message: the form and the item; several going deals read
 * "2 giao dịch · Mua bán iPhone 13, Đấu giá AirPods". With none going, the latest deal shows.
 * `statusOf` lets the deal part add a short status ("Chờ bạn trả lời").
 */
export function describeDealChip(
  deals: ChatDealSummary[],
  statusOf?: (deal: ChatDealSummary) => string | null
): { text: string; first: ChatDealSummary; second: ChatDealSummary | null } | null {
  const going = deals.filter((deal) => deal.active);
  const shown = going.length > 0 ? going : deals.slice(0, 1);
  const first = shown[0];
  if (!first) return null;

  const named = (deal: ChatDealSummary) =>
    `${CHAT_DEAL_TYPE_LABEL[deal.listing.type]} ${deal.listing.title}`;
  const status = statusOf?.(first);
  const text =
    shown.length > 1
      ? `${shown.length} giao dịch · ${shown.map(named).join(', ')}`
      : `${named(first)}${status ? ` · ${status}` : ''}`;
  return { text, first, second: shown[1] ?? null };
}
