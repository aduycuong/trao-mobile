import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/app-text';

type BottomSheetProps = {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

/** Bottom sheet of the item and listing screens (canvas StockItem, Post, Detail): dimmed backdrop, handle, title. */
export function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end"
      >
        <Pressable
          accessibilityLabel="Đóng"
          onPress={onClose}
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(15,36,64,0.45)' }}
        />
        <View
          accessibilityViewIsModal
          className="max-h-[88%] rounded-t-[26px] bg-white px-5 pt-2.5"
          style={{ paddingBottom: 22 + insets.bottom }}
        >
          <View className="mb-3.5 h-1 w-10 self-center rounded-full bg-[#D5DCE3]" />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gap-3.5"
          >
            {title ? (
              <AppText
                accessibilityRole="header"
                className="text-[19px] font-vn-bold leading-[26px]"
              >
                {title}
              </AppText>
            ) : null}
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
