import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { UserAvatar } from '@/components/me/user-avatar';
import { ItemThumb } from '@/components/stock/item-thumb';
import { AppText } from '@/components/ui/app-text';
import {
  formatNotificationTime,
  NOTIFICATION_CTA_TONE,
  NOTIFICATION_TAG,
} from '@/services/notifications/notification-rules';
import type { NotificationItem } from '@/types/notifications';

function Visual({ item }: { item: NotificationItem }) {
  const { visual } = item;
  const tag = NOTIFICATION_TAG[item.group];

  return (
    <View className="h-12 w-12">
      {visual.kind === 'item' ? (
        <ItemThumb
          url={visual.coverUrl}
          categorySlug={visual.categorySlug}
          width={48}
          height={48}
          radius={12}
          iconSize={30}
        />
      ) : null}
      {visual.kind === 'person' ? (
        <UserAvatar name={visual.name} avatarUrl={null} size={48} textClassName="text-[16px]" />
      ) : null}
      {visual.kind === 'sys' ? (
        <View
          className="h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: visual.background }}
        >
          <Svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke={visual.ink}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d={visual.icon} />
          </Svg>
        </View>
      ) : null}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="absolute h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-white"
        style={{ right: -4, bottom: -4, backgroundColor: tag.color }}
      >
        <Svg
          width={11}
          height={11}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d={tag.icon} />
        </Svg>
      </View>
    </View>
  );
}

type NotificationRowProps = {
  item: NotificationItem;
  now: number;
  onOpen: (item: NotificationItem) => void;
};

/** One notification of the list (canvas Notifs): picture with the group mark, text, time, dot and quick action. */
export function NotificationRow({ item, now, onOpen }: NotificationRowProps) {
  const cta = item.cta ? NOTIFICATION_CTA_TONE[item.cta.tone] : null;

  return (
    <View className={`flex-row gap-3 px-4 py-3 ${item.read ? 'bg-white' : 'bg-[#F5F9FF]'}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.read ? '' : 'Chưa đọc. '}${item.title}. ${item.text}`}
        onPress={() => onOpen(item)}
        className="min-w-0 flex-1 flex-row gap-3"
      >
        <Visual item={item} />
        <View className="min-w-0 flex-1 gap-[3px]">
          <AppText
            className={`text-[14px] leading-[19.6px] ${item.read ? 'font-vn-semibold' : 'font-vn-bold'}`}
          >
            {item.title}
          </AppText>
          <AppText numberOfLines={2} className="text-[13px] leading-[18.2px] text-[#33414D]">
            {item.text}
          </AppText>
          <AppText className="text-[12px] text-[#A3AEB9]">
            {formatNotificationTime(item.createdAt, now)}
          </AppText>
        </View>
      </Pressable>
      <View className="items-end gap-2.5">
        {!item.read ? (
          <View
            accessibilityLabel="Chưa đọc"
            className="mt-1 h-[9px] w-[9px] rounded-full bg-[#1673D9]"
          />
        ) : null}
        {item.cta && cta ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onOpen(item)}
            className="h-8 items-center justify-center rounded-[10px] px-3"
            style={{ backgroundColor: cta.background }}
          >
            <AppText className="text-[13px] font-vn-bold" style={{ color: cta.color }}>
              {item.cta.label}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
