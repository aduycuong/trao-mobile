import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { RadioDot, SkeletonBlock } from '@/components/ui/form-controls';
import { useAuth } from '@/hooks/useAuth';
import { useDealActions } from '@/hooks/useDealActions';
import { useDebounce } from '@/hooks/useDebounce';
import { CHAT_TEXT_MAX_LENGTH } from '@/services/chat/constants';
import { priceOfferError, priceSuggestions } from '@/services/deals/offer-rules';
import { fetchMyItems } from '@/services/stock/items-api';
import { formatVnd } from '@/utils/format';
import { SkeletonGroup } from '@/components/ui/skeletons';

export type OfferMode = 'price' | 'buy' | 'swap' | 'gift';

export type OfferTarget = { id: string; title: string; price: number | null };

const TITLES: Record<OfferMode, string> = {
  price: 'Trả giá',
  buy: 'Mua ngay',
  swap: 'Đề nghị đổi',
  gift: 'Đăng ký nhận',
};

const SUBMIT: Record<OfferMode, string> = {
  price: 'Gửi lời trả giá',
  buy: 'Gửi yêu cầu mua',
  swap: 'Gửi đề nghị đổi',
  gift: 'Đăng ký nhận',
};

/**
 * The sheet where an asker sends an offer (canvas Detail: trả giá, mua ngay, chọn món để đổi,
 * đăng ký nhận): a price below the listed one, a buy now at the listed price, one of their own
 * available items, or a request to receive the gift. The owner has to agree afterwards.
 */
export function OfferSheet({
  listing,
  mode,
  onClose,
}: {
  listing: OfferTarget;
  mode: OfferMode;
  onClose: () => void;
}) {
  const router = useRouter();
  const { session, getIdToken } = useAuth();
  const actions = useDealActions();
  const [digits, setDigits] = useState('');
  const [itemId, setItemId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [keyword, setKeyword] = useState('');
  const searched = useDebounce(keyword.trim(), 300);

  const amount = Number(digits || 0);
  const listed = listing.price ?? 0;
  const amountError = mode === 'price' ? priceOfferError(digits, listed) : null;
  const valid =
    mode === 'price' ? digits !== '' && !amountError : mode === 'swap' ? !!itemId : true;

  const { data, isPending } = useQuery({
    queryKey: ['items', 'offerable', session?.uid, searched],
    queryFn: async () =>
      fetchMyItems(await getIdToken(), { offset: 0, limit: 50, keyword: searched || undefined }),
    enabled: mode === 'swap' && !!session,
    placeholderData: keepPreviousData,
  });
  const offerable = (data?.items ?? []).filter((item) => item.status === 'available');

  async function submit() {
    if (!valid || actions.busy) return;
    const text = message.trim() || undefined;
    const ok =
      mode === 'price'
        ? await actions.send(listing.id, { kind: 'price_offer', amount })
        : mode === 'buy'
          ? await actions.send(listing.id, { kind: 'buy_now' })
          : mode === 'swap'
            ? await actions.send(listing.id, {
                kind: 'swap',
                offeredItemId: itemId as string,
                message: text,
              })
            : await actions.send(listing.id, { kind: 'gift_request', message: text });
    if (ok) onClose();
  }

  const suggestions = mode === 'price' ? priceSuggestions(listed) : [];

  return (
    <BottomSheet title={TITLES[mode]} onClose={onClose}>
      <AppText numberOfLines={1} className="-mt-1 text-[14px] text-[#5A6772]">
        {listing.title}
      </AppText>

      {mode === 'price' ? (
        <View className="gap-2.5">
          <AppText className="text-[13px] text-[#5A6772]">
            Giá đăng {formatVnd(listed)}. Người đăng đồng ý thì hai bên bắt đầu giao dịch.
          </AppText>
          <View className="h-[54px] flex-row items-center gap-2 rounded-[14px] border-[1.5px] border-[#D5DDE5] bg-white px-3.5">
            <TextInput
              keyboardType="number-pad"
              autoFocus
              value={digits ? Number(digits).toLocaleString('vi-VN') : ''}
              onChangeText={(text) => setDigits(text.replace(/\D/g, '').slice(0, 10))}
              placeholder="Nhập giá bạn muốn trả"
              placeholderTextColor="#8896A3"
              accessibilityLabel="Giá trả"
              className="min-w-0 flex-1 font-vn-bold text-[18px] text-[#0F2440]"
            />
            <AppText className="text-[15px] font-vn-semibold text-[#5A6772]">đ</AppText>
          </View>
          {amountError ? (
            <AppText className="text-[12.5px] text-[#B42318]">{amountError}</AppText>
          ) : null}
          {suggestions.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {suggestions.map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  onPress={() => setDigits(String(value))}
                  className="h-9 justify-center rounded-full border-[1.5px] border-[#D5DDE5] bg-white px-3.5"
                >
                  <AppText className="text-[13.5px] font-vn-semibold">{formatVnd(value)}</AppText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {mode === 'buy' ? (
        <AppText className="rounded-xl bg-[#F1F7FE] px-3.5 py-3 text-[14px] leading-[21px]">
          Bạn muốn mua với đúng giá{' '}
          <AppText className="text-[14px] font-vn-bold">{formatVnd(listed)}</AppText>. Người đăng
          cần đồng ý rồi hai bên mới bắt đầu giao dịch, bạn có thể rút trước đó.
        </AppText>
      ) : null}

      {mode === 'gift' ? (
        <>
          <MessageInput
            value={message}
            onChange={setMessage}
            placeholder="Lời nhắn cho người tặng (không bắt buộc)"
            height={72}
          />
          <AppText className="rounded-xl bg-[#FFF4D6] px-3.5 py-3 text-[14px] leading-[21px] text-[#3D2A00]">
            Người tặng chọn một người trong số những người đăng ký. Bạn có thể huỷ đăng ký trước khi
            được chọn.
          </AppText>
        </>
      ) : null}

      {mode === 'swap' ? (
        <View className="gap-2">
          <AppText className="text-[13px] text-[#5A6772]">
            Chọn một món Sẵn sàng trong Kho đồ của bạn
          </AppText>
          <View className="h-[46px] flex-row items-center gap-2.5 rounded-xl border-[1.5px] border-[#D5DDE5] bg-white px-3.5">
            <Svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5A6772"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <Circle cx={11} cy={11} r={7} />
              <Path d="M20 20l-4-4" />
            </Svg>
            <TextInput
              value={keyword}
              onChangeText={(text) => setKeyword(text.slice(0, 100))}
              placeholder="Tìm món trong Kho đồ"
              placeholderTextColor="#8A96A3"
              accessibilityLabel="Tìm món trong Kho đồ"
              returnKeyType="search"
              className="min-w-0 flex-1 font-vn text-[14.5px] text-[#0F2440]"
            />
          </View>
          {data ? (
            <AppText className="text-[12.5px] text-[#5A6772]">
              {searched
                ? `${offerable.length} món Sẵn sàng`
                : `${offerable.length} món Sẵn sàng · gần đây`}
            </AppText>
          ) : null}
          {isPending ? (
            <SkeletonGroup>
              <SkeletonBlock className="h-16 w-full rounded-2xl" />
            </SkeletonGroup>
          ) : null}
          {data && offerable.length === 0 ? (
            <AppText className="rounded-xl bg-[#F1F7FE] px-3.5 py-3 text-[14px] text-[#5A6772]">
              {searched
                ? 'Không có món Sẵn sàng nào khớp.'
                : 'Kho đồ chưa có món nào sẵn sàng để đổi. Thêm một món vào Kho rồi quay lại.'}
            </AppText>
          ) : null}
          <View accessibilityRole="radiogroup" className="gap-2">
            {offerable.map((item) => {
              const on = itemId === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setItemId(item.id)}
                  className={`flex-row items-center gap-3 rounded-[14px] border-[1.5px] py-2 pl-2 pr-3 ${
                    on ? 'border-[#1673D9] bg-[#F1F7FE]' : 'border-[#E1E7EE] bg-white'
                  }`}
                >
                  <View className="h-[52px] w-[52px] overflow-hidden rounded-[10px] bg-[#E6F1FF]">
                    {item.coverUrl ? (
                      <Image
                        source={{ uri: item.coverUrl }}
                        style={{ width: 52, height: 52 }}
                        contentFit="cover"
                      />
                    ) : null}
                  </View>
                  <View className="min-w-0 flex-1 gap-0.5">
                    <AppText numberOfLines={1} className="text-[14.5px] font-vn-semibold">
                      {item.title}
                    </AppText>
                    <AppText className="text-[12.5px] text-[#5A6772]">{item.condition}</AppText>
                  </View>
                  <RadioDot on={on} />
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              onClose();
              router.push('/stock/new');
            }}
          >
            <AppText className="text-[13.5px] font-vn-semibold text-[#1673D9]">
              + Thêm món vào Kho đồ
            </AppText>
          </Pressable>
          <MessageInput
            value={message}
            onChange={setMessage}
            placeholder="Lời nhắn cho người đăng (không bắt buộc)"
            height={56}
          />
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !valid || actions.busy }}
        disabled={!valid || actions.busy}
        onPress={() => void submit()}
        className={`h-[50px] items-center justify-center rounded-[14px] ${
          !valid || actions.busy ? 'bg-[#9CC3F0]' : 'bg-[#1673D9]'
        }`}
      >
        <AppText className="text-[15px] font-vn-bold text-white">
          {actions.busy ? 'Đang gửi…' : SUBMIT[mode]}
        </AppText>
      </Pressable>
    </BottomSheet>
  );
}

/** The optional message to the owner (canvas Detail, swap and gift): sent as the asker's chat message. */
function MessageInput({
  value,
  onChange,
  placeholder,
  height,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  height: number;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={(text) => onChange(text.slice(0, CHAT_TEXT_MAX_LENGTH))}
      placeholder={placeholder}
      placeholderTextColor="#5A6772"
      accessibilityLabel={placeholder}
      multiline
      textAlignVertical="top"
      style={{ height }}
      className="rounded-xl bg-[#F2F5F8] px-3.5 py-3 font-vn text-[14px] text-[#0F2440]"
    />
  );
}
