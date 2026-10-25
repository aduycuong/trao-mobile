import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/app-text';

type ConfirmSheetProps = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Red confirm button, for sign out and delete. Blue otherwise. */
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

/** Bottom sheet that asks before an action (canvas MeLogout). */
export function ConfirmSheet({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Huỷ',
  destructive,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityLabel="Đóng"
          onPress={onCancel}
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(15,36,64,0.5)' }}
        />
        <View
          accessibilityViewIsModal
          className="gap-3.5 rounded-t-[26px] bg-white px-5 pt-2.5"
          style={{ paddingBottom: 24 + insets.bottom }}
        >
          <View className="h-[5px] w-10 self-center rounded-full bg-[#D5DDE5]" />
          <AppText className="mt-1 text-[19px] font-vn-bold">{title}</AppText>
          <AppText className="text-[14px] leading-[21px] text-[#33414D]">{description}</AppText>
          <View className="gap-2.5 pt-1">
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={confirm}
              className={`h-[50px] items-center justify-center rounded-[14px] ${
                destructive ? 'bg-[#B42318]' : 'bg-[#1673D9]'
              } ${busy ? 'opacity-60' : ''}`}
            >
              <AppText className="text-[15px] font-vn-semibold text-white">{confirmLabel}</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onCancel}
              className="h-[50px] items-center justify-center rounded-[14px] bg-[#F1F7FE]"
            >
              <AppText className="text-[15px] font-vn-semibold">{cancelLabel}</AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
