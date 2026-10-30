import type { ChatDialog } from '@/types/chat';
import {
  buildChatListRows,
  describeDealChip,
  stripDiacritics,
  type ChatDealSummary,
} from '../chat-list';

function dialog(id: string, name: string, over: Partial<ChatDialog> = {}): ChatDialog {
  const member = (userId: string, firebaseUid: string, memberName: string) => ({
    userId,
    firebaseUid,
    name: memberName,
    avatar: null,
    lastReadSeq: 0,
    lastDeliveredSeq: 0,
  });
  return {
    id,
    type: 'direct',
    title: null,
    avatar: null,
    memberCount: 2,
    lastSeq: 3,
    lastActivityAt: '2026-10-03T08:00:00.000Z',
    lastReadSeq: 3,
    unreadCount: 0,
    lastMessage: null,
    members: [member('me', 'uid-me', 'Bin'), member(`u-${id}`, `uid-${id}`, name)],
    ...over,
  };
}

function deal(over: Partial<ChatDealSummary> = {}): ChatDealSummary {
  return {
    id: 'd1',
    inboxId: 'a',
    active: true,
    updatedAt: '2026-10-04T08:00:00.000Z',
    listing: { id: 'l1', type: 'sell', title: 'iPhone 13', coverUrl: null },
    ...over,
  };
}

describe('stripDiacritics', () => {
  it('drops accents and lowercases', () => {
    expect(stripDiacritics('Đức Khang')).toBe('duc khang');
  });
});

describe('buildChatListRows', () => {
  const dialogs = [
    dialog('a', 'Hoàng Nam', { lastActivityAt: '2026-10-01T08:00:00.000Z' }),
    dialog('b', 'Thảo Vy', { lastActivityAt: '2026-10-02T08:00:00.000Z' }),
    dialog('c', 'Empty', { lastSeq: 0 }),
  ];
  const base = { dialogs, firebaseUid: 'uid-me', filter: 'all', query: '' } as const;

  it('orders by activity and hides empty chats', () => {
    const { rows } = buildChatListRows({ ...base, deals: [] });
    expect(rows.map((row) => row.dialog.id)).toEqual(['b', 'a']);
  });

  it('counts and filters going deals; a deal lifts a chat by its latest event', () => {
    const all = buildChatListRows({ ...base, deals: [deal()] });
    expect(all.dealCount).toBe(1);
    expect(all.rows[0]?.dialog.id).toBe('a');
    const only = buildChatListRows({ ...base, deals: [deal()], filter: 'deal' });
    expect(only.rows.map((row) => row.dialog.id)).toEqual(['a']);
  });

  it('keeps a chat that has a deal but no message yet', () => {
    const { rows } = buildChatListRows({ ...base, deals: [deal({ inboxId: 'c' })] });
    expect(rows.some((row) => row.dialog.id === 'c')).toBe(true);
  });

  it('searches by name without accents', () => {
    const { rows } = buildChatListRows({ ...base, deals: [], query: 'thao' });
    expect(rows.map((row) => row.peer?.name)).toEqual(['Thảo Vy']);
  });
});

describe('describeDealChip', () => {
  it('is null without deals', () => {
    expect(describeDealChip([])).toBeNull();
  });

  it('names one deal and adds the status when given', () => {
    expect(describeDealChip([deal()], () => 'Chờ bạn')?.text).toBe('Mua bán iPhone 13 · Chờ bạn');
  });

  it('counts several going deals', () => {
    const chip = describeDealChip([
      deal(),
      deal({ id: 'd2', listing: { id: 'l2', type: 'auction', title: 'AirPods', coverUrl: null } }),
      deal({ id: 'd3', active: false }),
    ]);
    expect(chip?.text).toBe('2 giao dịch · Mua bán iPhone 13, Đấu giá AirPods');
    expect(chip?.second?.id).toBe('d2');
  });

  it('falls back to the latest finished deal', () => {
    expect(describeDealChip([deal({ active: false })])?.text).toBe('Mua bán iPhone 13');
  });
});
