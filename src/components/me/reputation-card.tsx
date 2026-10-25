import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { CoinIcon } from '@/components/icons/coin-icon';
import { AppText } from '@/components/ui/app-text';
import type { MyProfile } from '@/types/profile';
import { ACTIVITY_LEVEL_LABELS, formatWarning } from '@/utils/format';

function Star({ fill }: { fill: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill={fill}>
      <Path d="M12 3l2.6 5.6 6 .7-4.4 4.1 1.1 6L12 16.5l-5.3 2.9 1.1-6-4.4-4.1 6-.7z" />
    </Svg>
  );
}

function VerifiedTick({ size, width }: { size: number; width: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={10} fill="#1673D9" />
      <Path
        d="M7.5 12.2l3 3 6-6.4"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export { VerifiedTick };

type Level = { label: string; value: string; verified?: boolean; note?: string; color?: string };

/** "Uy tín" card of the Tôi tab: rating, counters, the four levels, phone reminder. */
export function ReputationCard({ profile }: { profile: MyProfile }) {
  const router = useRouter();
  const hasRating = profile.ratingAverage !== null;
  const rounded = Math.round(profile.ratingAverage ?? 0);

  const levels: Level[] = [
    {
      label: 'Tài khoản',
      value: profile.accountLevel === 'verified' ? 'Đã xác thực' : 'Thành viên',
      verified: profile.accountLevel === 'verified',
    },
    { label: 'Thâm niên', value: profile.tenure.label, note: `từ ${profile.tenure.since}` },
    { label: 'Hoạt động', value: ACTIVITY_LEVEL_LABELS[profile.activityLevel] },
    {
      label: 'Cảnh báo',
      value: formatWarning(profile.warning),
      color: profile.warning ? (profile.warning.kind === 'red' ? '#B42318' : '#8A5A00') : undefined,
    },
  ];

  return (
    <View className="mx-4 mt-4 gap-3.5 rounded-[20px] bg-[#F1F7FE] p-4">
      <View className="gap-0.5">
        <AppText accessibilityRole="header" className="text-[13px] font-vn-semibold text-[#5A6772]">
          Uy tín
        </AppText>
        <View className="flex-row items-baseline gap-2">
          <AppText className="text-[34px] font-vn-bold leading-[37px] tracking-[-0.68px]">
            {hasRating ? profile.ratingAverage!.toFixed(1) : '–'}
          </AppText>
          <View className="flex-row gap-px">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} fill={hasRating && n <= rounded ? '#FFC22E' : '#D5DDE5'} />
            ))}
          </View>
          <AppText className="ml-auto text-[12.5px] font-vn-medium text-[#1673D9]">
            {profile.ratingCount} đánh giá
          </AppText>
        </View>
      </View>

      <View className="flex-row gap-2">
        <View className="flex-1 gap-0.5 rounded-xl bg-white px-3 py-2.5">
          <AppText className="text-[17px] font-vn-bold">{profile.completedCount}</AppText>
          <AppText className="text-[12px] leading-[16px] text-[#5A6772]">
            giao dịch thành công
          </AppText>
        </View>
        <View className="flex-1 gap-0.5 rounded-xl bg-white px-3 py-2.5">
          <AppText className="text-[17px] font-vn-bold">{profile.cancelRatePercent ?? 0}%</AppText>
          <AppText className="text-[12px] leading-[16px] text-[#5A6772]">tỉ lệ huỷ</AppText>
        </View>
      </View>

      <View className="rounded-xl bg-white px-3 py-1">
        {levels.map((level, index) => (
          <View
            key={level.label}
            className={`min-h-10 flex-row items-center justify-between gap-2.5 ${
              index ? 'border-t border-[#EEF2F6]' : ''
            }`}
          >
            <AppText className="text-[13px] text-[#5A6772]">{level.label}</AppText>
            <View className="flex-row items-center gap-1.5">
              {level.verified ? <VerifiedTick size={15} width={2.6} /> : null}
              <AppText
                className="text-[13.5px] font-vn-semibold"
                style={level.color ? { color: level.color } : undefined}
              >
                {level.value}
                {level.note ? (
                  <AppText className="text-[13.5px] text-[#5A6772]"> · {level.note}</AppText>
                ) : null}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      {profile.phoneVerified ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/verify-phone')}
          className="flex-row items-center gap-3 rounded-[14px] bg-[#1673D9] p-3"
        >
          <View
            className="h-[38px] w-[38px] items-center justify-center rounded-[11px]"
            style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
          >
            <Svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M7 2.5h10a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V4A1.5 1.5 0 0 1 7 2.5zM10.5 18.5h3" />
            </Svg>
          </View>
          <View className="min-w-0 flex-1 gap-0.5">
            <AppText className="text-[15px] font-vn-semibold text-white">
              Xác minh số điện thoại
            </AppText>
            <View className="flex-row flex-wrap items-center gap-1">
              <AppText className="text-[12.5px] leading-[17.5px] text-[#D6E8FC]">
                Giao dịch được nhiều hơn và nhận 5
              </AppText>
              <CoinIcon size={15} />
              <AppText className="text-[12.5px] leading-[17.5px] text-[#D6E8FC]">
                tiền thưởng
              </AppText>
            </View>
          </View>
          <Svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M9 6l6 6-6 6" />
          </Svg>
        </Pressable>
      )}
    </View>
  );
}
