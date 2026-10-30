export type PolicyPageSummary = {
  slug: string;
  title: string;
  summary: string;
};

export type PolicyPageDetail = PolicyPageSummary & {
  /** Markdown. */
  body: string;
  updatedAt: string;
};

export type HelpFaqSummary = {
  id: string;
  question: string;
};

export type HelpFaqDetail = HelpFaqSummary & {
  /** Markdown. */
  answer: string;
  updatedAt: string;
};

export type HelpHome = {
  /** The six help topics, in order. */
  topics: PolicyPageSummary[];
  faqs: HelpFaqSummary[];
  /** The signed-in user's own items; null for a guest. */
  mine: { feedbackCount: number } | null;
};

export type HelpSearchResult = {
  faqs: HelpFaqSummary[];
  pages: PolicyPageSummary[];
};

export type FeedbackKind = 'bug' | 'idea' | 'other';

export type FeedbackBody = {
  kind: FeedbackKind;
  body: string;
  screenshotKeys: string[];
  allowContact: boolean;
  deviceInfo?: { platform: string; os?: string; model?: string; appVersion?: string };
};
