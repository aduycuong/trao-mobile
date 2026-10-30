import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { PenaltyCardSwatch } from '@/components/penalties/penalty-card-swatch';
import { AppText } from '@/components/ui/app-text';
import { ICON_CHEVRON_RIGHT, PathIcon } from '@/components/ui/path-icon';
import { useActiveCard } from '@/hooks/usePenaltyGuard';
import { bannerSub } from '@/services/penalties/penalty-rules';
import { formatDayMonth } from '@/utils/format';

/** "Thẻ Vàng · đến 20/11" on Home while the user is under a card (canvas Main, block `pen`). */
export function PenaltyBanner() {
  const router = useRouter();
  const card = useActiveCard();
  if (!card) return null;
  const red = card.kind === 'red';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/penalty/[id]', params: { id: card.id } })}
      className="mx-4 mb-4 flex-row items-center gap-3 rounded-2xl border px-3.5 py-3"
      style={{
        backgroundColor: red ? '#FDECEA' : '#FFF4D6',
        borderColor: red ? '#F6C9C4' : '#F5DE9A',
      }}
    >
      <PenaltyCardSwatch
        color={red ? '#E5342B' : '#FFC22E'}
        width={22}
        height={30}
        radius={4}
        margin={2}
        shadow="tiny"
      />
      <View className="min-w-0 flex-1 gap-0.5">
        <AppText className="text-[14px] font-vn-bold">
          {red ? 'Thẻ Đỏ' : 'Thẻ Vàng'} · đến {formatDayMonth(new Date(card.endsAt))}
        </AppText>
        <AppText className="text-[12.5px] leading-[17.5px] text-[#33414D]">
          {bannerSub(card.kind)}
        </AppText>
      </View>
      <PathIcon d={ICON_CHEVRON_RIGHT} size={18} color="#5A6772" strokeWidth={2.2} />
    </Pressable>
  );
}
