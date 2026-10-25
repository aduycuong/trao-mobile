import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';
import type { LocalMediaItem } from '@/types/chat';
import type { ChatMediaFiles } from './chat-media-files';
import { CHAT_MEDIA_IMAGE_MAX_BYTES, CHAT_MEDIA_THUMB_MAX_BYTES } from './constants';

/** An image that cannot be sent; `message` is meant for the user. */
export class ChatImageError extends Error {}

const FULL_MAX_EDGE = 1600;
const FULL_QUALITIES = [0.85, 0.7, 0.55];
const THUMB_MAX_EDGE = 320;
const THUMB_QUALITIES = [0.7, 0.5];
/** How many times the size is cut by a quarter when quality alone is not enough. */
const MAX_SHRINK_STEPS = 4;
const MIME = 'image/jpeg';

type Encoded = { uri: string; width: number; height: number; size: number };

/**
 * Turns a picked photo into what a chat message uploads. The image is decoded
 * and encoded again as JPEG, which drops its metadata (EXIF, GPS) and accepts
 * any format the phone can read (HEIC included). The size is capped, a
 * thumbnail and a blurhash placeholder are made, and both files are moved into
 * the user's chat media folder so they outlive the picker's cache.
 *
 * JPEG rather than WebP (the web client's first choice): every phone can
 * encode it, and the server accepts both.
 */
export async function prepareChatImage(
  uri: string,
  files: ChatMediaFiles
): Promise<LocalMediaItem> {
  let image: ImageRef;
  try {
    image = await ImageManipulator.manipulate(uri).renderAsync();
  } catch {
    throw new ChatImageError('Không đọc được ảnh này.');
  }

  const temporary: string[] = [];
  try {
    const full = await encodeWithin(
      uri,
      image,
      FULL_MAX_EDGE,
      FULL_QUALITIES,
      CHAT_MEDIA_IMAGE_MAX_BYTES,
      temporary
    );
    const thumb = await encodeWithin(
      uri,
      image,
      THUMB_MAX_EDGE,
      THUMB_QUALITIES,
      CHAT_MEDIA_THUMB_MAX_BYTES,
      temporary
    );
    const blurhash = await Image.generateBlurhashAsync(thumb.uri, [4, 3]).catch(() => null);

    const localId = randomUUID();
    const fullUri = await files.keep(full.uri, `${localId}.jpg`);
    const thumbUri = await files.keep(thumb.uri, `${localId}-thumb.jpg`);

    return {
      localId,
      uri: fullUri,
      thumbUri,
      mime: MIME,
      thumbMime: MIME,
      size: full.size,
      thumbSize: thumb.size,
      width: full.width,
      height: full.height,
      blurhash: blurhash ?? undefined,
    };
  } finally {
    // Attempts that were too big, and the kept ones if moving them failed.
    for (const uri of temporary) {
      try {
        const file = new File(uri);
        if (file.exists) file.delete();
      } catch {
        // Cache files; the OS clears them eventually.
      }
    }
  }
}

/** Encodes at the best quality that fits `maxBytes`, shrinking the image if it must. */
async function encodeWithin(
  uri: string,
  image: ImageRef,
  maxEdge: number,
  qualities: number[],
  maxBytes: number,
  temporary: string[]
): Promise<Encoded> {
  let scale = Math.min(1, maxEdge / Math.max(image.width, image.height));

  for (let step = 0; step <= MAX_SHRINK_STEPS; step += 1) {
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const resized =
      scale < 1
        ? await ImageManipulator.manipulate(uri).resize({ width, height }).renderAsync()
        : image;

    for (const quality of qualities) {
      const saved = await resized.saveAsync({ format: SaveFormat.JPEG, compress: quality });
      temporary.push(saved.uri);
      const size = new File(saved.uri).size ?? Number.POSITIVE_INFINITY;
      if (size <= maxBytes)
        return { uri: saved.uri, width: saved.width, height: saved.height, size };
    }
    scale *= 0.75;
  }
  throw new ChatImageError('Ảnh này quá lớn để gửi.');
}
