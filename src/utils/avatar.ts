/** True when a stored avatar is an image URL, path or storage key rather than an emoji or initial. */
export function isImageAvatar(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return false;
  if (/^(https?:|\/|data:|file:)/i.test(trimmed)) return true;
  return trimmed.includes('/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(trimmed);
}

/** Loadable image URL for an avatar; storage keys resolve against the public media host. */
export function avatarImageUri(avatar: string): string | null {
  const trimmed = avatar.trim();
  if (/^(https?:|data:|file:)/i.test(trimmed)) return trimmed;
  const base = process.env.EXPO_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, '');
  return base ? `${base}/${trimmed.replace(/^\//, '')}` : null;
}
