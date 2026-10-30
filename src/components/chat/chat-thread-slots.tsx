import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { PathIcon } from '@/components/ui/path-icon';
import { useAuth } from '@/hooks/useAuth';
import { fetchListingPage } from '@/services/listings/listings-api';
import { formatVnd } from '@/utils/format';

/**
 * Extension point for part 7B: the deal banners of this chat (canvas Chat, `DealBanner`, drawn on
 * a #F7F9FB strip under the header). 7A has no deals, so there is no element and the listing card
 * below always shows. 7B returns the banners as `element` and sets `hasContextDeal` when one of
 * them is about `listingId`, which hides the listing card (the banner already says it).
 */
export function useThreadBanner(
  inboxId: string,
  listingId: string | undefined
): { element: React.ReactNode; hasContextDeal: boolean } {
  void inboxId;
  void listingId;
  return { element: null, hasContextDeal: false };
}

/** The listing the talk is about, on top of the thread (web: opened with `?listing=`). */
export function ThreadListingCard({ listingId }: { listingId: string }) {
  const router = useRouter();
  const { session, getIdToken } = useAuth();
  const { data } = useQuery({
    queryKey: ['chat', 'listing-card', session?.uid, listingId],
    queryFn: async () => fetchListingPage(listingId, await getIdToken()),
    enabled: !!session,
    retry: false,
  });

  if (!data?.available) return null;
  const price =
    data.type === 'gift'
      ? 'Miễn phí'
      : data.type === 'auction' && data.auction
        ? formatVnd(data.auction.currentPrice)
        : data.price !== null
          ? formatVnd(data.price)
          : 'Trao đổi';
  const photo = data.photos[0]?.thumbUrl;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem tin ${data.title}`}
      onPress={() => router.push({ pathname: '/l/[id]', params: { id: data.id } })}
      className="flex-row items-center gap-3 border-b border-[#EEF2F6] bg-white px-3 py-2.5"
    >
      <View className="h-11 w-11 overflow-hidden rounded-[10px] bg-[#E6F1FF]">
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: 44, height: 44 }} contentFit="cover" />
        ) : null}
      </View>
      <View className="min-w-0 flex-1">
        <AppText numberOfLines={1} className="text-[13.5px] font-vn-semibold">
          {data.title}
        </AppText>
        <AppText className="text-[12.5px] text-[#5A6772]">{price}</AppText>
      </View>
      <PathIcon d="M9 6l6 6-6 6" size={16} color="#A3AEB9" strokeWidth={2} />
    </Pressable>
  );
}
