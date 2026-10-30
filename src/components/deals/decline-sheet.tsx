import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useDealActions } from '@/hooks/useDealActions';
import { DEAL_DECLINE_REASONS, DEAL_DECLINE_REASON_MAX_LENGTH } from '@/services/deals/offer-rules';

/**
 * Declining an offer: the reason is optional, a quick one or the owner's own words, and goes to
 * the asker as a message. No penalty.
 */
export function DeclineSheet({
  offerId,
  askerName,
  onClose,
}: {
  offerId: string;
  askerName: string;
  onClose: () => void;
}) {
  const actions = useDealActions();
  const [quick, setQuick] = useState<string | null>(null);
  const [own, setOwn] = useState('');
  const ownText = own.trim();
  const reason = ownText || quick || undefined;

  async function submit() {
    if (actions.busy) return;
    if (await actions.decline(offerId, reason)) onClose();
  }

  return (
    <BottomSheet title="Từ chối đề nghị" onClose={onClose}>
      <AppText className="-mt-1 text-[13.5px] text-[#5A6772]">
        {askerName} sẽ nhận được lý do trong chat. Bạn có thể bỏ qua.
      </AppText>
      <View className="flex-row flex-wrap gap-2">
        {DEAL_DECLINE_REASONS.map((entry) => {
          const on = quick === entry && !ownText;
          return (
            <Pressable
              key={entry}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => {
                setQuick(quick === entry ? null : entry);
                setOwn('');
              }}
              className={`h-9 justify-center rounded-full border-[1.5px] px-3.5 ${
                on ? 'border-[#1673D9] bg-[#E6F1FF]' : 'border-[#D5DDE5] bg-white'
              }`}
            >
              <AppText className={`text-[13.5px] font-vn-semibold ${on ? 'text-[#0B4A99]' : ''}`}>
                {entry}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={own}
        onChangeText={setOwn}
        maxLength={DEAL_DECLINE_REASON_MAX_LENGTH}
        placeholder="Hoặc tự viết lý do…"
        placeholderTextColor="#8896A3"
        accessibilityLabel="Lý do từ chối"
        className="h-12 rounded-[14px] border-[1.5px] border-[#D5DDE5] bg-white px-3.5 font-vn text-[15px] text-[#0F2440]"
      />
      <View className="flex-row gap-2.5">
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          className="h-[50px] flex-1 items-center justify-center rounded-[14px] bg-[#F1F7FE]"
        >
          <AppText className="text-[15px] font-vn-semibold">Huỷ</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={actions.busy}
          onPress={() => void submit()}
          style={{ flex: 1.4 }}
          className={`h-[50px] items-center justify-center rounded-[14px] bg-[#B42318] ${
            actions.busy ? 'opacity-60' : ''
          }`}
        >
          <AppText className="text-[15px] font-vn-bold text-white">
            {actions.busy ? 'Đang gửi…' : 'Từ chối'}
          </AppText>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
