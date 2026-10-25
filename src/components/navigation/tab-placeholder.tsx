import React from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui/app-text';

/** Stands in for a tab whose screens are not built yet. */
export function TabPlaceholder({ title }: { title: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <AppText className="text-[16px] font-vn-semibold">{title}</AppText>
    </View>
  );
}
