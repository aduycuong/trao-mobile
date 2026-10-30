import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { CATEGORY_ICON_BY_SLUG, CatIcon, type CatIconKind } from '@/components/icons/cat-icon';
import { MediaGallery, RoundOverlayButton } from '@/components/stock/media-gallery';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { BarButton, ErrorBox } from '@/components/ui/form-controls';
import {
  ICON_CHEVRON_LEFT,
  ICON_CHEVRON_RIGHT,
  ICON_CLOCK,
  ICON_NOTE,
  ICON_PENCIL,
  ICON_PLUS,
  ICON_TAG,
  ICON_TRASH,
  PathIcon,
} from '@/components/ui/path-icon';
import { useAuth } from '@/hooks/useAuth';
import { fetchDeals } from '@/services/deals/deals-api';
import { useGoBack } from '@/hooks/useGoBack';
import { usePenaltyGuard } from '@/hooks/usePenaltyGuard';
import {
  deleteMyItem,
  fetchMyItem,
  fetchMyTags,
  itemQueryKey,
  MY_ITEMS_QUERY_KEY,
  MY_TAGS_QUERY_KEY,
  saveItemNote,
  updateMyItem,
} from '@/services/stock/items-api';
import type { ListingType } from '@/types/people';
import {
  ITEM_NOTE_MAX_LENGTH,
  ITEM_TAGS_MAX_COUNT,
  ITEM_TAG_MAX_LENGTH,
  type ItemListingSummary,
  type ItemStatus,
} from '@/types/stock';
import { formatDayMonth, formatEventTime } from '@/utils/format';
import { RequireSession } from '@/components/auth/require-session';

const STATUS_STYLE: Record<
  ItemStatus | 'live',
  { label: string; bg: string; fg: string; dot: string }
> = {
  live: { label: 'Đang đăng', bg: '#E6F1FF', fg: '#0B4A99', dot: '#1673D9' },
  in_auction: { label: 'Đang đăng', bg: '#E6F1FF', fg: '#0B4A99', dot: '#1673D9' },
  in_transaction: { label: 'Đang giao dịch', bg: '#FFC22E', fg: '#3D2A00', dot: '#3D2A00' },
  available: { label: 'Sẵn sàng', bg: '#E3F4EA', fg: '#1E6B43', dot: '#2F9E63' },
};

const FORM: Record<ListingType, { label: string; icon: CatIconKind }> = {
  sell: { label: 'Bán', icon: 'sale' },
  auction: { label: 'Đấu giá', icon: 'auction' },
  trade: { label: 'Trao đổi', icon: 'swap' },
  gift: { label: 'Cho tặng', icon: 'gift' },
};

const LISTING_STATUS: Record<string, string> = {
  published: 'Đang đăng',
  scheduled: 'Sắp bắt đầu',
  pending_review: 'Chờ duyệt',
  draft: 'Chưa được duyệt',
};

const NOTE_PLACEHOLDER = 'Thêm ghi chú: để ở đâu, giá mua, lưu ý khi bán…';

type SheetKind = 'more' | 'tags' | 'delete' | null;

/** One item of the Kho đồ (canvas StockItem): gallery, status, tags, listings, description, private note, history. */
function StockItemContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session, getIdToken } = useAuth();
  const postGuard = usePenaltyGuard();
  const goBack = useGoBack('/stock');
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [editingNote, setEditingNote] = useState(false);

  const queryKey = itemQueryKey(id, session?.uid);
  const {
    data: item,
    error,
    refetch,
    isPending,
  } = useQuery({
    queryKey,
    queryFn: async () => fetchMyItem(await getIdToken(), id),
    enabled: !!session,
    // Photos and videos are checked after the item is saved: look again until that is done.
    refetchInterval: (query) => (query.state.data?.mediaStatus === 'checking' ? 5000 : false),
  });

  // Who the item is in a deal with ("Đang giao dịch · với …"): the deal in progress on one of its listings.
  const { data: activeDeals } = useQuery({
    queryKey: ['deals', 'item-partner', id, session?.uid],
    queryFn: async () => fetchDeals(await getIdToken(), { scope: 'active', limit: 100 }),
    enabled: !!session && item?.locked === true,
    retry: false,
  });
  const partnerName =
    activeDeals?.items.find(
      (deal) =>
        deal.status === 'in_transaction' && item?.listings.some((l) => l.id === deal.listing.id)
    )?.counterpart.name ?? null;

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: MY_ITEMS_QUERY_KEY }),
    ]);
  }

  const remove = useMutation({
    mutationFn: async () => deleteMyItem(await getIdToken(), id),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: MY_ITEMS_QUERY_KEY });
      router.replace('/stock');
    },
    onError: (caught) => {
      setSheet(null);
      Alert.alert('Không xoá được', caught.message || 'Thử lại sau.');
    },
  });

  if (isPending) {
    return (
      <View className="flex-1 bg-white">
        <View
          className="h-[300px] bg-[#DCEBFB]"
          style={{ paddingTop: insets.top + 12, paddingLeft: 12 }}
        >
          <View className="self-start">
            <RoundOverlayButton label="Quay lại" onPress={goBack}>
              <PathIcon d={ICON_CHEVRON_LEFT} size={20} strokeWidth={2.2} />
            </RoundOverlayButton>
          </View>
        </View>
        <View className="items-center py-10">
          <ActivityIndicator color="#1673D9" />
        </View>
      </View>
    );
  }
  if (error || !item) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <ErrorBox
          message={error?.message ?? 'Không tìm thấy món.'}
          onRetry={() => refetch()}
          onBack={goBack}
        />
      </View>
    );
  }

  const openListings = item.listings.filter((listing) => listing.status !== 'closed');
  const statusKey: ItemStatus | 'live' =
    item.status === 'available' && openListings.some((l) => l.status === 'published')
      ? 'live'
      : item.status;
  const status = STATUS_STYLE[statusKey];

  function startPosting() {
    if (!postGuard.guard('post')) return;
    router.push({ pathname: '/stock/[id]/post', params: { id: item!.id, from: 'stock' } });
  }

  /** One not on the market opens its status page; a closed one is posted again; a live one opens its page. */
  function openListing(listing: ItemListingSummary) {
    const repostable =
      listing.status === 'closed' &&
      (listing.closedReason === 'withdrawn' || listing.closedReason === 'auction_failed');
    if (repostable) router.push({ pathname: '/listings/[id]/edit', params: { id: listing.id } });
    else if (['closed', 'draft', 'pending_review'].includes(listing.status)) {
      router.push({ pathname: '/listings/[id]', params: { id: listing.id } });
    } else router.push({ pathname: '/l/[id]', params: { id: listing.id } });
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <MediaGallery
          photos={item.photos}
          videos={item.videos}
          height={300}
          thumbs
          fallbackIcon={
            (item.categorySlug && CATEGORY_ICON_BY_SLUG[item.categorySlug]) || 'collect'
          }
          overlay={
            <>
              <View style={{ marginTop: insets.top }}>
                <RoundOverlayButton label="Quay lại" onPress={goBack}>
                  <PathIcon d={ICON_CHEVRON_LEFT} size={20} strokeWidth={2.2} />
                </RoundOverlayButton>
              </View>
              <View style={{ marginTop: insets.top }}>
                <RoundOverlayButton label="Tuỳ chọn món" onPress={() => setSheet('more')}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="#0F2440">
                    <Circle cx={5} cy={12} r={2} />
                    <Circle cx={12} cy={12} r={2} />
                    <Circle cx={19} cy={12} r={2} />
                  </Svg>
                </RoundOverlayButton>
              </View>
            </>
          }
        />

        <View className="gap-[22px] px-4 pb-6 pt-3.5">
          {item.mediaStatus === 'checking' ? (
            <View
              accessibilityRole="alert"
              className="flex-row items-start gap-2.5 rounded-[14px] bg-[#FFF4D6] px-3 py-2.5"
            >
              <View className="mt-0.5">
                <PathIcon d={ICON_CLOCK} size={16} color="#8A5A00" strokeWidth={2.2} />
              </View>
              <AppText className="flex-1 text-[13px] leading-[19.5px] text-[#3D2A00]">
                Đang kiểm tra ảnh và video. File nào không đạt sẽ tự bị gỡ và bạn sẽ được báo.
              </AppText>
            </View>
          ) : null}

          <View className="gap-2.5">
            <View className="flex-row items-center gap-2">
              <View
                className="h-[26px] flex-row items-center gap-1.5 rounded-full px-2.5"
                style={{ backgroundColor: status.bg }}
              >
                <View
                  className="h-[7px] w-[7px] rounded-full"
                  style={{ backgroundColor: status.dot }}
                />
                <AppText className="text-[12.5px] font-vn-bold" style={{ color: status.fg }}>
                  {status.label}
                </AppText>
              </View>
              <AppText className="text-[12.5px] text-[#5A6772]">{item.since}</AppText>
            </View>
            <AppText
              accessibilityRole="header"
              className="text-[21px] font-vn-bold leading-[27px] tracking-[-0.21px]"
            >
              {item.title}
            </AppText>
            <AppText className="text-[13.5px] text-[#33414D]">
              <AppText className="text-[13.5px] font-vn-semibold text-[#33414D]">
                {item.conditionLabel}
              </AppText>
              {item.categoryName ? ` · ${item.categoryName}` : ''}
            </AppText>
            <View className="flex-row flex-wrap items-center gap-1.5">
              {item.tags.map((entry) => (
                <View
                  key={entry.tag}
                  className="h-7 flex-row items-center gap-[5px] rounded-lg bg-[#F2F5F8] px-2.5"
                >
                  <View
                    className="h-[7px] w-[7px] rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <AppText className="text-[12.5px] font-vn-semibold text-[#33414D]">
                    {entry.tag}
                  </AppText>
                </View>
              ))}
              <Pressable
                accessibilityRole="button"
                onPress={() => setSheet('tags')}
                className="h-7 flex-row items-center gap-1 rounded-lg border-[1.5px] border-dashed border-[#9CC3F0] px-2.5"
              >
                <PathIcon d={ICON_PLUS} size={12} color="#1673D9" strokeWidth={2.8} />
                <AppText className="text-[12.5px] font-vn-semibold text-[#1673D9]">
                  {item.tags.length > 0 ? 'Tag' : 'Gắn tag'}
                </AppText>
              </Pressable>
            </View>
          </View>

          {item.locked ? (
            <View className="gap-2.5">
              <AppText accessibilityRole="header" className="text-[16px] font-vn-bold">
                Giao dịch
              </AppText>
              <AppText className="text-[12.5px] leading-[18.75px] text-[#5A6772]">
                Món này đang trong một giao dịch. Trong lúc giao dịch, món bị khoá sửa và không đăng
                tin được.
              </AppText>
            </View>
          ) : null}

          <View className="gap-2.5">
            <View className="flex-row items-baseline gap-2">
              <AppText accessibilityRole="header" className="flex-1 text-[16px] font-vn-bold">
                Tin đăng của món
              </AppText>
              <AppText className="text-[12.5px] text-[#5A6772]">
                bán và trao đổi đăng cùng lúc được
              </AppText>
            </View>
            {item.listings.length > 0 ? (
              <View className="overflow-hidden rounded-2xl border border-[#E6ECF2]">
                {item.listings.map((listing, index) => (
                  <ListingRow
                    key={listing.id}
                    listing={listing}
                    first={index === 0}
                    onOpen={() => openListing(listing)}
                  />
                ))}
              </View>
            ) : (
              <AppText className="rounded-2xl bg-[#F7F9FB] p-3.5 text-[13.5px] leading-[20px] text-[#5A6772]">
                {item.locked
                  ? 'Món đang giao dịch nên chưa đăng tin được.'
                  : 'Món chưa có tin nào. Bấm "Đăng tin" để bán, đấu giá, trao đổi hoặc cho tặng.'}
              </AppText>
            )}
          </View>

          <View className="gap-2.5">
            <View className="flex-row items-center gap-2">
              <AppText accessibilityRole="header" className="flex-1 text-[16px] font-vn-bold">
                Mô tả
              </AppText>
              <View
                accessibilityRole="tablist"
                className="flex-row rounded-[10px] bg-[#F1F5F9] p-[3px]"
              >
                {(
                  [
                    ['Trình bày', false],
                    ['Bản gốc', true],
                  ] as const
                ).map(([label, original]) => {
                  const on = showOriginal === original;
                  return (
                    <Pressable
                      key={label}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: on }}
                      onPress={() => setShowOriginal(original)}
                      className={`h-7 justify-center rounded-lg px-2.5 ${on ? 'bg-white' : ''}`}
                      style={
                        on
                          ? {
                              shadowColor: '#0F2440',
                              shadowOpacity: 0.12,
                              shadowRadius: 3,
                              shadowOffset: { width: 0, height: 1 },
                              elevation: 1,
                            }
                          : undefined
                      }
                    >
                      <AppText
                        className={`text-[12.5px] ${
                          on ? 'font-vn-bold text-[#0F2440]' : 'font-vn-medium text-[#5A6772]'
                        }`}
                      >
                        {label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {showOriginal ? (
              <>
                <AppText className="rounded-xl border border-[#E6ECF2] px-3.5 py-3 text-[14px] leading-[22.4px] text-[#33414D]">
                  {item.sourceDescription}
                </AppText>
                <AppText className="text-[12.5px] text-[#5A6772]">
                  Bản gốc bạn viết. Sửa ở &quot;Chỉnh sửa&quot;, Trao sẽ trình bày lại.
                </AppText>
              </>
            ) : (
              <>
                {item.attributes.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {item.attributes.map((attribute) => (
                      <View
                        key={attribute.key}
                        className="gap-px rounded-[10px] bg-[#F7F9FB] px-2.5 py-2"
                        style={{ width: '48.5%' }}
                      >
                        <AppText className="text-[11.5px] text-[#5A6772]">{attribute.key}</AppText>
                        <AppText className="text-[13.5px] font-vn-semibold">
                          {attribute.value}
                        </AppText>
                      </View>
                    ))}
                  </View>
                ) : null}
                <AppText className="text-[14px] leading-[22.4px] text-[#33414D]">
                  {item.description}
                </AppText>
                {item.story ? (
                  <AppText className="rounded-[10px] bg-[#FFF9EA] px-3 py-2.5 text-[13.5px] italic leading-[20px] text-[#3D2A00]">
                    “{item.story}”
                  </AppText>
                ) : null}
              </>
            )}
          </View>

          <NoteSection
            itemId={item.id}
            note={item.note}
            editing={editingNote}
            onEdit={() => setEditingNote(true)}
            onDone={() => setEditingNote(false)}
            onSaved={refresh}
          />

          <View className="gap-2.5">
            <View className="flex-row items-baseline gap-2">
              <AppText accessibilityRole="header" className="flex-1 text-[16px] font-vn-bold">
                Lịch sử món
              </AppText>
              {item.owners ? (
                <AppText className="text-[12.5px] font-vn-semibold text-[#7A4BA6]">
                  {item.owners}
                </AppText>
              ) : null}
            </View>
            <View>
              {item.history.map((event, index) => {
                const first = index === 0;
                const last = index === item.history.length - 1;
                return (
                  <View key={`${event.at}-${index}`} className="flex-row gap-3">
                    <View className="w-5 items-center">
                      <View
                        className="mt-[5px] rounded-full"
                        style={{
                          width: 16,
                          height: 16,
                          backgroundColor: first ? '#D6E8FC' : '#EEF1F4',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 2,
                        }}
                      >
                        <View
                          className="rounded-full"
                          style={{
                            width: 10,
                            height: 10,
                            backgroundColor: first ? '#1673D9' : '#A3AEB9',
                          }}
                        />
                      </View>
                      <View
                        className="mt-1 w-0.5 flex-1"
                        style={{ backgroundColor: last ? 'transparent' : '#E1E7ED' }}
                      />
                    </View>
                    <View className="min-w-0 flex-1 gap-0.5 pb-4">
                      <AppText className="text-[14px] font-vn-semibold">{event.title}</AppText>
                      <AppText className="text-[12.5px] text-[#5A6772]">
                        {formatEventTime(event.at)}
                        {event.detail ? ` · ${event.detail}` : ''}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        className="gap-1.5 border-t border-[#EEF2F6] bg-white px-4 pt-2.5"
        style={{ paddingBottom: 16 + insets.bottom }}
      >
        {item.locked ? (
          <AppText className="text-center text-[12.5px] text-[#5A6772]">
            Đang giao dịch{partnerName ? ` · với ${partnerName}` : ''} · mở khoá khi giao dịch xong
            hoặc bị huỷ
          </AppText>
        ) : null}
        <View className="flex-row gap-2.5">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: item.locked }}
            disabled={item.locked}
            onPress={() => router.push({ pathname: '/stock/[id]/edit', params: { id: item.id } })}
            className={`h-[50px] flex-1 items-center justify-center rounded-[14px] border-[1.5px] bg-white ${
              item.locked ? 'border-[#E1E7ED]' : 'border-[#C9DDF4]'
            }`}
          >
            <AppText
              className={`text-[15px] font-vn-semibold ${
                item.locked ? 'text-[#A3AEB9]' : 'text-[#1673D9]'
              }`}
            >
              Chỉnh sửa
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: item.locked }}
            disabled={item.locked}
            onPress={startPosting}
            style={{ flex: 1.5 }}
            className={`h-[50px] items-center justify-center rounded-[14px] ${
              item.locked ? 'bg-[#E1E7ED]' : 'bg-[#1673D9]'
            }`}
          >
            <AppText
              className={`text-[15px] font-vn-bold ${item.locked ? 'text-[#A3AEB9]' : 'text-white'}`}
            >
              {openListings.length > 0 ? 'Đăng thêm hình thức' : 'Đăng tin'}
            </AppText>
          </Pressable>
        </View>
      </View>

      {sheet === 'more' ? (
        <BottomSheet title={item.title} onClose={() => setSheet(null)}>
          <View className="-mx-2">
            <MoreRow
              label="Chỉnh sửa"
              icon={ICON_PENCIL}
              sub={item.locked ? 'Khoá khi đang giao dịch' : undefined}
              disabled={item.locked}
              onPress={() => {
                setSheet(null);
                router.push({ pathname: '/stock/[id]/edit', params: { id: item.id } });
              }}
            />
            <MoreRow label="Gắn tag" icon={ICON_TAG} onPress={() => setSheet('tags')} />
            <MoreRow
              label="Ghi chú riêng"
              icon={ICON_NOTE}
              onPress={() => {
                setSheet(null);
                setEditingNote(true);
              }}
            />
            <MoreRow
              label="Xoá khỏi Kho đồ"
              icon={ICON_TRASH}
              danger
              sub={item.deleteBlockedReason ?? undefined}
              disabled={Boolean(item.deleteBlockedReason)}
              onPress={() => setSheet('delete')}
            />
          </View>
        </BottomSheet>
      ) : null}

      {sheet === 'tags' ? (
        <TagSheet
          itemId={item.id}
          current={item.tags.map((entry) => entry.tag)}
          onClose={() => setSheet(null)}
          onSaved={async () => {
            setSheet(null);
            await refresh();
          }}
        />
      ) : null}

      {sheet === 'delete' ? (
        <BottomSheet title="Xoá khỏi Kho đồ?" onClose={() => setSheet(null)}>
          <AppText className="text-[14px] leading-[21.7px] text-[#33414D]">
            {item.title} cùng ảnh và ghi chú sẽ bị xoá khỏi kho. Các giao dịch đã hoàn tất vẫn giữ
            trong lịch sử của hai bên. Không thể hoàn tác.
          </AppText>
          <View className="flex-row gap-2.5">
            <BarButton label="Đóng" tone="tinted" onPress={() => setSheet(null)} />
            <BarButton
              label="Xoá món"
              tone="danger"
              flex={1.4}
              loading={remove.isPending}
              onPress={() => remove.mutate()}
            />
          </View>
        </BottomSheet>
      ) : null}
      {postGuard.sheet}
    </View>
  );
}

function ListingRow({
  listing,
  first,
  onOpen,
}: {
  listing: ItemListingSummary;
  first: boolean;
  onOpen: () => void;
}) {
  const closed = listing.status === 'closed';
  const form = FORM[listing.type];
  const statusText = closed
    ? `Đã đóng${listing.closedAt ? ` ${formatDayMonth(new Date(listing.closedAt))}` : ''}`
    : (LISTING_STATUS[listing.status] ?? listing.status);
  const badge = !closed && listing.offerCount > 0 ? String(listing.offerCount) : null;
  const statusColor = closed ? '#5A6772' : listing.status === 'draft' ? '#B42318' : '#1673D9';

  return (
    <View className={first ? '' : 'border-t border-[#EEF2F6]'}>
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        className="flex-row items-center gap-3 bg-white px-3.5 py-3"
      >
        <CatIcon kind={form.icon} size={30} />
        <View className="min-w-0 flex-1 gap-[3px]">
          <View className="flex-row items-center gap-1.5">
            <AppText className="text-[14px] font-vn-bold">{form.label}</AppText>
            <AppText className="text-[12px] font-vn-semibold" style={{ color: statusColor }}>
              · {statusText}
            </AppText>
          </View>
          <AppText
            numberOfLines={1}
            className={`text-[13.5px] font-vn-semibold ${closed ? 'text-[#5A6772]' : ''}`}
          >
            {listing.main}
          </AppText>
          <AppText className="text-[12px] text-[#5A6772]">{listing.meta}</AppText>
        </View>
        {badge ? (
          <View className="h-5 min-w-5 items-center justify-center rounded-full bg-[#F0533A] px-1.5">
            <AppText className="text-[11.5px] font-vn-bold text-white">{badge}</AppText>
          </View>
        ) : null}
        {closed ? (
          <View className="h-8 justify-center rounded-[10px] bg-[#E6F1FF] px-3">
            <AppText className="text-[13px] font-vn-bold text-[#1673D9]">Đăng lại</AppText>
          </View>
        ) : null}
        <PathIcon d={ICON_CHEVRON_RIGHT} size={16} color="#A3AEB9" />
      </Pressable>
    </View>
  );
}

function NoteSection(props: {
  itemId: string;
  note: string | null;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  onSaved: () => Promise<void>;
}) {
  const { itemId, note, editing, onEdit, onDone, onSaved } = props;
  const { getIdToken } = useAuth();
  const [draft, setDraft] = useState(note ?? '');

  const save = useMutation({
    mutationFn: async (text: string) => saveItemNote(await getIdToken(), itemId, text),
    onSuccess: async () => {
      await onSaved();
      onDone();
    },
    onError: (caught) => Alert.alert('Không lưu được ghi chú', caught.message || 'Thử lại sau.'),
  });

  function commit() {
    const text = draft.trim();
    if (text === (note ?? '')) onDone();
    else save.mutate(text);
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-baseline gap-2">
        <AppText accessibilityRole="header" className="text-[16px] font-vn-bold">
          Ghi chú riêng
        </AppText>
        <View className="flex-row items-center gap-1">
          <Svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5A6772"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Rect x={5} y={11} width={14} height={10} rx={2} />
            <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </Svg>
          <AppText className="text-[12.5px] text-[#5A6772]">chỉ bạn thấy</AppText>
        </View>
      </View>
      {editing ? (
        <TextInput
          autoFocus
          accessibilityLabel="Ghi chú riêng"
          value={draft}
          maxLength={ITEM_NOTE_MAX_LENGTH}
          editable={!save.isPending}
          onChangeText={setDraft}
          onBlur={commit}
          placeholder={NOTE_PLACEHOLDER}
          placeholderTextColor="#A3AEB9"
          multiline
          textAlignVertical="top"
          className="min-h-[72px] rounded-xl bg-[#F7F9FB] px-3.5 py-3 font-vn text-[14px] leading-[21px] text-[#33414D]"
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setDraft(note ?? '');
            onEdit();
          }}
          className="min-h-12 rounded-xl bg-[#F7F9FB] px-3.5 py-3"
        >
          <AppText
            className={`text-[14px] leading-[21px] ${note ? 'text-[#33414D]' : 'text-[#A3AEB9]'}`}
          >
            {note || NOTE_PLACEHOLDER}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

function MoreRow(props: {
  label: string;
  icon: string;
  sub?: string;
  disabled?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  const { label, icon, sub, disabled, danger, onPress } = props;
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

function TagSheet({
  itemId,
  current,
  onClose,
  onSaved,
}: {
  itemId: string;
  current: string[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { session, getIdToken } = useAuth();
  const [selected, setSelected] = useState<string[]>(current);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [created, setCreated] = useState<string[]>([]);
  const { data } = useQuery({
    queryKey: [...MY_TAGS_QUERY_KEY, session?.uid],
    queryFn: async () => fetchMyTags(await getIdToken()),
    enabled: !!session,
  });

  const known = data?.tags ?? [];
  const names = [...new Set([...known.map((entry) => entry.tag), ...current, ...created])];
  const colorOf = (name: string) => known.find((entry) => entry.tag === name)?.color ?? '#1673D9';

  const save = useMutation({
    mutationFn: async () => updateMyItem(await getIdToken(), itemId, { tags: selected }),
    onSuccess: onSaved,
    onError: (caught) => Alert.alert('Không lưu được tag', caught.message || 'Thử lại sau.'),
  });

  function toggle(name: string) {
    if (selected.includes(name)) {
      setSelected((now) => now.filter((entry) => entry !== name));
    } else if (selected.length >= ITEM_TAGS_MAX_COUNT) {
      Alert.alert('Chưa thêm được tag', `Tối đa ${ITEM_TAGS_MAX_COUNT} tag.`);
    } else {
      setSelected((now) => [...now, name]);
    }
  }

  function addDraft() {
    const name = draft.trim().toLowerCase().slice(0, ITEM_TAG_MAX_LENGTH);
    setDraft('');
    setAdding(false);
    if (!name) return;
    if (!names.includes(name)) setCreated((now) => [...now, name]);
    if (!selected.includes(name)) toggle(name);
  }

  return (
    <BottomSheet title="Gắn tag" onClose={onClose}>
      <View className="flex-row flex-wrap gap-2">
        {names.map((name) => {
          const on = selected.includes(name);
          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => toggle(name)}
              className={`h-9 flex-row items-center gap-1.5 rounded-full border-[1.5px] px-3 ${
                on ? 'border-[#1673D9] bg-[#E6F1FF]' : 'border-[#D5DDE5] bg-white'
              }`}
            >
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colorOf(name) }} />
              <AppText className="text-[13.5px] font-vn-semibold">{name}</AppText>
              {on ? (
                <Svg
                  width={13}
                  height={13}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1673D9"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="M5 12l5 5 9-10" />
                </Svg>
              ) : null}
            </Pressable>
          );
        })}
        {adding ? (
          <TextInput
            autoFocus
            accessibilityLabel="Tag mới"
            value={draft}
            maxLength={ITEM_TAG_MAX_LENGTH}
            onChangeText={setDraft}
            onBlur={addDraft}
            onSubmitEditing={addDraft}
            placeholder="Tên tag"
            placeholderTextColor="#8A96A3"
            className="h-9 w-32 rounded-full border-[1.5px] border-dashed border-[#9CC3F0] bg-white px-3 py-0 font-vn-semibold text-[13.5px] text-[#0F2440]"
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setAdding(true)}
            className="h-9 justify-center rounded-full border-[1.5px] border-dashed border-[#9CC3F0] px-3"
          >
            <AppText className="text-[13.5px] font-vn-semibold text-[#1673D9]">+ Tag mới</AppText>
          </Pressable>
        )}
      </View>
      <View className="flex-row gap-2.5">
        <BarButton label="Huỷ" tone="tinted" onPress={onClose} />
        <BarButton label="Xong" flex={1.4} loading={save.isPending} onPress={() => save.mutate()} />
      </View>
    </BottomSheet>
  );
}

export default function StockItemScreen() {
  return (
    <RequireSession>
      <StockItemContent />
    </RequireSession>
  );
}
