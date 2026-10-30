import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { BarButton } from '@/components/ui/form-controls';
import { ICON_CLOSE, ICON_PENCIL, PathIcon } from '@/components/ui/path-icon';
import { useAuth } from '@/hooks/useAuth';
import {
  closeListing,
  MY_LISTINGS_QUERY_KEY,
  refreshListing,
} from '@/services/listings/listings-api';
import { MY_ITEMS_QUERY_KEY } from '@/services/stock/items-api';
import { LISTING_REFRESH_INTERVAL_DAYS, type ListingOwnerDetail } from '@/types/listings';
import { formatDayMonth, formatRelativeTime } from '@/utils/format';

const CLOSE_REASONS = ['Đã bán ở nơi khác', 'Không muốn bán nữa', 'Để đăng lại sau'];
const ICON_REFRESH = 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4';
const ICON_SHARE = 'M4 12v7h16v-7M12 3v12M7 8l5-5 5 5';

type OwnerMenuSheetProps = {
  tools: ListingOwnerDetail;
  /** Reads the listing page again after a refresh. */
  onChanged: () => void;
  onShare: () => void;
  onClose: () => void;
};

/** "Tuỳ chọn tin" of the listing's owner (canvas Detail): edit, refresh, share, close. */
export function OwnerMenuSheet({ tools, onChanged, onShare, onClose }: OwnerMenuSheetProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getIdToken } = useAuth();
  const [view, setView] = useState<'menu' | 'close'>('menu');
  const [reason, setReason] = useState<string | null>(null);

  const refresh = useMutation({
    mutationFn: async () => refreshListing(await getIdToken(), tools.id),
    onSuccess: async () => {
      onChanged();
      await queryClient.invalidateQueries({ queryKey: MY_LISTINGS_QUERY_KEY });
      onClose();
    },
    onError: (caught) => Alert.alert('Chưa làm mới được', caught.message || 'Thử lại sau.'),
  });

  const close = useMutation({
    mutationFn: async () => closeListing(await getIdToken(), tools.id, reason ?? undefined),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: MY_LISTINGS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MY_ITEMS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['item', tools.itemId] }),
      ]);
      onClose();
      router.replace({ pathname: '/listings/[id]', params: { id: tools.id } });
    },
    onError: (caught) => Alert.alert('Chưa đóng được tin', caught.message || 'Thử lại sau.'),
  });

  const isAuction = tools.type === 'auction';
  const lastRefresh = tools.nextRefreshAt
    ? formatRelativeTime(
        new Date(
          new Date(tools.nextRefreshAt).getTime() - LISTING_REFRESH_INTERVAL_DAYS * 86_400_000
        )
      )
    : null;
  const refreshSub = isAuction
    ? 'Không áp dụng cho đấu giá'
    : tools.canRefresh
      ? lastRefresh
        ? `Làm mới lần cuối: ${lastRefresh}`
        : 'Đưa tin lên đầu chợ'
      : `Làm mới lại được từ ${
          tools.nextRefreshAt ? formatDayMonth(new Date(tools.nextRefreshAt)) : 'sau'
        }`;

  if (view === 'close') {
    return (
      <BottomSheet title="Đóng tin này?" onClose={onClose}>
        <View className="gap-2">
          <AppText className="text-[13px] font-vn-semibold">
            Lý do{' '}
            <AppText className="text-[13px] text-[#5A6772]">
              (không bắt buộc, chỉ Trao thấy)
            </AppText>
          </AppText>
          <View className="flex-row flex-wrap gap-2">
            {CLOSE_REASONS.map((entry) => {
              const on = entry === reason;
              return (
                <Pressable
                  key={entry}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setReason(on ? null : entry)}
                  className={`h-9 justify-center rounded-full border-[1.5px] px-3 ${
                    on ? 'border-[#1673D9] bg-[#E6F1FF]' : 'border-[#D5DDE5] bg-white'
                  }`}
                >
                  <AppText className="text-[13.5px] font-vn-semibold">{entry}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
        <AppText className="text-[14px] leading-[21.7px] text-[#33414D]">
          {tools.pendingOffers > 0
            ? `${tools.pendingOffers} đề nghị đang chờ sẽ tự bị từ chối, người đề nghị nhận thông báo. `
            : ''}
          Đồ vẫn ở Kho đồ, đăng lại lúc nào cũng được.
        </AppText>
        <View className="flex-row gap-2.5">
          <BarButton label="Giữ tin" tone="tinted" onPress={onClose} />
          <BarButton
            label="Đóng tin"
            tone="danger"
            flex={1.4}
            loading={close.isPending}
            onPress={() => close.mutate()}
          />
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet title="Tuỳ chọn tin" onClose={onClose}>
      <View className="-mx-2">
        <Row
          label="Sửa tin"
          sub={tools.canEdit ? 'Sửa ảnh, mô tả, giá' : (tools.editBlockedReason ?? undefined)}
          icon={ICON_PENCIL}
          disabled={!tools.canEdit}
          onPress={() => {
            onClose();
            router.push({ pathname: '/listings/[id]/edit', params: { id: tools.id } });
          }}
        />
        <Row
          label="Làm mới tin"
          sub={refreshSub}
          icon={ICON_REFRESH}
          disabled={!tools.canRefresh || refresh.isPending}
          onPress={() => refresh.mutate()}
        />
        <Row
          label="Chia sẻ tin"
          sub="Gửi link tin cho bạn bè"
          icon={ICON_SHARE}
          onPress={() => {
            onClose();
            onShare();
          }}
        />
        <Row
          label="Đóng tin"
          sub={
            tools.canClose
              ? 'Gỡ tin khỏi chợ, đồ vẫn ở Kho đồ'
              : (tools.closeBlockedReason ?? undefined)
          }
          icon={ICON_CLOSE}
          danger
          disabled={!tools.canClose}
          onPress={() => setView('close')}
        />
      </View>
    </BottomSheet>
  );
}

function Row(props: {
  label: string;
  sub?: string;
  icon: string;
  disabled?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  const { label, sub, icon, disabled, danger, onPress } = props;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center gap-3.5 rounded-xl px-2 py-3 ${disabled ? 'opacity-45' : ''}`}
    >
      <View
        className="h-[38px] w-[38px] items-center justify-center rounded-[11px]"
        style={{ backgroundColor: danger ? '#FDECEA' : '#F1F7FE' }}
      >
        <PathIcon d={icon} size={19} color={danger ? '#B42318' : '#1673D9'} />
      </View>
      <View className="flex-1 gap-px">
        <AppText
          className="text-[15px] font-vn-semibold"
          style={{ color: danger ? '#B42318' : '#0F2440' }}
        >
          {label}
        </AppText>
        {sub ? <AppText className="text-[12.5px] text-[#5A6772]">{sub}</AppText> : null}
      </View>
    </Pressable>
  );
}
