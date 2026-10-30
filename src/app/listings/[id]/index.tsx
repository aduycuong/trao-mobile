import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { CatIcon, type CatIconKind } from '@/components/icons/cat-icon';
import { ConfirmSheet } from '@/components/me/confirm-sheet';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { ItemThumb } from '@/components/stock/item-thumb';
import { AppText } from '@/components/ui/app-text';
import { ErrorBox } from '@/components/ui/form-controls';
import { PathIcon } from '@/components/ui/path-icon';
import { useAuth } from '@/hooks/useAuth';
import { useGoBack } from '@/hooks/useGoBack';
import {
  deleteListing,
  fetchMyListing,
  listingQueryKey,
  MY_LISTINGS_QUERY_KEY,
} from '@/services/listings/listings-api';
import { MY_ITEMS_QUERY_KEY } from '@/services/stock/items-api';
import type { ListingOwnerDetail } from '@/types/listings';
import { LISTING_TYPE_LABELS } from '@/types/people';
import { describeStatus, describeStatusBar, type StatusAction } from '@/utils/listing-status';
import { RequireSession } from '@/components/auth/require-session';
import { StackSkeleton } from '@/components/ui/skeletons';

const FORM_ICON: Record<ListingOwnerDetail['type'], CatIconKind> = {
  sell: 'sale',
  auction: 'auction',
  trade: 'swap',
  gift: 'gift',
};

/** The status page of one listing for its owner (canvas ListingLife): not approved, waiting, closed, an auction without bids. */
function ListingStatusContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = useGoBack('/listings');
  const queryClient = useQueryClient();
  const { session, getIdToken } = useAuth();
  const [asking, setAsking] = useState(false);

  const queryKey = listingQueryKey(id, session?.uid);
  const {
    data: detail,
    error,
    refetch,
    isPending,
  } = useQuery({
    queryKey,
    queryFn: async () => fetchMyListing(await getIdToken(), id),
    enabled: !!session,
  });

  const remove = useMutation({
    mutationFn: async () => deleteListing(await getIdToken(), id),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: MY_LISTINGS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MY_ITEMS_QUERY_KEY }),
      ]);
      router.replace('/listings');
    },
    onError: (caught) => Alert.alert('Không xoá được tin', caught.message || 'Thử lại sau.'),
  });

  function run(action: StatusAction) {
    if (!detail) return;
    if (action === 'edit') router.push({ pathname: '/listings/[id]/edit', params: { id } });
    else if (action === 'view') router.push({ pathname: '/l/[id]', params: { id } });
    else if (action === 'delete') setAsking(true);
    else if (action === 'sell') {
      router.push({
        pathname: '/stock/[id]/post',
        params: { id: detail.itemId, from: 'stock', type: 'sell' },
      });
    } else goBack();
  }

  const card = detail ? describeStatus(detail) : null;
  const bar = detail ? describeStatusBar(detail) : null;

  return (
    <View className="flex-1 bg-white">
      <ScreenBar title="Tin của bạn" onBack={goBack} />

      {isPending && session ? (
        <StackSkeleton
          blocks={['h-[76px] rounded-2xl', 'h-32 rounded-[18px]', 'h-16 rounded-2xl']}
        />
      ) : null}
      {error ? <ErrorBox message={error.message} onRetry={() => refetch()} /> : null}

      {detail && card && bar ? (
        <>
          <ScrollView
            contentContainerClassName="gap-[18px] px-4 pb-5 pt-4"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-row items-center gap-3">
              <ItemThumb
                url={detail.coverUrl}
                categorySlug={detail.categorySlug}
                width={64}
                height={76}
                radius={14}
                iconSize={40}
              />
              <View className="min-w-0 flex-1 gap-1">
                <View className="flex-row items-center gap-1.5">
                  <CatIcon kind={FORM_ICON[detail.type]} size={20} />
                  <AppText className="text-[12.5px] font-vn-bold text-[#1673D9]">
                    {LISTING_TYPE_LABELS[detail.type]}
                  </AppText>
                </View>
                <AppText numberOfLines={2} className="text-[15px] font-vn-semibold leading-[20px]">
                  {detail.title}
                </AppText>
                <AppText className="text-[14px] font-vn-bold">{detail.priceText}</AppText>
              </View>
            </View>

            <View
              className="gap-2.5 rounded-[18px] border p-3.5"
              style={{ backgroundColor: card.bg, borderColor: card.bd }}
            >
              <View className="flex-row items-center gap-2.5">
                <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-white">
                  <PathIcon d={card.icon} size={20} color={card.ink} strokeWidth={2.2} />
                </View>
                <View className="flex-1 gap-px">
                  <AppText className="text-[16px] font-vn-bold" style={{ color: card.ink }}>
                    {card.title}
                  </AppText>
                  <AppText className="text-[12.5px] text-[#33414D]">{card.sub}</AppText>
                </View>
              </View>
              <AppText className="text-[13.5px] leading-[20.9px] text-[#33414D]">
                {card.body}
              </AppText>
              {detail.rejection && detail.rejection.errors.length > 0 ? (
                <View className="gap-2">
                  {detail.rejection.errors.map((entry, index) => (
                    <View
                      key={`${entry.code}-${index}`}
                      className="flex-row gap-2.5 rounded-xl bg-white px-3 py-2.5"
                    >
                      <View className="mt-px">
                        <Svg
                          width={18}
                          height={18}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#B42318"
                          strokeWidth={2.2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <Circle cx={12} cy={12} r={9} />
                          <Path d="M12 7v6M12 16.5h.01" />
                        </Svg>
                      </View>
                      <View className="min-w-0 flex-1 gap-0.5">
                        <AppText className="text-[13.5px] font-vn-bold">{entry.message}</AppText>
                        <AppText className="text-[12.5px] leading-[18px] text-[#5A6772]">
                          {entry.fix}
                        </AppText>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View className="flex-row rounded-2xl border border-[#E8ECF0] py-3">
              {(
                [
                  [detail.stats.views, 'lượt xem'],
                  [detail.stats.likes, 'thích'],
                  [detail.stats.offers, 'đề nghị'],
                ] as const
              ).map(([value, label], index) => (
                <View
                  key={label}
                  className={`flex-1 items-center gap-0.5 ${index > 0 ? 'border-l border-[#EEF2F6]' : ''}`}
                >
                  <AppText className="text-[17px] font-vn-bold">{value}</AppText>
                  <AppText className="text-[12px] text-[#5A6772]">{label}</AppText>
                </View>
              ))}
            </View>
          </ScrollView>

          <View
            className="gap-1.5 border-t border-[#EEF2F6] bg-white px-4 pt-2.5"
            style={{ paddingBottom: 16 + insets.bottom }}
          >
            {bar.note ? (
              <AppText className="text-center text-[12.5px] text-[#5A6772]">{bar.note}</AppText>
            ) : null}
            <View className="flex-row gap-2.5">
              {bar.secondary ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => run(bar.secondary!.action)}
                  className="h-[50px] flex-1 items-center justify-center rounded-[14px] border-[1.5px] bg-white"
                  style={{ borderColor: bar.secondary.danger ? '#F6C9C4' : '#C9DDF4' }}
                >
                  <AppText
                    className="text-[15px] font-vn-semibold"
                    style={{ color: bar.secondary.danger ? '#B42318' : '#1673D9' }}
                  >
                    {bar.secondary.label}
                  </AppText>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: bar.primary.disabled }}
                disabled={bar.primary.disabled}
                onPress={() => run(bar.primary.action)}
                style={{ flex: 1.4, backgroundColor: bar.primary.disabled ? '#E1E7ED' : '#1673D9' }}
                className="h-[50px] items-center justify-center rounded-[14px]"
              >
                <AppText
                  className="text-[15px] font-vn-bold"
                  style={{ color: bar.primary.disabled ? '#A3AEB9' : '#FFFFFF' }}
                >
                  {bar.primary.label}
                </AppText>
              </Pressable>
            </View>
          </View>
        </>
      ) : null}

      {asking ? (
        <ConfirmSheet
          title="Xoá tin này?"
          description="Tin sẽ bị xoá. Món vẫn ở Kho đồ, bạn đăng lại lúc nào cũng được."
          confirmLabel="Xoá tin"
          cancelLabel="Giữ lại"
          destructive
          onCancel={() => setAsking(false)}
          onConfirm={async () => {
            await remove.mutateAsync().catch(() => undefined);
            setAsking(false);
          }}
        />
      ) : null}
    </View>
  );
}

export default function ListingStatusScreen() {
  return (
    <RequireSession>
      <ListingStatusContent />
    </RequireSession>
  );
}
