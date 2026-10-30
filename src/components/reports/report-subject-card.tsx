import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import type { ReportTarget } from '@/types/reports';

/** What is reported: photo, kind, title and a line of context (canvas Report, card under the bar). */
export function ReportSubjectCard({
  target,
}: {
  target: Pick<ReportTarget, 'label' | 'title' | 'meta' | 'coverUrl'>;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-[#F7F9FB] p-3">
      <View className="h-14 w-12 overflow-hidden rounded-xl bg-[#DCEBFB]">
        {target.coverUrl ? (
          <Image
            source={{ uri: target.coverUrl }}
            style={{ width: 48, height: 56 }}
            contentFit="cover"
          />
        ) : null}
      </View>
      <View className="min-w-0 flex-1 gap-[3px]">
        <AppText className="text-[12px] font-vn-semibold text-[#5A6772]">{target.label}</AppText>
        <AppText numberOfLines={1} className="text-[14px] font-vn-semibold">
          {target.title}
        </AppText>
        <AppText className="text-[12.5px] text-[#33414D]">{target.meta}</AppText>
      </View>
    </View>
  );
}
