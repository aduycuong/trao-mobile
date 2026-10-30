import { useState } from 'react';
import { Alert } from 'react-native';
import { REPORT_MAX_EVIDENCE } from '@/services/reports/report-rules';
import { pickScreenshots, uploadScreenshot } from '@/services/help/feedback-upload';

/**
 * The photos a person attaches to a report, a statement or an appeal: picked, shown, removable, and
 * uploaded all at once when the form is sent (`uploadAll` answers the keys to send).
 */
export function useEvidence(max = REPORT_MAX_EVIDENCE) {
  const [uris, setUris] = useState<string[]>([]);

  async function add() {
    const room = max - uris.length;
    if (room <= 0) {
      Alert.alert(`Chỉ đính kèm tối đa ${max} ảnh.`);
      return;
    }
    try {
      const picked = await pickScreenshots(room);
      if (picked.length > 0)
        setUris((current) =>
          [...current, ...picked.filter((uri) => !current.includes(uri))].slice(0, max)
        );
    } catch {
      Alert.alert('Không mở được thư viện ảnh', 'Hãy cho phép Trao xem ảnh trong cài đặt của máy.');
    }
  }

  function remove(uri: string) {
    setUris((current) => current.filter((item) => item !== uri));
  }

  async function uploadAll(token: string): Promise<string[]> {
    const keys: string[] = [];
    for (const uri of uris) keys.push(await uploadScreenshot(token, uri, 'evidence'));
    return keys;
  }

  return { uris, add, remove, uploadAll, canAdd: uris.length < max };
}
