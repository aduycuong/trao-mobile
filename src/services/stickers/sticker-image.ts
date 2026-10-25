/**
 * Loadable URL for a chat sticker, resized by the media host (Cloudflare Image Resizing,
 * as the web app's `getMediaUrl`). `size` is the largest side in points; it is doubled
 * so stickers stay sharp on high-density screens. Null when the media host is not set.
 */
export function stickerImageUri(imagePath: string, size: number): string | null {
  const trimmed = imagePath.trim();
  if (!trimmed) return null;
  const options = `width=${size * 2},height=${size * 2},fit=contain`;

  if (/^https?:/i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return `${url.origin}/cdn-cgi/image/${options}${url.pathname}`;
    } catch {
      return trimmed;
    }
  }
  const base = process.env.EXPO_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, '');
  return base ? `${base}/cdn-cgi/image/${options}/${trimmed.replace(/^\//, '')}` : null;
}
