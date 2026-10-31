import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { CoinIcon } from '@/components/icons/coin-icon';
import { AppText } from '@/components/ui/app-text';

type RewardsCardProps = { available: number; locked: number };

/** "Tiền thưởng" card of the Tôi tab: available balance, locked amount shown apart. */
export function RewardsCard({ available, locked }: RewardsCardProps) {
  const router = useRouter();
  return (
    <View className="mx-4 mt-3 gap-2.5 rounded-[20px] bg-[#FFF4D6] px-4 pb-4 pt-3.5">
      <View className="flex-row items-center justify-between gap-2.5">
        <AppText accessibilityRole="header" className="text-[13px] font-vn-semibold text-[#8A5A00]">
          Tiền thưởng
        </AppText>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Tìm hiểu thêm về tiền thưởng"
          onPress={() => router.push({ pathname: '/policies/[slug]', params: { slug: 'rewards' } })}
          hitSlop={8}
          className="min-h-11 justify-center"
        >
          <AppText className="text-[13px] font-vn-semibold text-[#8A5A00]">Tìm hiểu thêm</AppText>
        </Pressable>
      </View>
      <View className="flex-row flex-wrap gap-2.5">
        <View className="flex-row items-center gap-2.5 rounded-full bg-white py-2 pl-2 pr-3.5">
          <CoinIcon size={40} />
          <View className="flex-row items-baseline gap-1">
            <AppText className="text-[22px] font-vn-bold tracking-[-0.22px]">{available}</AppText>
            <AppText className="text-[13px] text-[#8A5A00]">đồng</AppText>
          </View>
        </View>
      </View>
      {locked > 0 ? (
        <AppText className="text-[12.5px] text-[#6B4E00]">
          Tạm khoá {locked} đồng, sẽ dùng được sau 7 ngày.
        </AppText>
      ) : null}
    </View>
  );
}
