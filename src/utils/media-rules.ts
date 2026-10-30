import {
  ITEM_MEDIA_MAX_COUNT,
  ITEM_VIDEO_MAX_COUNT,
  ITEM_VIDEO_MAX_SECONDS,
  ITEM_VIDEO_MIN_SECONDS,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_MB,
} from '@/types/stock';

/** Slack on the video length rule, for how phones round a duration (the server allows the same). */
const DURATION_SLACK_MS = 300;

export const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;

const MIME_BY_EXTENSION: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

/** The mime type of a picked clip: what the picker says, else guessed from the file name. */
export function videoMime(mimeType: string | null | undefined, uri: string): string | null {
  const given = mimeType?.toLowerCase();
  if (given && (VIDEO_MIMES as readonly string[]).includes(given)) return given;
  const extension = uri.split('?')[0]?.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[extension] ?? null;
}

/** A message for the user when a clip cannot be used, else null. */
export function checkVideo(clip: {
  mime: string | null;
  sizeBytes: number | null;
  durationMs: number | null;
}): string | null {
  if (!clip.mime) return 'Video phải là MP4, MOV hoặc WebM.';
  if (clip.sizeBytes !== null && clip.sizeBytes > VIDEO_MAX_BYTES) {
    return `Video tối đa ${VIDEO_MAX_MB} MB. Hãy quay ngắn hơn hoặc chọn chất lượng thấp hơn.`;
  }
  if (clip.durationMs === null || !Number.isFinite(clip.durationMs) || clip.durationMs <= 0) {
    return 'Không đọc được độ dài video này.';
  }
  if (clip.durationMs < ITEM_VIDEO_MIN_SECONDS * 1000 - DURATION_SLACK_MS) {
    return `Video cần dài ít nhất ${ITEM_VIDEO_MIN_SECONDS} giây.`;
  }
  if (clip.durationMs > ITEM_VIDEO_MAX_SECONDS * 1000 + DURATION_SLACK_MS) {
    return `Video dài tối đa ${ITEM_VIDEO_MAX_SECONDS} giây. Hãy cắt ngắn rồi chọn lại.`;
  }
  return null;
}

export type PickKind = 'photo' | 'video';

/**
 * Which of the picked files fit: at most 10 photos and videos together, at most 3 of them videos.
 * `used` counts what the item already holds or is still sending. Files that do not fit are
 * reported once as `errors`.
 */
export function planPicks<T extends { kind: PickKind }>(
  used: { total: number; videos: number },
  picks: T[]
): { accepted: T[]; errors: string[] } {
  const errors: string[] = [];
  const accepted: T[] = [];
  let total = used.total;
  let videos = used.videos;
  let overTotal = false;
  let overVideos = false;

  for (const pick of picks) {
    if (total >= ITEM_MEDIA_MAX_COUNT) {
      overTotal = true;
      continue;
    }
    if (pick.kind === 'video' && videos >= ITEM_VIDEO_MAX_COUNT) {
      overVideos = true;
      continue;
    }
    accepted.push(pick);
    total += 1;
    if (pick.kind === 'video') videos += 1;
  }

  if (overTotal) errors.push(`Tối đa ${ITEM_MEDIA_MAX_COUNT} ảnh và video.`);
  if (overVideos) errors.push(`Mỗi đồ có tối đa ${ITEM_VIDEO_MAX_COUNT} video.`);
  return { accepted, errors };
}
