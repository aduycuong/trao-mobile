import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { CATEGORY_ICON_BY_SLUG, CatIcon } from '@/components/icons/cat-icon';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { setListingLiked } from '@/services/profile/people-api';
import type { ListingCardData } from '@/types/people';
import { formatClipDuration, formatTimeLeft, formatVnd } from '@/utils/format';

/** Background of a card without a photo. */
const FALLBACK_TONE = '#E9F1FB';
const HEART =
  'M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z';

type ListingCardProps = {
  listing: ListingCardData;
  /** The moment "time left" is measured from. Passed in so a list shares one clock. */
  now: number;
};

/**
 * Listing card (canvas ItemCard): cover, form badge, price or what the owner wants, condition and
 * place, and the save heart on the cover. Tapping the card opens the listing page.
 */
export function ListingCard({ listing, now }: ListingCardProps) {
  const router = useRouter();
  const { session, getIdToken } = useAuth();
  const { type } = listing;
  const [override, setOverride] = useState<{ liked: boolean; likeCount: number } | null>(null);
  const busy = useRef(false);
  const shown = override ?? { liked: listing.liked, likeCount: listing.likeCount };

  const iconKind =
    (listing.categorySlug && CATEGORY_ICON_BY_SLUG[listing.categorySlug]) || 'collect';
  const titleFirst = type === 'trade' || type === 'gift';
  const showVerified = listing.label === 'verified' && type !== 'auction';
  const place = listing.distanceText ?? listing.areaName;

  async function toggleLike() {
    if (busy.current) return;
    if (!session) {
      router.push('/auth-gate');
      return;
    }
    busy.current = true;
    const before = shown;
    const next = !before.liked;
    setOverride({ liked: next, likeCount: Math.max(0, before.likeCount + (next ? 1 : -1)) });
    try {
      setOverride(await setListingLiked(await getIdToken(), listing.id, next));
    } catch (caught) {
      setOverride(before);
      Alert.alert(
        'Không thực hiện được',
        caught instanceof Error ? caught.message : 'Thử lại sau.'
      );
    } finally {
      busy.current = false;
    }
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={listing.title}
      onPress={() => router.push({ pathname: '/l/[id]', params: { id: listing.id } })}
      className="gap-2"
    >
      <View
        className="aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl"
        style={{ backgroundColor: FALLBACK_TONE }}
      >
        {listing.coverUrl ? (
          <Image
            source={{ uri: listing.coverUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <CatIcon kind={iconKind} size={68} />
        )}

        {listing.videoDurationMs !== null ? (
          <View
            className="absolute left-2 top-2 flex-row items-center gap-1 rounded-full py-[3px] pl-1.5 pr-2"
            style={{ backgroundColor: 'rgba(23,36,48,0.72)' }}
          >
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="#FFFFFF">
              <Path d="M8 5v14l11-7z" />
            </Svg>
            <AppText className="text-[11px] font-vn-semibold text-white">
              {formatClipDuration(listing.videoDurationMs)}
            </AppText>
          </View>
        ) : null}
        {type === 'gift' ? (
          <View className="absolute left-2 top-2 flex-row items-center gap-1 rounded-full bg-[#FFC22E] py-[3px] pl-[7px] pr-[9px]">
            <Svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0F2440"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Rect x={4} y={9} width={16} height={4} />
              <Path d="M5 13v7h14v-7M12 9v11M12 9c-1.5-3.5-5-4-5-1.5S12 9 12 9zM12 9c1.5-3.5 5-4 5-1.5S12 9 12 9z" />
            </Svg>
            <AppText className="text-[11.5px] font-vn-bold">Tặng</AppText>
          </View>
        ) : null}
        {type === 'auction' && listing.endsAt ? (
          <View
            className="absolute bottom-2 left-2 flex-row items-center gap-1 rounded-full py-1 pl-[7px] pr-[9px]"
            style={{ backgroundColor: 'rgba(23,36,48,0.8)' }}
          >
            <Svg
              width={13}
              height={13}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={2.2}
              strokeLinecap="round"
            >
              <Circle cx={12} cy={12} r={8} />
              <Path d="M12 8v4l3 2" />
            </Svg>
            <AppText className="text-[12px] font-vn-semibold text-white">
              {formatTimeLeft(listing.endsAt, now)}
            </AppText>
          </View>
        ) : null}
        {showVerified ? (
          <View className="absolute bottom-2 left-2 flex-row items-center gap-[3px] rounded-md bg-white py-[3px] pl-1.5 pr-2">
            <Svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1673D9"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M5 12l4 4 10-10" />
            </Svg>
            <AppText className="text-[11px] font-vn-semibold text-[#1673D9]">Đã xác minh</AppText>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={shown.liked ? 'Bỏ lưu tin này' : 'Lưu tin này'}
          accessibilityState={{ selected: shown.liked }}
          onPress={toggleLike}
          className="absolute right-0.5 top-0.5 h-11 w-11 items-center justify-center"
        >
          <View className="h-8 w-8 items-center justify-center rounded-full bg-white/90">
            <Svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill={shown.liked ? '#F0533A' : 'none'}
              stroke={shown.liked ? '#F0533A' : '#0F2440'}
              strokeWidth={2}
              strokeLinejoin="round"
            >
              <Path d={HEART} />
            </Svg>
          </View>
        </Pressable>
      </View>

      <View className="gap-[5px] px-0.5">
        {type === 'sell' && listing.price !== null ? (
          <View className="flex-row flex-wrap items-baseline gap-x-1.5 pr-[26px]">
            <AppText className="text-[15px] font-vn-bold tracking-[-0.15px]">
              {formatVnd(listing.price)}
            </AppText>
            {listing.alsoTrade ? (
              <AppText className="text-[12px] font-vn-semibold text-[#1673D9]">+ Đổi</AppText>
            ) : null}
          </View>
        ) : null}
        {type === 'auction' ? (
          <View className="gap-px pr-[26px]">
            <AppText className="text-[11px] font-vn-medium text-[#5A6772]">
              Giá hiện tại · {listing.bidCount ?? 0} lượt
            </AppText>
            <AppText className="text-[16px] font-vn-bold tracking-[-0.16px]">
              {listing.price !== null ? formatVnd(listing.price) : '—'}
            </AppText>
          </View>
        ) : null}

        <AppText
          numberOfLines={2}
          className={`text-[13.5px] leading-[18px] ${
            titleFirst ? 'pr-[26px] font-vn-semibold' : ''
          }`}
        >
          {listing.title}
        </AppText>

        {type === 'trade' && listing.tradeWants ? (
          <View className="flex-row items-start gap-1.5 rounded-[10px] bg-[#E6F1FF] px-2 py-[7px]">
            <View className="mt-px">
              <Svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0B4A99"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
              </Svg>
            </View>
            <AppText className="flex-1 text-[12px] leading-[16px] text-[#0B4A99]">
              <AppText className="text-[12px] font-vn-bold text-[#0B4A99]">Muốn: </AppText>
              {listing.tradeWants}
            </AppText>
          </View>
        ) : null}
        {type === 'gift' ? (
          <View className="flex-row items-start gap-1.5 rounded-[10px] bg-[#FFF4D6] px-2 py-[7px]">
            <View className="mt-px">
              <Svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8A5A00"
                strokeWidth={2}
                strokeLinecap="round"
              >
                <Circle cx={9} cy={8} r={3.5} />
                <Path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5 5 0 0 1 3.5 6" />
              </Svg>
            </View>
            <AppText className="flex-1 text-[12px] leading-[16px] text-[#8A5A00]">
              {listing.registrationCount
                ? `${listing.registrationCount} người đăng ký`
                : 'Chưa có ai đăng ký'}
            </AppText>
          </View>
        ) : null}

        <View className="mt-px flex-row flex-wrap items-center gap-1.5">
          <View className="rounded-md bg-[#F1F4F7] px-[7px] py-px">
            <AppText className="text-[12px] font-vn-medium text-[#33414D]">
              {listing.condition}
            </AppText>
          </View>
          {place || listing.canShip ? (
            <View className="flex-row items-center gap-[3px]">
              {listing.canShip ? (
                <Svg
                  width={13}
                  height={13}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#5A6772"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  accessibilityLabel="Có giao hàng"
                >
                  <Path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
                  <Circle cx={7} cy={18} r={1.8} />
                  <Circle cx={17} cy={18} r={1.8} />
                </Svg>
              ) : null}
              {place ? <AppText className="text-[12px] text-[#5A6772]">{place}</AppText> : null}
            </View>
          ) : null}
          <AppText className="text-[12px] text-[#5A6772]">·</AppText>
          <View
            accessibilityLabel={`${shown.likeCount} lượt thích`}
            className="flex-row items-center gap-[3px]"
          >
            <Svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill={shown.liked ? '#F0533A' : '#5A6772'}
            >
              <Path d={HEART} />
            </Svg>
            <AppText
              className={`text-[12px] font-vn-medium ${
                shown.liked ? 'text-[#F0533A]' : 'text-[#5A6772]'
              }`}
            >
              {shown.likeCount}
            </AppText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
