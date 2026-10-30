import type { ItemDetail } from '@/types/stock';

/** A photo or video on the Thêm đồ form. */
export type Tile = {
  id: string;
  kind: 'photo' | 'video';
  /** Null while the file is still being sent. */
  mediaId: string | null;
  /** What to draw: the stored photo or poster, the local photo just picked, or null. */
  url: string | null;
  caption: string;
  durationMs: number | null;
};

/** The tiles of a saved item, photos and videos apart. */
export function tilesOf(item: ItemDetail): { photos: Tile[]; videos: Tile[] } {
  return {
    photos: item.photos.map((photo) => ({
      id: photo.mediaId,
      kind: 'photo',
      mediaId: photo.mediaId,
      url: photo.url,
      caption: photo.caption ?? '',
      durationMs: null,
    })),
    videos: item.videos.map((video) => ({
      id: video.mediaId,
      kind: 'video',
      mediaId: video.mediaId,
      url: video.posterUrl,
      caption: video.caption ?? '',
      durationMs: video.durationMs,
    })),
  };
}

/** Whether two lists hold the same files in the same order with the same captions. */
export function sameMedia(a: Tile[], b: Tile[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (tile, index) =>
      tile.mediaId === b[index]!.mediaId && tile.caption.trim() === b[index]!.caption.trim()
  );
}
