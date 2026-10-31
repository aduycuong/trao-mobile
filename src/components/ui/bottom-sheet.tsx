import React from 'react';
import { ScrollView } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { SheetModal } from '@/components/ui/sheet-modal';

type BottomSheetProps = {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Bottom sheet of the item and listing screens (canvas StockItem, Post, Detail): dimmed backdrop,
 * handle, title. The handle and the title drag the sheet down to close it; the content scrolls.
 */
export function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  return (
    <SheetModal
      onClose={onClose}
      header={
        title ? (
          <AppText
            accessibilityRole="header"
            className="pb-3.5 text-[19px] font-vn-bold leading-[26px]"
          >
            {title}
          </AppText>
        ) : null
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-3.5"
      >
        {children}
      </ScrollView>
    </SheetModal>
  );
}
