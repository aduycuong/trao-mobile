/** Everything the Tài khoản screen shows. The full phone number is never sent. */
export type MyAccount = {
  displayName: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  /** Public area line, e.g. "Linh Trung, Hồ Chí Minh". */
  areaName: string | null;
  email: string;
  emailVerified: boolean;
  /** E.g. `090 •••• 218`; null until a phone is verified. */
  maskedPhone: string | null;
};

export type UpdateMyAccountBody = {
  displayName?: string;
  username?: string;
  bio?: string;
  /** Key of an image just uploaded with `uploadType: "avatar"`. */
  avatarKey?: string;
};

export type VideoAutoplay = 'always' | 'wifi' | 'never';
export type Theme = 'system' | 'light' | 'dark';

export type MySettings = {
  videoAutoplay: VideoAutoplay;
  /** Saved only; the app is light until a dark design exists. */
  theme: Theme;
  /** Only `vi` for now. */
  language: 'vi';
  /** Default area, e.g. "Linh Trung, Hồ Chí Minh"; null until chosen. */
  defaultAreaName: string | null;
  blockedCount: number;
};
