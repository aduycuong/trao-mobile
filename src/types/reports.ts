export type ReportTargetType = 'transaction' | 'listing' | 'user';
export type ReportStatus = 'submitted' | 'in_review' | 'resolved';

export type ReportReasonOption = { code: string; label: string; hint: string };

/** What is being reported, as the report screen shows it (`GET /api/reports/target`). */
export type ReportTarget = {
  targetType: ReportTargetType;
  targetId: string;
  /** "Giao dịch · Mua bán", "Tin đăng · Bán", "Người dùng". */
  label: string;
  title: string;
  meta: string;
  coverUrl: string | null;
  reasons: ReportReasonOption[];
  /** Reason picked at the start, e.g. the other side cancelled. */
  presetReason: string | null;
  /** A transaction report can carry the chat. */
  hasChat: boolean;
  partnerName: string | null;
};

export type ReportTimelineStep = {
  title: string;
  detail: string;
  done: boolean;
  current: boolean;
};

/** One report as its sender follows it (`GET /api/reports/:id`). */
export type ReportDetail = {
  id: string;
  code: string;
  status: ReportStatus;
  statusLabel: string;
  target: ReportTarget;
  reasonLabel: string;
  description: string | null;
  evidenceCount: number;
  chatAttached: boolean;
  createdAt: string;
  timeline: ReportTimelineStep[];
  resolution: { title: string; body: string; at: string } | null;
};

export type CreateReportBody = {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string;
  evidenceKeys: string[];
  attachChat: boolean;
};

/** What Trao asked one side of a case (`GET /api/cases/:id`). */
export type MyCase = {
  id: string;
  status: 'open' | 'awaiting_statement' | 'decided';
  title: string | null;
  question: string | null;
  answered: boolean;
  decision: string | null;
};
