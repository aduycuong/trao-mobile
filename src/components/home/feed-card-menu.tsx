import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { PathIcon } from '@/components/ui/path-icon';
import type { FeedCard } from '@/types/feed';

type FeedCardMenuProps = {
  card: FeedCard;
  onClose: () => void;
  onHide: (kind: 'listing' | 'seller') => void;
};

const ROWS = [
  {
    kind: 'listing',
    label: 'Không quan tâm',
    sub: 'Ẩn tin này khỏi Trang chủ và tìm kiếm',
    d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8',
  },
  {
    kind: 'seller',
    label: 'Ẩn người bán',
    sub: 'Không hiện tin của người này nữa',
    d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0M3 3l18 18',
  },
] as const;

/**
 * Menu of a card on Home: "Không quan tâm", "Ẩn người bán", "Vì sao tôi thấy món này" and
 * "Báo cáo" (reports come in part 8, so it is drawn locked).
 */
export function FeedCardMenu({ card, onClose, onHide }: FeedCardMenuProps) {
  const [showReason, setShowReason] = useState(false);

  if (showReason) {
    return (
      <BottomSheet title="Vì sao tôi thấy món này" onClose={onClose}>
        <AppText className="text-[14.5px] leading-[22.5px] text-[#33414D]">{card.reason}.</AppText>
        <AppText className="text-[13px] leading-[19.5px] text-[#5A6772]">
          Trang chủ hiện tin mới và đang sôi động cho mọi người. Đồ bạn mở, danh mục bạn quan tâm và
          người bạn follow giúp gợi ý sát hơn.
        </AppText>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          className="h-[50px] items-center justify-center rounded-[14px] bg-[#F1F7FE]"
        >
          <AppText className="text-[15px] font-vn-semibold">Đã hiểu</AppText>
        </Pressable>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet title={card.title} onClose={onClose}>
      <View>
        {ROWS.map((row) => (
          <MenuRow
            key={row.kind}
            label={row.label}
            sub={row.sub}
            d={row.d}
            onPress={() => onHide(row.kind)}
          />
        ))}
        <MenuRow
          label="Vì sao tôi thấy món này"
          d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01"
          onPress={() => setShowReason(true)}
        />
        <MenuRow label="Báo cáo" sub="Sắp có" d="M5 21V4M5 4h11l-2 4 2 4H5" locked />
      </View>
    </BottomSheet>
  );
}

function MenuRow({
  label,
  sub,
  d,
  onPress,
  locked,
}: {
  label: string;
  sub?: string;
  d: string;
  onPress?: () => void;
  locked?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: locked }}
      disabled={locked}
      onPress={onPress}
      className={`min-h-14 flex-row items-center gap-3 ${locked ? 'opacity-50' : ''}`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#F1F7FE]">
        <PathIcon d={d} size={20} color="#1673D9" strokeWidth={1.9} />
      </View>
      <View className="min-w-0 flex-1 gap-px">
        <AppText className="text-[15px] font-vn-semibold">{label}</AppText>
        {sub ? <AppText className="text-[12.5px] text-[#5A6772]">{sub}</AppText> : null}
      </View>
    </Pressable>
  );
}
