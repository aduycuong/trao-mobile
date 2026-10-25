/** Root RTDB paths used by chat. */
export const CHAT_SYNC_PATH = 'chat-sync';
export const CHAT_PRESENCE_PATH = 'chat-presence';
export const CHAT_TYPING_PATH = 'chat-typing';

export const CHAT_TEXT_MAX_LENGTH = 2000;
export const CHAT_GROUP_MAX_MEMBERS = 8;
export const CHAT_GROUP_MIN_SELECTED_FRIENDS = 2;
export const CHAT_GROUP_TITLE_MAX_LENGTH = 40;
export const CHAT_HISTORY_PAGE_SIZE = 50;

/** Preset group avatars (kids cannot upload images). */
/** Group icons; each has 3D artwork in the bundled emoji set. */
export const CHAT_GROUP_AVATARS = [
  '🚀',
  '🪐',
  '🤖',
  '👽',
  '🏆',
  '📚',
  '🌈',
  '🎈',
  '⚽',
  '🍕',
  '🎨',
  '🌟',
] as const;

/** Typing signal: client refreshes every 3s, readers treat it as stale after 5s. */
export const CHAT_TYPING_REFRESH_MS = 3000;
export const CHAT_TYPING_EXPIRE_MS = 5000;

/**
 * How long the sender can unsend a message for everyone, when the dialog does
 * not say (`unsendWindowSeconds`). Same default as the server.
 */
export const CHAT_UNSEND_WINDOW_SECONDS = 48 * 60 * 60;

/** Emoji a user can react with. A user has at most one on a message. */
export const CHAT_REACTIONS = [
  { emoji: '❤️', label: 'Yêu thích' },
  { emoji: '😂', label: 'Haha' },
  { emoji: '😮', label: 'Ngạc nhiên' },
  { emoji: '😢', label: 'Buồn' },
  { emoji: '👍', label: 'Thích' },
] as const;

/** Media messages (images only in v1). See spacekids-app docs/chat/media.md. */
export const CHAT_MEDIA_MAX_FILES = 10;
/** The (already compressed) full image of an attachment. */
export const CHAT_MEDIA_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
/** The thumbnail uploaded next to each image. */
export const CHAT_MEDIA_THUMB_MAX_BYTES = 512 * 1024;
export const CHAT_MEDIA_URL_MAX_IDS = 50;
