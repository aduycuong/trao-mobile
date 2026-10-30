export type PenaltyKind = 'yellow' | 'red';
export type PenaltyAction = 'post' | 'trade';

/** The card a person is under now (`GET /api/penalties/active`). */
export type ActiveCard = {
  id: string;
  kind: PenaltyKind;
  startsAt: string;
  endsAt: string;
};

export type AppealState = {
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  dueAt: string;
  decidedAt: string | null;
  response: string | null;
};

/** A card as its holder reads it (`GET /api/penalties/:id`). */
export type PenaltyDetail = {
  id: string;
  kind: PenaltyKind;
  /** Still in force: active and not past its end. */
  active: boolean;
  /** "active" | "expired" | "superseded" | "revoked". */
  status: string;
  startsAt: string;
  endsAt: string;
  daysLeft: number;
  reason: string;
  transactionId: string | null;
  /** A red card only: listings hidden and offers declined by it. */
  effects: { hiddenListings: number; declinedOffers: number } | null;
  escalated: boolean;
  appeal: AppealState | null;
  canAppeal: boolean;
};
