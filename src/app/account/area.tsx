import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { AreaStep } from '@/components/onboarding/area-step';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { useAuth } from '@/hooks/useAuth';
import {
  MY_ACCOUNT_QUERY_KEY,
  putMyArea,
  toOnboardingLocation,
} from '@/services/account/account-api';
import { MY_PROFILE_QUERY_KEY } from '@/services/profile/profile-api';
import type { ResolvedLocation } from '@/types/onboarding';

/** Pick the area shown on the public profile; reuses the area step of the start flow. */
export default function AccountAreaScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getIdToken } = useAuth();
  const [saving, setSaving] = useState(false);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/account');
  };

  async function save(location: ResolvedLocation) {
    setSaving(true);
    try {
      await putMyArea(await getIdToken(), toOnboardingLocation(location));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: MY_ACCOUNT_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY }),
      ]);
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
      header={<ScreenBar title="Khu vực" onBack={back} />}
      title="Khu vực của bạn"
      description="Người khác chỉ thấy phường/xã và tỉnh/thành, không thấy vị trí chính xác."
      submitLabel="Lưu"
      saving={saving}
      onBack={back}
      onPicked={save}
    />
  );
}
