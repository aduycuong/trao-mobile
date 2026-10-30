import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '@/services/api';
import { fileUploadTransport } from '@/services/chat/file-upload-transport';
import { CameraPermissionError } from '@/services/avatar-upload';
import { PHOTO_MAX_BYTES, PHOTO_MAX_EDGE, type MediaFileSummary } from '@/types/stock';
import { checkVideo, videoMime, type PickKind } from '@/utils/media-rules';

const PHOTO_QUALITIES = [0.85, 0.7, 0.55];
/** How many times the size is cut by a quarter when quality alone is not enough. */
const MAX_SHRINK_STEPS = 4;
const BLURHASH_PARTS: [number, number] = [4, 3];

/** A file chosen from the library or camera, before it is sent. */
export type PickedMedia = {
  kind: PickKind;
  uri: string;
  mime: string | null;
  /** Length of a clip in ms; null for a photo. */
  durationMs: number | null;
  width: number;
  height: number;
};

/** A photo or clip that cannot be used; `message` is meant for the user. */
export class MediaPrepareError extends Error {}

function toPicked(asset: ImagePicker.ImagePickerAsset): PickedMedia {
  const isVideo = asset.type === 'video';
  return {
    kind: isVideo ? 'video' : 'photo',
    uri: asset.uri,
    mime: asset.mimeType ?? null,
    durationMs: isVideo ? (asset.duration ?? null) : null,
    width: asset.width,
    height: asset.height,
  };
}

/** Lets the user choose up to `limit` photos and videos from the library. */
export async function pickItemMedia(limit: number): Promise<PickedMedia[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 1,
    exif: false,
  });
  return result.canceled ? [] : result.assets.map(toPicked);
}

/** Takes one photo with the camera; throws `CameraPermissionError` when it is not allowed. */
export async function captureItemPhoto(): Promise<PickedMedia[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new CameraPermissionError(permission.canAskAgain);
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 1,
    exif: false,
  });
  return result.canceled ? [] : result.assets.map(toPicked);
}

type PreparedPhoto = { uri: string; width: number; height: number; size: number };

/**
 * Redraws a picked photo for upload: at most 1600 px on the long edge, JPEG under 5 MB. Decoding
 * and encoding again drops all metadata (GPS included), fixes the rotation and accepts any format
 * the phone can read (HEIC too).
 */
async function preparePhoto(uri: string): Promise<PreparedPhoto> {
  let source;
  try {
    source = await ImageManipulator.manipulate(uri).renderAsync();
  } catch {
    throw new MediaPrepareError('Không đọc được ảnh này.');
  }

  let scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(source.width, source.height));
  for (let step = 0; step <= MAX_SHRINK_STEPS; step += 1) {
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const resized =
      scale < 1
        ? await ImageManipulator.manipulate(uri).resize({ width, height }).renderAsync()
        : source;
    for (const quality of PHOTO_QUALITIES) {
      const saved = await resized.saveAsync({ format: SaveFormat.JPEG, compress: quality });
      const size = new File(saved.uri).size ?? Number.POSITIVE_INFINITY;
      if (size <= PHOTO_MAX_BYTES) {
        return { uri: saved.uri, width: saved.width, height: saved.height, size };
      }
    }
    scale *= 0.75;
  }
  throw new MediaPrepareError('Ảnh này quá lớn để tải lên.');
}

type UploadTarget = { mediaId: string; uploadUrl: string };

/** Asks for an upload URL, sends the file, and tells the server it is done. */
async function sendFile(
  token: string,
  params: {
    purpose: 'item_photo' | 'item_video';
    uri: string;
    contentType: string;
    size: number;
    done: { width: number; height: number; blurhash?: string; durationMs?: number };
  }
): Promise<MediaFileSummary> {
  const target = await apiRequest<UploadTarget>('/api/media/uploads', {
    token,
    body: {
      purpose: params.purpose,
      contentType: params.contentType,
      contentLength: params.size,
    },
  });
  try {
    await fileUploadTransport.put({
      url: target.uploadUrl,
      uri: params.uri,
      contentType: params.contentType,
    });
  } catch {
    throw new MediaPrepareError('Không tải lên được. Hãy kiểm tra mạng và thử lại.');
  }
  return apiRequest<MediaFileSummary>(`/api/media/${encodeURIComponent(target.mediaId)}/complete`, {
    token,
    body: params.done,
  });
}

/** Uploads one picked photo; the file is checked by the server after this returns. */
export async function uploadItemPhoto(token: string, pick: PickedMedia): Promise<MediaFileSummary> {
  const prepared = await preparePhoto(pick.uri);
  const blurhash = await Image.generateBlurhashAsync(prepared.uri, BLURHASH_PARTS).catch(
    () => null
  );
  return sendFile(token, {
    purpose: 'item_photo',
    uri: prepared.uri,
    contentType: 'image/jpeg',
    size: prepared.size,
    done: {
      width: prepared.width,
      height: prepared.height,
      ...(blurhash ? { blurhash } : {}),
    },
  });
}

/** Checks a picked clip before it is sent; null when it can be used, else a message. */
export function videoProblem(pick: PickedMedia): string | null {
  let size: number | null = null;
  try {
    size = new File(pick.uri).size ?? null;
  } catch {
    size = null;
  }
  return checkVideo({
    mime: videoMime(pick.mime, pick.uri),
    sizeBytes: size,
    durationMs: pick.durationMs,
  });
}

/** Uploads one picked clip as recorded; the server makes the playable copy. */
export async function uploadItemVideo(token: string, pick: PickedMedia): Promise<MediaFileSummary> {
  const problem = videoProblem(pick);
  if (problem) throw new MediaPrepareError(problem);
  const size = new File(pick.uri).size ?? 0;
  return sendFile(token, {
    purpose: 'item_video',
    uri: pick.uri,
    contentType: videoMime(pick.mime, pick.uri)!,
    size,
    done: {
      width: pick.width,
      height: pick.height,
      durationMs: Math.round(pick.durationMs ?? 0),
    },
  });
}
