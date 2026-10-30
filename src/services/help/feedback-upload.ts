import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '@/services/api';
import { fileUploadTransport } from '@/services/chat/file-upload-transport';

/** Screenshots are shown small, so a large one is scaled down before it is uploaded. */
const SCREENSHOT_MAX_EDGE = 1600;
const MIME = 'image/jpeg';

/** Lets the user choose up to `limit` screenshots; resolves to their local URIs. */
export async function pickScreenshots(limit: number): Promise<string[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 1,
    exif: false,
  });
  return result.canceled ? [] : result.assets.map((asset) => asset.uri);
}

type UploadUrlResult = { uploadUrl: string; key: string };

/** Re-encodes a screenshot as JPEG (dropping EXIF) and uploads it; resolves to its storage key. */
export async function uploadScreenshot(token: string, uri: string): Promise<string> {
  let prepared: { uri: string };
  try {
    const image = await ImageManipulator.manipulate(uri).renderAsync();
    const context = ImageManipulator.manipulate(uri);
    if (Math.max(image.width, image.height) > SCREENSHOT_MAX_EDGE) {
      context.resize(
        image.width >= image.height
          ? { width: SCREENSHOT_MAX_EDGE }
          : { height: SCREENSHOT_MAX_EDGE }
      );
    }
    const rendered = await context.renderAsync();
    prepared = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  } catch {
    throw new Error('Không đọc được ảnh này.');
  }

  const size = new File(prepared.uri).size ?? 0;
  const target = await apiRequest<UploadUrlResult>('/api/upload-url', {
    token,
    body: { uploadType: 'feedback', contentType: MIME, contentLength: size },
  });
  try {
    await fileUploadTransport.put({ url: target.uploadUrl, uri: prepared.uri, contentType: MIME });
  } catch {
    throw new Error('Không tải được ảnh lên. Hãy kiểm tra mạng và thử lại.');
  }
  return target.key;
}
