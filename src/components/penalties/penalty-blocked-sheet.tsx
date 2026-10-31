import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { PenaltyCardSwatch } from '@/components/penalties/penalty-card-swatch';
import { AppText } from '@/components/ui/app-text';
import { SheetModal } from '@/components/ui/sheet-modal';
import { blockedCopy, PENALTY_LOOK } from '@/services/penalties/penalty-rules';
import type { ActiveCard, PenaltyAction } from '@/types/penalties';

/**
 * What a blocked action says (canvas Penalty, view "blocked"): the card, until when, and what to
 * do instead. The action stays visible in the app; tapping it opens this.
 */
export function PenaltyBlockedSheet({
  card,
  action,
  onChat,
  onClose,
}: {
  card: ActiveCard;
  action: PenaltyAction;
  onChat?: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const copy = blockedCopy(card, action);

  function primary() {
    onClose();
    if (copy.go === 'stock') router.push('/stock');
    else onChat?.();
  }

  return (
    <SheetModal
      onClose={onClose}
      header={
        <View className="pb-3.5">
          <View className="flex-row items-start gap-3.5">
            <View style={{ marginTop: 2 }}>
              <PenaltyCardSwatch
                color={PENALTY_LOOK[card.kind].color}
                width={34}
                height={46}
                radius={5}
                margin={4}
                shadow="soft"
              />
            </View>
            <View className="flex-1 gap-1.5">
              <AppText
                accessibilityRole="header"
                className="text-[19px] font-vn-bold leading-[24.7px]"
              >
                {copy.title}
              </AppText>
              <AppText className="text-[14px] leading-[21.7px] text-[#33414D]">{copy.body}</AppText>
            </View>
          </View>
        </View>
      }
    >
      <View className="gap-2.5">
        <Pressable
          accessibilityRole="button"
          onPress={primary}
          className="h-[50px] items-center justify-center rounded-[14px] bg-[#1673D9]"
        >
          <AppText className="text-[15px] font-vn-bold text-white">{copy.cta}</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onClose();
            router.push({ pathname: '/penalty/[id]', params: { id: card.id } });
          }}
          className="h-[50px] items-center justify-center rounded-[14px] bg-[#F1F7FE]"
        >
          <AppText className="text-[15px] font-vn-semibold">Xem thẻ phạt</AppText>
        </Pressable>
      </View>
    </SheetModal>
  );
}
