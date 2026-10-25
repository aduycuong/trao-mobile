import { File, UploadType } from 'expo-file-system';
import { UploadTransportError, type UploadTransport } from '@/types/chat';

/**
 * Mobile `UploadTransport`: the native upload of expo-file-system, which streams
 * the file from disk (no blob in JS memory) and reports progress. Storage URLs
 * are signed for the content type, so the header must match it exactly.
 */
export const fileUploadTransport: UploadTransport = {
  async put({ url, uri, contentType, onProgress, signal }) {
    const file = new File(uri);
    if (!file.exists) throw new UploadTransportError('Ảnh không còn trên máy.', 410);

    let result: { status: number };
    try {
      result = await file.upload(url, {
        httpMethod: 'PUT',
        uploadType: UploadType.BINARY_CONTENT,
        headers: { 'Content-Type': contentType },
        mimeType: contentType,
        onProgress: ({ bytesSent }) => onProgress?.(bytesSent),
        sessionType: 'foreground',
        signal,
      });
    } catch (error) {
      throw new UploadTransportError(error instanceof Error ? error.message : 'Network error');
    }

    if (result.status < 200 || result.status >= 300) {
      throw new UploadTransportError(`Upload failed (${result.status})`, result.status);
    }
    onProgress?.(file.size ?? 0);
  },
};
