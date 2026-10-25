export type MyProfileWarning = {
  kind: 'yellow' | 'red';
  /** ISO date the card ends; null while open ended. */
  endsAt: string | null;
};

/** The signed-in user's own profile for the Tôi tab. Phone and exact location are never in it. */
export type MyProfile = {
  id: string;
  /** Username, else the id: what a profile link uses. */
  handle: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  /** Public area line, e.g. "Linh Trung, Hồ Chí Minh". */
  areaName: string | null;
  followerCount: number;
  followingCount: number;
  completedCount: number;
  ratingAverage: number | null;
  ratingCount: number;
  cancelRatePercent: number | null;
  accountLevel: 'member' | 'verified';
  tenure: { label: string; since: string };
  activityLevel: 'daily' | 'regular' | 'occasional';
  warning: MyProfileWarning | null;
  rewards: { available: number; locked: number };
};

export type PhoneVerificationState =
  | {
      verified: true;
      /** E.g. `090 •••• 218`. */
      maskedPhone: string;
      /** Đồng granted for this verification; 0 when the number was rewarded before. */
      rewardAmount: number;
    }
  | {
      verified: false;
      /** Number to send the code to, digits only. */
      traoNumber: string;
      code: string;
      /** When the code stops working; a new one is made on the next read. */
      expiresAt: string;
      currentMaskedPhone: string | null;
    };

/** What the server writes to RTDB when a number is verified. */
export type PhoneVerifiedSignal = {
  maskedPhone: string;
  rewardAmount: number;
  /** Server time in ms. */
  verifiedAt: number;
};
