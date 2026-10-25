import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { apiRequest } from './api';
import { fileUploadTransport } from './chat/file-upload-transport';

/** The server accepts avatars up to 1 MB. */
const AVATAR_MAX_BYTES = 1024 * 1024;
const AVATAR_EDGE = 512;
const AVATAR_QUALITIES = [0.85, 0.7, 0.5];
const MIME = 'image/jpeg';

export type AvatarSource = 'camera' | 'library';

/**
 * Lets the user take or choose a square photo. Resolves to the local file, or null when
 * cancelled or the camera is not allowed (the user is told how to allow it).
 */
/** The camera was refused; after "don't ask again" only the system settings can grant it. */
export class CameraPermissionError extends Error {
  constructor(readonly canAskAgain: boolean) {
    super('Chưa mở được máy ảnh');
    this.name = 'CameraPermissionError';
  }
}

export async function pickAvatar(source: AvatarSource): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
    exif: false,
  };

  if (source === 'library') {
    const result = await ImagePicker.launchImageLibraryAsync(options);
    return result.canceled ? null : (result.assets[0]?.uri ?? null);
  }

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new CameraPermissionError(permission.canAskAgain);
  const result = await ImagePicker.launchCameraAsync(options);
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

/** Re-encodes the photo as a small JPEG (also drops EXIF/GPS) that fits the avatar limit. */
async function prepareAvatar(uri: string): Promise<{ uri: string; size: number }> {
  let image;
  try {
    image = await ImageManipulator.manipulate(uri).renderAsync();
  } catch {
    throw new Error('Không đọc được ảnh này.');
  }

  let edge = Math.min(AVATAR_EDGE, image.width, image.height);
  for (let step = 0; step < 4; step += 1) {
    const resized = await ImageManipulator.manipulate(uri)
      .resize(image.width <= image.height ? { width: edge } : { height: edge })
      .renderAsync();
    for (const quality of AVATAR_QUALITIES) {
      const saved = await resized.saveAsync({ format: SaveFormat.JPEG, compress: quality });
      const size = new File(saved.uri).size ?? Number.POSITIVE_INFINITY;
      if (size <= AVATAR_MAX_BYTES) return { uri: saved.uri, size };
    }
    edge = Math.round(edge * 0.75);
  }
  throw new Error('Ảnh này quá lớn.');
}

type UploadUrlResult = { uploadUrl: string; key: string; publicUrl: string | null };

/** Uploads a picked photo as an avatar and returns its public URL; preset URLs pass through. */
export async function uploadAvatar(token: string, uri: string): Promise<string> {
  if (/^https?:/i.test(uri)) return uri;
  const prepared = await prepareAvatar(uri);
  const target = await apiRequest<UploadUrlResult>('/api/upload-url', {
    token,
    body: { uploadType: 'avatar', contentType: MIME, contentLength: prepared.size },
  });

  if (!target.publicUrl) throw new Error('Không tải được ảnh lên. Vui lòng thử lại.');

  try {
    await fileUploadTransport.put({ url: target.uploadUrl, uri: prepared.uri, contentType: MIME });
  } catch {
    throw new Error('Không tải được ảnh lên. Hãy kiểm tra mạng và thử lại.');
  }
  return target.publicUrl;
}
