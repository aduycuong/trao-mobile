import type { ActiveCard, AppealState, PenaltyAction, PenaltyDetail } from '@/types/penalties';
import { formatDayMonth } from '@/utils/format';

/**
 * What each card means to the person under it (web `lib/penalties/constants`, canvas Penalty):
 * what is blocked, what still works, and the warning at the bottom.
 */
export const PENALTY_RULES = {
  yellow: {
    cant: ['Đăng tin mới (bán, đấu giá, trao đổi, cho tặng)'],
    can: [
      'Mua, trả giá, đặt giá, đề nghị đổi, đăng ký nhận',
      'Thêm đồ vào Kho đồ',
      'Tin đang đăng và giao dịch đang dở giữ nguyên',
    ],
  },
  red: {
    cant: ['Đăng tin mới', 'Mua, trả giá, đặt giá, đề nghị đổi, đăng ký nhận'],
    can: ['Hoàn tất giao dịch đang dở', 'Thêm đồ vào Kho đồ', 'Nhắn tin'],
  },
} as const;

/** Colors of the card boxes (canvas Penalty). */
export const PENALTY_LOOK = {
  yellow: {
    color: '#FFC22E',
    bg: '#FFF4D6',
    ink: '#5C3D00',
    head: 'Bạn nhận thẻ Vàng',
    warnBg: '#FDECEA',
    warnInk: '#B42318',
  },
  red: {
    color: '#E5342B',
    bg: '#FDECEA',
    ink: '#8A1C14',
    head: 'Bạn nhận thẻ Đỏ',
    warnBg: '#F2F5F8',
    warnInk: '#5A6772',
  },
} as const;

/**
 * Whether a card blocks an action: a yellow card blocks only posting, a red one posting and
 * trading (offers, bids). The server refuses the same actions (`ERR_PENALIZED`).
 */
export function isBlocked(card: ActiveCard | null | undefined, action: PenaltyAction): boolean {
  if (!card) return false;
  if (action === 'trade') return card.kind === 'red';
  return true;
}

export type BlockedCopy = {
  title: string;
  body: string;
  cta: string;
  /** What the first button does: "stock" opens Kho đồ, "chat" the conversation with the poster. */
  go: 'stock' | 'chat';
};

/** The words of the blocked sheet (canvas Penalty, view "blocked"). */
export function blockedCopy(card: ActiveCard, action: PenaltyAction): BlockedCopy {
  const until = formatDayMonth(new Date(card.endsAt));
  if (action === 'trade') {
    return {
      title: 'Chưa giao dịch được',
      body: `Bạn đang bị thẻ Đỏ đến ${until}. Trong thời gian này chưa trả giá, mua, đặt giá, đề nghị đổi hay đăng ký nhận được. Bạn vẫn nhắn tin được.`,
      cta: 'Nhắn tin với người đăng',
      go: 'chat',
    };
  }
  return {
    title: 'Chưa đăng tin được',
    body: `Bạn đang bị thẻ ${card.kind === 'red' ? 'Đỏ' : 'Vàng'} đến ${until}. Trong thời gian này chưa đăng tin mới được, nhưng vẫn thêm đồ vào Kho đồ để đăng sau.`,
    cta: 'Thêm vào Kho đồ',
    go: 'stock',
  };
}

/** The "Tạm không làm được" lines; a red card adds what it did to listings and offers. */
export function cantLines(penalty: Pick<PenaltyDetail, 'kind' | 'effects'>): string[] {
  const lines: string[] = [...PENALTY_RULES[penalty.kind].cant];
  const { effects } = penalty;
  if (
    penalty.kind === 'red' &&
    effects &&
    (effects.hiddenListings > 0 || effects.declinedOffers > 0)
  ) {
    lines.push(
      `${effects.hiddenListings} tin đang đăng tạm ẩn; ${effects.declinedOffers} đề nghị đang chờ đã tự bị từ chối`
    );
  }
  return lines;
}

/** The warning at the bottom of the notice. */
export function penaltyWarning(penalty: Pick<PenaltyDetail, 'kind' | 'endsAt'>): string {
  return penalty.kind === 'yellow'
    ? `Nhận thêm thẻ Vàng trước ${formatDayMonth(new Date(penalty.endsAt))} sẽ thành thẻ Đỏ: 1 tháng không giao dịch được.`
    : 'Hết hạn thẻ Đỏ, tài khoản trở lại bình thường. Thẻ vẫn được ghi trong lịch sử của bạn.';
}

/** The note above a card that is no longer in force. */
export function inactiveNote(status: string): string {
  if (status === 'revoked') return 'Thẻ này đã được gỡ.';
  if (status === 'superseded') return 'Thẻ này đã được thay bằng thẻ Đỏ.';
  return 'Thẻ này đã hết hạn.';
}

/** The text of the Home block under the title. */
export function bannerSub(kind: ActiveCard['kind']): string {
  return kind === 'red'
    ? 'Tạm không giao dịch. Vẫn thêm đồ vào Kho và nhắn tin được.'
    : 'Tạm không đăng tin mới. Vẫn mua, trả giá, thêm đồ vào Kho được.';
}

export type AppealStep = { title: string; detail: string; done: boolean; current: boolean };

/**
 * The three steps of an appeal once sent (canvas Penalty, view "sent"). `format` renders a time as
 * "20/10 · 11:02".
 */
export function appealSteps(appeal: AppealState, format: (iso: string) => string): AppealStep[] {
  const decided = appeal.status !== 'pending';
  return [
    { title: 'Đã gửi kiến nghị', detail: format(appeal.createdAt), done: true, current: false },
    {
      title: decided ? 'Đã xét' : 'Đang xét',
      detail:
        decided && appeal.decidedAt
          ? format(appeal.decidedAt)
          : 'Người xét khác với người đã quyết định thẻ. Thường trong 3 ngày làm việc.',
      done: decided,
      current: !decided,
    },
    {
      title: 'Kết quả',
      detail: decided
        ? `${appeal.status === 'accepted' ? 'Đã gỡ thẻ.' : 'Giữ thẻ.'} ${appeal.response ?? ''}`.trim()
        : 'Giữ thẻ, hoặc gỡ thẻ và xoá khỏi hồ sơ công khai',
      done: decided,
      current: false,
    },
  ];
}
