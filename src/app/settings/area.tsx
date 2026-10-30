import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { AreaStep } from '@/components/onboarding/area-step';
import { useAuth } from '@/hooks/useAuth';
import {
  MY_SETTINGS_QUERY_KEY,
  patchMySettings,
  toOnboardingLocation,
} from '@/services/account/account-api';
import type { ResolvedLocation } from '@/types/onboarding';

/** Pick the default area used when location is off; reuses the area step of the start flow. */
export default function SettingsAreaScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getIdToken } = useAuth();
  const [saving, setSaving] = useState(false);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  async function save(location: ResolvedLocation) {
    setSaving(true);
    try {
      await patchMySettings(await getIdToken(), {
        defaultLocation: toOnboardingLocation(location),
      });
      await queryClient.invalidateQueries({ queryKey: MY_SETTINGS_QUERY_KEY });
      back();
    } catch (caught) {
      Alert.alert(
        'Không lưu được khu vực',
        caught instanceof Error ? caught.message : 'Thử lại sau.'
      );
      setSaving(false);
    }
  }

  return (
    <AreaStep
      header={<ScreenBar title="Khu vực mặc định" onBack={back} />}
      title="Khu vực mặc định"
      description="Dùng để xếp đồ gần bạn lên trước khi bạn không bật vị trí."
      submitLabel="Lưu"
      saving={saving}
      onBack={back}
      onPicked={save}
    />
  );
}
