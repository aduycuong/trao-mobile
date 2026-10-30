import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useDealActions } from '@/hooks/useDealActions';
import { bidError, quickBids } from '@/services/auctions/auction-rules';
import { formatVnd } from '@/utils/format';

type BidSheetProps = {
  listing: { id: string; title: string };
  /** The lowest bid now: the starting price before the first bid, else the price plus the step. */
  minimum: number;
  step: number;
  currentPrice: number;
  bidCount: number;
  onClose: () => void;
};

/**
 * Placing a bid (canvas Detail, Đặt giá): the price now, the lowest bid, a box with the lowest bid
 * ready and quick steps above it. A bid is a promise and cannot be taken back.
 */
export function BidSheet({
  listing,
  minimum,
  step,
  currentPrice,
  bidCount,
  onClose,
}: BidSheetProps) {
  const actions = useDealActions();
  const [digits, setDigits] = useState(String(minimum));
  const amount = Number(digits || 0);
  const error = bidError(digits, minimum);
  const valid = digits !== '' && !error;

  async function submit() {
    if (!valid || actions.busy) return;
    if (await actions.bid(listing.id, amount)) onClose();
  }

  return (
    <BottomSheet title="Đặt giá" onClose={onClose}>
      <AppText numberOfLines={1} className="-mt-1 text-[14px] text-[#5A6772]">
        {listing.title}
      </AppText>
      <View className="flex-row items-end justify-between gap-2 rounded-2xl bg-[#F1F7FE] px-3.5 py-3">
        <View className="gap-0.5">
          <AppText className="text-[12.5px] text-[#5A6772]">
            {bidCount > 0
              ? `Giá hiện tại · ${bidCount} lượt đặt`
              : 'Chưa có lượt đặt · giá khởi điểm'}
          </AppText>
          <AppText className="text-[22px] font-vn-bold text-[#1673D9]">
            {formatVnd(currentPrice)}
          </AppText>
        </View>
        <AppText className="text-[12.5px] text-[#5A6772]">Bước giá {formatVnd(step)}</AppText>
      </View>

      <View className="h-[54px] flex-row items-center gap-2 rounded-[14px] border-[1.5px] border-[#D5DDE5] bg-white px-3.5">
        <TextInput
          keyboardType="number-pad"
          autoFocus
          value={digits ? Number(digits).toLocaleString('vi-VN') : ''}
          onChangeText={(text) => setDigits(text.replace(/\D/g, '').slice(0, 10))}
          accessibilityLabel="Giá đặt"
          className="min-w-0 flex-1 font-vn-bold text-[18px] text-[#0F2440]"
        />
        <AppText className="text-[15px] font-vn-semibold text-[#5A6772]">đ</AppText>
      </View>
      {error ? <AppText className="-mt-1 text-[12.5px] text-[#B42318]">{error}</AppText> : null}
      <View className="flex-row flex-wrap gap-2">
        {quickBids(minimum, step).map((value) => {
          const on = amount === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              onPress={() => setDigits(String(value))}
              className={`h-9 justify-center rounded-full border-[1.5px] px-3.5 ${
                on ? 'border-[#1673D9] bg-[#E6F1FF]' : 'border-[#D5DDE5] bg-white'
              }`}
            >
              <AppText className={`text-[13.5px] font-vn-semibold ${on ? 'text-[#0B4A99]' : ''}`}>
                {formatVnd(value)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <AppText className="rounded-xl bg-[#FFF4D6] px-3.5 py-2.5 text-[13px] leading-[19.5px] text-[#3D2A00]">
        Đặt giá là cam kết, không huỷ được. Muốn đổi giá thì đặt giá cao hơn. Bạn thắng nếu giá của
        bạn cao nhất khi hết giờ.
      </AppText>

      <Pressable
        accessibilityRole="button"
        disabled={!valid || actions.busy}
        onPress={() => void submit()}
        className={`h-[50px] items-center justify-center rounded-[14px] ${
          !valid || actions.busy ? 'bg-[#9CC3F0]' : 'bg-[#1673D9]'
        }`}
      >
        <AppText className="text-[15px] font-vn-bold text-white">
          {actions.busy ? 'Đang đặt giá…' : valid ? `Đặt giá ${formatVnd(amount)}` : 'Đặt giá'}
        </AppText>
      </Pressable>
    </BottomSheet>
  );
}
