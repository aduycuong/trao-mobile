import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Checkbox } from '@/components/ui/form-controls';
import { useTransactionActions } from '@/hooks/useTransactionActions';
import {
  TRANSACTION_CANCEL_NOTE_MAX_LENGTH,
  TRANSACTION_CANCEL_REASONS,
} from '@/services/transactions/transaction-rules';
import type { TransactionCancelReason } from '@/types/deals';

/**
 * Cancelling a deal in progress (canvas Chat, hộp huỷ): a reason, an optional note and the warning
 * that Trao may give a Yellow card after looking at both sides.
 */
export function CancelSheet({
  transactionId,
  otherName,
  onClose,
}: {
  transactionId: string;
  otherName: string;
  onClose: () => void;
}) {
  const actions = useTransactionActions();
  const [reason, setReason] = useState<TransactionCancelReason | null>(null);
  const [note, setNote] = useState('');
  const [aware, setAware] = useState(false);
  const ready = reason !== null && aware;

  async function submit() {
    if (!ready || actions.busy) return;
    if (await actions.cancel(transactionId, { reason, note: note.trim() || undefined })) onClose();
  }

  return (
    <BottomSheet title="Huỷ giao dịch?" onClose={onClose}>
      <View className="gap-2">
        <AppText className="text-[13px] font-vn-semibold">Lý do</AppText>
        <View className="flex-row flex-wrap gap-2">
          {TRANSACTION_CANCEL_REASONS.map((entry) => {
            const on = reason === entry.code;
            return (
              <Pressable
                key={entry.code}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setReason(entry.code)}
                className={`h-[34px] justify-center rounded-full border-[1.5px] px-3 ${
                  on ? 'border-[#1673D9] bg-[#E6F1FF]' : 'border-[#D5DDE5] bg-white'
                }`}
              >
                <AppText className={`text-[13.5px] font-vn-semibold ${on ? 'text-[#0B4A99]' : ''}`}>
                  {entry.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={note}
          onChangeText={setNote}
          maxLength={TRANSACTION_CANCEL_NOTE_MAX_LENGTH}
          multiline
          accessibilityLabel="Ghi chú thêm"
          placeholder="Ghi chú thêm (không bắt buộc)"
          placeholderTextColor="#8896A3"
          textAlignVertical="top"
          className="min-h-14 rounded-xl bg-[#F2F5F8] px-3.5 py-3 font-vn text-[14px] text-[#0F2440]"
        />
      </View>

      <View className="flex-row gap-2.5 rounded-[14px] border border-[#F5DE9A] bg-[#FFF4D6] px-3.5 py-3">
        <View
          className="mt-px h-6 w-[18px] rounded-[3px] bg-[#FFC22E]"
          style={{ transform: [{ rotate: '-8deg' }] }}
        />
        <AppText className="min-w-0 flex-1 text-[13.5px] leading-[21px] text-[#3D2A00]">
          <AppText className="text-[13.5px] font-vn-bold text-[#3D2A00]">
            Có thể bị thẻ Vàng.
          </AppText>{' '}
          Trao xem lý do và báo cáo của hai bên rồi mới quyết. Bị thẻ Vàng thì 1 tháng không đăng
          tin mới được; thêm thẻ Vàng trong thời gian đó thành thẻ Đỏ. Nếu lỗi ở {otherName}, bạn sẽ
          không bị phạt.
        </AppText>
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: aware }}
        onPress={() => setAware((on) => !on)}
        className="flex-row items-start gap-2.5"
      >
        <Checkbox on={aware} />
        <AppText className="min-w-0 flex-1 text-[13.5px] leading-[20px]">
          Tôi đã biết việc huỷ có thể bị thẻ Vàng sau khi Trao xem xét.
        </AppText>
      </Pressable>

      <View className="flex-row gap-2.5">
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          className="h-[50px] flex-1 items-center justify-center rounded-[14px] bg-[#F1F7FE]"
        >
          <AppText className="text-[15px] font-vn-semibold">Đóng</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!ready || actions.busy}
          onPress={() => void submit()}
          style={{ flex: 1.4 }}
          className={`h-[50px] items-center justify-center rounded-[14px] bg-[#B42318] ${
            !ready || actions.busy ? 'opacity-50' : ''
          }`}
        >
          <AppText className="text-[15px] font-vn-bold text-white">
            {actions.busy ? 'Đang huỷ…' : 'Huỷ giao dịch'}
          </AppText>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
