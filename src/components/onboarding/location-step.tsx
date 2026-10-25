import * as Location from 'expo-location';
import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AuthError } from '@/components/auth/auth-ui';
import { CatIcon } from '@/components/icons/cat-icon';
import { AppText } from '@/components/ui/app-text';
import { reverseGeocode } from '@/services/onboarding/onboarding-api';
import type { ResolvedLocation } from '@/types/onboarding';
import { FooterButton, OnboardingBar } from './onboarding-ui';

type LocationStepProps = {
  onBack: () => void;
  /** Go on without an area. */
  onSkip: () => void;
  /** Device position found. */
  onLocated: (location: ResolvedLocation) => void;
  /** Type an area instead. */
  onPickArea: () => void;
};

function MapArt() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="h-[180px] w-[220px] overflow-hidden rounded-[28px] bg-[#E6F1FF]"
    >
      <View
        className="absolute bg-white"
        style={{ left: -20, top: 70, width: 270, height: 14, transform: [{ rotate: '-12deg' }] }}
      />
      <View
        className="absolute bg-white"
        style={{ left: 120, top: -10, width: 14, height: 220, transform: [{ rotate: '18deg' }] }}
      />
      <View
        className="absolute rounded-full"
        style={{
          left: 55,
          top: 35,
          width: 110,
          height: 110,
          backgroundColor: 'rgba(22,115,217,0.15)',
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: '#64AEF7',
        }}
      />
      <View className="absolute" style={{ left: 83, top: 52 }}>
        <Svg width={54} height={54} viewBox="0 0 24 24">
          <Path d="M12 22s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12z" fill="#F0533A" />
          <Circle cx={12} cy={10} r={2.6} fill="#FFFFFF" />
        </Svg>
      </View>
      <View
        className="absolute h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-white"
        style={{ left: 28, top: 30 }}
      >
        <CatIcon kind="phone" size={22} />
      </View>
      <View
        className="absolute h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-white"
        style={{ right: 26, bottom: 26 }}
      >
        <CatIcon kind="gift" size={22} />
      </View>
    </View>
  );
}

export function LocationStep({ onBack, onSkip, onLocated, onPickArea }: LocationStepProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function useDeviceLocation() {
    setError(null);
    setBusy(true);
    try {
      // The system shows its own permission prompt here.
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        onPickArea();
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      onLocated(
        await reverseGeocode({ lat: position.coords.latitude, lng: position.coords.longitude })
      );
    } catch {
      setError('Không xác định được khu vực ở vị trí này. Thử lại hoặc tự nhập khu vực.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-white">
      <OnboardingBar index={0} onBack={onBack} onSkip={onSkip} />
      <View className="flex-1 items-center px-7 pt-6">
        <MapArt />
        <AppText className="mt-7 text-center text-[23px] font-vn-bold leading-[30px]">
          Xem đồ gần bạn trước
        </AppText>
        <AppText className="mt-2.5 text-center text-[14.5px] leading-[23px] text-[#33414D]">
          Trao dùng vị trí để xếp món gần bạn lên trước và tính khoảng cách. Người khác chỉ thấy
          phường/xã và tỉnh/thành, không thấy vị trí chính xác.
        </AppText>
        {error ? (
          <View className="mt-4 w-full">
            <AuthError>{error}</AuthError>
          </View>
        ) : null}
      </View>
      <View className="gap-2.5 px-6 pb-7 pt-4">
        <FooterButton
          label={busy ? 'Đang xác định vị trí…' : 'Cho phép dùng vị trí'}
          disabled={busy}
          onPress={useDeviceLocation}
        />
        <FooterButton
          variant="outline"
          label="Tự nhập khu vực"
          disabled={busy}
          onPress={onPickArea}
        />
      </View>
    </View>
  );
}
