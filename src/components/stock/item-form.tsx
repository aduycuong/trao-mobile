import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { CatIcon } from '@/components/icons/cat-icon';
import { ConfirmSheet } from '@/components/me/confirm-sheet';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { BarButton, ErrorBox, Switch } from '@/components/ui/form-controls';
import { ICON_CLOSE, ICON_PLUS, ICON_TRASH, PathIcon } from '@/components/ui/path-icon';
import { useAuth } from '@/hooks/useAuth';
import { useGoBack } from '@/hooks/useGoBack';
import { CameraPermissionError } from '@/services/avatar-upload';
import {
  captureItemPhoto,
  pickItemMedia,
  uploadItemPhoto,
  uploadItemVideo,
  videoProblem,
  type PickedMedia,
} from '@/services/stock/media-upload';
import {
  createMyItem,
  fetchMyItem,
  fetchMyTags,
  itemQueryKey,
  MY_ITEMS_QUERY_KEY,
  MY_TAGS_QUERY_KEY,
  previewItem,
  updateMyItem,
} from '@/services/stock/items-api';
import {
  ITEM_CAPTION_MAX_LENGTH,
  ITEM_CONDITIONS,
  ITEM_DESCRIPTION_MAX_LENGTH,
  ITEM_MEDIA_MAX_COUNT,
  ITEM_TAGS_MAX_COUNT,
  ITEM_TAG_MAX_LENGTH,
  type CreateItemBody,
  type ItemCondition,
  type ItemDetail,
} from '@/types/stock';
import { formatClipDuration } from '@/utils/format';
import { planPicks } from '@/utils/media-rules';
import { sameMedia, tilesOf, type Tile } from '@/utils/item-form';
import { StackSkeleton } from '@/components/ui/skeletons';
import { useBottomInset } from '@/hooks/useBottomInset';
import { MY_LISTINGS_QUERY_KEY } from '@/services/listings/listings-api';

const PLACEHOLDER =
  'Ví dụ: iPhone 13 128GB xanh, mua 2022, pin 89%, xước nhẹ cạnh dưới, kèm ốp và cáp. Mua dịp tốt nghiệp, giờ đổi máy nên bán lại.';
/** Files uploaded at the same time. */
const UPLOAD_CONCURRENCY = 3;
const FALLBACK_TAG_COLOR = '#5A6772';
const PREVIEW_STALE_MS = 15 * 60 * 1000;

type ItemFormProps = {
  /** Edit this item (Chỉnh sửa) instead of adding a new one. */
  itemId?: string;
  /** `post`: Thêm đồ as step 1 of Đăng tin. */
  flow?: 'post';
  /** Opened from the edit of this listing: after saving a change of the item, show that listing's "sent" screen. */
  afterSave?: { listingId: string };
};

/** Thêm đồ (/stock/new) and Chỉnh sửa (/stock/[id]/edit), canvas Post step "item". */
export function ItemForm({ itemId, flow, afterSave }: ItemFormProps) {
  const { session, getIdToken } = useAuth();
  const goBack = useGoBack(itemId ? { pathname: '/stock/[id]', params: { id: itemId } } : '/stock');
  const insets = useSafeAreaInsets();

  const {
    data: item,
    error,
    refetch,
    isPending,
  } = useQuery({
    queryKey: itemQueryKey(itemId ?? '', session?.uid),
    queryFn: async () => fetchMyItem(await getIdToken(), itemId!),
    enabled: !!itemId && !!session,
  });

  if (itemId && isPending) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <FormBar title="Chỉnh sửa" onClose={goBack} />
        <StackSkeleton blocks={['h-28 rounded-[14px]', 'h-10', 'h-36 rounded-[14px]']} />
      </View>
    );
  }
  if (itemId && (error || !item)) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <FormBar title="Chỉnh sửa" onClose={goBack} />
        <ErrorBox
          message={error?.message ?? 'Không tìm thấy món.'}
          onRetry={() => refetch()}
          onBack={goBack}
        />
      </View>
    );
  }
  return (
    <ItemFormBody
      item={item ?? null}
      postFlow={flow === 'post' && !itemId}
      afterSave={afterSave}
      onClose={goBack}
    />
  );
}

function FormBar({ title, onClose, step }: { title: string; onClose: () => void; step?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center gap-1.5 border-b border-[#EEF2F6] bg-white pl-1 pr-3"
      style={{ height: 60 + insets.top, paddingTop: insets.top, marginTop: -insets.top }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đóng"
        onPress={onClose}
        className="h-11 w-11 items-center justify-center"
      >
        <PathIcon d={ICON_CLOSE} size={20} strokeWidth={2.2} />
      </Pressable>
      <AppText accessibilityRole="header" className="flex-1 text-[18px] font-vn-bold">
        {title}
      </AppText>
      {step ? (
        <AppText className="text-[13px] font-vn-semibold text-[#5A6772]">{step}</AppText>
      ) : null}
    </View>
  );
}

function ItemFormBody({
  item,
  postFlow,
  afterSave,
  onClose,
}: {
  item: ItemDetail | null;
  postFlow: boolean;
  afterSave?: { listingId: string };
  onClose: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { session, getIdToken } = useAuth();

  const initial = item ? tilesOf(item) : { photos: [], videos: [] };
  const initialTags = item?.tags.map((entry) => entry.tag) ?? [];
  const [photos, setPhotos] = useState<Tile[]>(initial.photos);
  const [videos, setVideos] = useState<Tile[]>(initial.videos);
  const [pending, setPending] = useState<Tile[]>([]);
  const [openTile, setOpenTile] = useState<string | null>(null);
  const [condition, setCondition] = useState<ItemCondition | null>(item?.condition ?? null);
  const [description, setDescription] = useState(item?.sourceDescription ?? '');
  const [aiOn, setAiOn] = useState(false);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagText, setTagText] = useState('');
  const [tagFocused, setTagFocused] = useState(false);
  const [saveUnclear, setSaveUnclear] = useState<string | null>(null);
  /** Saving an edit of the content waits for this when it would decline offers. */
  const [confirmingSave, setConfirmingSave] = useState<'stock' | 'post' | null>(null);
  /** The item just added from Kho đồ, while "Đăng tin luôn không?" is open. */
  const [added, setAdded] = useState<ItemDetail | null>(null);

  const { data: myTags } = useQuery({
    queryKey: [...MY_TAGS_QUERY_KEY, session?.uid],
    queryFn: async () => fetchMyTags(await getIdToken()),
    enabled: !!session,
  });
  const known = myTags?.tags ?? [];
  const colorOf = (name: string) =>
    known.find((entry) => entry.tag === name)?.color ?? FALLBACK_TAG_COLOR;

  const trimmed = description.trim();
  const preview = useQuery({
    queryKey: ['item-preview', session?.uid, trimmed, condition ?? 'good'],
    queryFn: async () =>
      previewItem(await getIdToken(), { description: trimmed, condition: condition ?? 'good' }),
    enabled: aiOn && trimmed.length > 0,
    staleTime: PREVIEW_STALE_MS,
    retry: false,
  });
  const aiActive = aiOn && !preview.isError;
  const unclear = aiOn && preview.isError ? preview.error.message : saveUnclear;
  const previewContent = aiActive ? preview.data : undefined;

  const total = photos.length + videos.length + pending.length;
  const uploading = pending.length > 0;
  const canSave = trimmed.length > 0 && condition !== null;

  const save = useMutation({
    // The variable (`'stock'` or `'post'`) only says where to go next; `onSuccess` reads it.
    mutationFn: async (_after: 'stock' | 'post') => {
      const token = await getIdToken();
      const toBody = (list: Tile[]) =>
        list.map((entry) => ({
          mediaId: entry.mediaId!,
          caption: entry.caption.trim() || undefined,
        }));
      const photoBody = toBody(photos);
      const videoBody = toBody(videos);
      if (!item) {
        const body: CreateItemBody = {
          description: trimmed,
          condition: condition!,
          photos: photoBody,
          videos: videoBody,
          tags,
        };
        return createMyItem(token, body);
      }
      const before = tilesOf(item);
      const body: Partial<CreateItemBody> = {};
      if (trimmed !== (item.sourceDescription ?? '')) body.description = trimmed;
      if (condition !== item.condition) body.condition = condition!;
      if (!sameMedia(photos, before.photos)) body.photos = photoBody;
      if (!sameMedia(videos, before.videos)) body.videos = videoBody;
      if (JSON.stringify([...tags].sort()) !== JSON.stringify([...initialTags].sort())) {
        body.tags = tags;
      }
      if (Object.keys(body).length === 0) return { id: item.id };
      return updateMyItem(token, item.id, body);
    },
    onSuccess: async (result, after) => {
      // Only a change of the content goes to review; tags alone do not.
      const sentToReview = contentEdited();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: MY_ITEMS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MY_TAGS_QUERY_KEY }),
        // The listings of the item show its title and cover, and may go back for review.
        queryClient.invalidateQueries({ queryKey: MY_LISTINGS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['listing'] }),
        queryClient.invalidateQueries({ queryKey: ['item', result.id] }),
      ]);
      if (item) {
        // Back to where the edit was opened from (the item page, or the post flow), not a new
        // item page on top of it; the item page is the fallback when the edit was opened first.
        // From the edit of a listing the person only wanted the item changed: show that listing's
        // "Đã gửi bản sửa" screen, as if the listing itself had been edited.
        if (afterSave && sentToReview) {
          router.dismissTo({
            pathname: '/listings/[id]/edit',
            params: { id: afterSave.listingId, sent: '1' },
          });
        } else onClose();
      } else if (postFlow && after === 'post') {
        router.replace({ pathname: '/stock/[id]/post', params: { id: result.id, from: 'new' } });
      } else if (postFlow) {
        router.replace('/stock');
      } else {
        const created = await fetchMyItem(await getIdToken(), result.id).catch(() => null);
        if (created) setAdded(created);
        else router.replace('/stock');
      }
    },
    onError: (caught) => {
      const message = caught.message || 'Không lưu được. Thử lại sau.';
      if (/mô tả/i.test(message)) setSaveUnclear(message);
      Alert.alert('Chưa lưu được', message);
    },
  });

  /**
   * Uploads the picked files, a few at a time. A file is done when the server has accepted it
   * (`complete`): its check goes on after the item is saved, so nothing here waits for it.
   * Tiles keep the order they were picked in.
   */
  async function addPicks(picks: PickedMedia[]) {
    if (picks.length === 0) return;
    const usable: PickedMedia[] = [];
    for (const pick of picks) {
      const problem = pick.kind === 'video' ? videoProblem(pick) : null;
      if (problem) Alert.alert('Chưa dùng được video này', problem);
      else usable.push(pick);
    }
    const { accepted, errors } = planPicks(
      {
        total,
        videos: videos.length + pending.filter((entry) => entry.kind === 'video').length,
      },
      usable
    );
    if (errors.length > 0) Alert.alert('Chưa thêm hết được', errors.join('\n'));
    if (accepted.length === 0) return;

    const entries = accepted.map((pick) => ({
      pick,
      tile: {
        id: randomUUID(),
        kind: pick.kind,
        mediaId: null,
        url: pick.kind === 'photo' ? pick.uri : null,
        caption: '',
        durationMs: pick.durationMs,
      } satisfies Tile,
    }));
    setPending((now) => [...now, ...entries.map((entry) => entry.tile)]);

    const token = await getIdToken();
    // `null`: the file failed. `undefined`: not finished yet.
    const results: (Tile | null | undefined)[] = new Array(entries.length).fill(undefined);
    let flushed = 0;
    const flush = () => {
      const done: Tile[] = [];
      const gone = new Set<string>();
      while (flushed < results.length && results[flushed] !== undefined) {
        const result = results[flushed];
        if (result) done.push(result);
        gone.add(entries[flushed]!.tile.id);
        flushed += 1;
      }
      if (gone.size === 0) return;
      setPhotos((now) => [...now, ...done.filter((entry) => entry.kind === 'photo')]);
      setVideos((now) => [...now, ...done.filter((entry) => entry.kind === 'video')]);
      setPending((now) => now.filter((entry) => !gone.has(entry.id)));
    };

    let next = 0;
    const worker = async () => {
      for (;;) {
        const index = next;
        next += 1;
        if (index >= entries.length) return;
        const { pick, tile } = entries[index]!;
        try {
          const sent =
            pick.kind === 'video'
              ? await uploadItemVideo(token, pick)
              : await uploadItemPhoto(token, pick);
          results[index] = {
            ...tile,
            mediaId: sent.id,
            durationMs: sent.durationMs ?? tile.durationMs,
          };
        } catch (caught) {
          Alert.alert(
            'Không tải lên được',
            caught instanceof Error ? caught.message : 'Thử lại sau.'
          );
          results[index] = null;
        }
        flush();
      }
    };
    await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, entries.length) }, worker));
  }

  async function choose(source: 'library' | 'camera') {
    try {
      const room = Math.max(1, ITEM_MEDIA_MAX_COUNT - total);
      const picks = source === 'camera' ? await captureItemPhoto() : await pickItemMedia(room);
      await addPicks(picks);
    } catch (caught) {
      if (caught instanceof CameraPermissionError) {
        Alert.alert(
          'Chưa mở được máy ảnh',
          caught.canAskAgain
            ? 'Hãy cho phép Trao dùng máy ảnh để chụp ảnh đồ.'
            : 'Hãy bật quyền máy ảnh cho Trao trong Cài đặt của điện thoại.'
        );
      } else {
        Alert.alert('Chưa thêm được', caught instanceof Error ? caught.message : 'Thử lại sau.');
      }
    }
  }

  function askSource() {
    if (total >= ITEM_MEDIA_MAX_COUNT) {
      Alert.alert('Đã đủ ảnh và video', `Tối đa ${ITEM_MEDIA_MAX_COUNT} ảnh và video.`);
      return;
    }
    Alert.alert('Thêm ảnh hoặc video', undefined, [
      { text: 'Chọn từ thư viện', onPress: () => void choose('library') },
      { text: 'Chụp ảnh', onPress: () => void choose('camera') },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  }

  function toggleAi() {
    if (aiActive) {
      setAiOn(false);
      return;
    }
    setAiOn(true);
    setSaveUnclear(null);
    if (preview.isError) void preview.refetch();
  }

  function addTag(raw: string) {
    const name = raw.trim().toLowerCase().slice(0, ITEM_TAG_MAX_LENGTH);
    setTagText('');
    if (!name || tags.includes(name)) return;
    if (tags.length >= ITEM_TAGS_MAX_COUNT) {
      Alert.alert('Chưa thêm được tag', `Tối đa ${ITEM_TAGS_MAX_COUNT} tag.`);
      return;
    }
    setTags((now) => [...now, name]);
  }

  function removeTile(tile: Tile) {
    if (tile.kind === 'video') setVideos((now) => now.filter((entry) => entry.id !== tile.id));
    else setPhotos((now) => now.filter((entry) => entry.id !== tile.id));
    setOpenTile(null);
  }

  /** The words, the condition or the files differ from the saved item (tags are not content). */
  function contentEdited(): boolean {
    if (!item) return false;
    const before = tilesOf(item);
    return (
      trimmed !== (item.sourceDescription ?? '') ||
      condition !== item.condition ||
      !sameMedia(photos, before.photos) ||
      !sameMedia(videos, before.videos)
    );
  }

  function submitForm(after: 'stock' | 'post') {
    if (!canSave || save.isPending) return;
    if (uploading) {
      Alert.alert('Đợi một chút', 'Đợi ảnh tải xong rồi lưu nhé.');
      return;
    }
    // Offers were sent on the version on show: changing it declines them.
    if (item && item.waitingOffers > 0 && contentEdited()) {
      setConfirmingSave(after);
      return;
    }
    save.mutate(after);
  }

  const conditionHint =
    ITEM_CONDITIONS.find((entry) => entry.code === condition)?.hint ??
    'Chọn mức gần đúng nhất để người mua so sánh được';
  const tagQuery = tagText.trim().toLowerCase();
  const suggestions = known.filter(
    (entry) => !tags.includes(entry.tag) && (tagQuery ? entry.tag.includes(tagQuery) : true)
  );
  const typing = tagFocused && tagQuery.length > 0;
  const openTileData = [...photos, ...videos].find((entry) => entry.id === openTile) ?? null;
  const setCaption = (tile: Tile, value: string) => {
    const apply = (list: Tile[]) =>
      list.map((entry) => (entry.id === tile.id ? { ...entry, caption: value } : entry));
    if (tile.kind === 'video') setVideos(apply);
    else setPhotos(apply);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top }}
    >
      <FormBar
        title={item ? 'Chỉnh sửa' : 'Thêm đồ'}
        onClose={onClose}
        step={postFlow ? 'Bước 1/3' : undefined}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-[22px] px-4 pb-6 pt-4"
      >
        <View className="gap-2.5">
          <View className="flex-row items-baseline justify-between">
            <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
              Ảnh và video
            </AppText>
            <AppText className="text-[12.5px] text-[#5A6772]">
              {total}/{ITEM_MEDIA_MAX_COUNT}
            </AppText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 pb-0.5"
          >
            <Pressable
              accessibilityRole="button"
              onPress={askSource}
              className="h-28 w-[92px] items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-[#9CC3F0] bg-[#F1F7FE]"
            >
              <Svg
                width={26}
                height={26}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1673D9"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M4 8h3l2-2h6l2 2h3v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              </Svg>
              <AppText className="text-[12.5px] font-vn-semibold text-[#1673D9]">Thêm ảnh</AppText>
            </Pressable>
            {[...photos, ...videos].map((tile, index) => (
              <View key={tile.id} className="w-[92px] gap-[5px]">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    tile.kind === 'video'
                      ? `Video ${index - photos.length + 1}: thêm mô tả`
                      : `Ảnh ${index + 1}: thêm mô tả`
                  }
                  onPress={() => setOpenTile(tile.id)}
                  className="h-28 w-[92px] overflow-hidden rounded-[14px] bg-[#DCEBFB]"
                >
                  <TileMedia tile={tile} />
                  {tile.kind === 'photo' && index === 0 ? (
                    <View className="absolute left-1.5 top-1.5 rounded-md bg-[#0F2440]/75 px-[7px] py-0.5">
                      <AppText className="text-[10.5px] font-vn-bold text-white">Ảnh bìa</AppText>
                    </View>
                  ) : null}
                  {tile.kind === 'video' ? (
                    <View className="absolute left-1.5 top-1.5 rounded-md bg-[#0F2440]/75 px-[7px] py-0.5">
                      <AppText className="text-[10.5px] font-vn-bold text-white">
                        ▶ {formatClipDuration(tile.durationMs ?? 0)}
                      </AppText>
                    </View>
                  ) : null}
                </Pressable>
                <Pressable onPress={() => setOpenTile(tile.id)}>
                  <AppText
                    numberOfLines={1}
                    className={`text-[11.5px] leading-[15px] ${
                      tile.caption ? 'text-[#33414D]' : 'font-vn-semibold text-[#1673D9]'
                    }`}
                  >
                    {tile.caption || '+ Mô tả'}
                  </AppText>
                </Pressable>
              </View>
            ))}
            {pending.map((tile) => (
              <View
                key={tile.id}
                accessibilityLabel="Đang tải lên"
                className="h-28 w-[92px] items-center justify-center overflow-hidden rounded-[14px] bg-[#DCEBFB]"
              >
                {tile.kind === 'photo' && tile.url ? (
                  <Image
                    source={{ uri: tile.url }}
                    style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.5 }}
                    contentFit="cover"
                  />
                ) : null}
                <AppText className="text-[11.5px] font-vn-semibold text-[#0B4A99]">
                  Đang tải…
                </AppText>
              </View>
            ))}
          </ScrollView>
          <AppText className="text-[12.5px] leading-[18px] text-[#5A6772]">
            Nên có 3–6 ảnh thật. Bấm vào ảnh hoặc video để thêm mô tả, ví dụ chỉ chỗ vết xước.
          </AppText>
        </View>

        <View className="gap-2.5">
          <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
            Tình trạng
          </AppText>
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
            {ITEM_CONDITIONS.map((entry) => {
              const on = entry.code === condition;
              return (
                <Pressable
                  key={entry.code}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setCondition(entry.code)}
                  className={`h-[38px] justify-center rounded-full border-[1.5px] px-3.5 ${
                    on ? 'border-[#0F2440] bg-[#0F2440]' : 'border-[#D5DDE5] bg-white'
                  }`}
                >
                  <AppText
                    className={`text-[13.5px] font-vn-semibold ${on ? 'text-white' : 'text-[#0F2440]'}`}
                  >
                    {entry.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <AppText className="text-[12.5px] text-[#5A6772]">{conditionHint}</AppText>
        </View>

        <View className="gap-2.5">
          <View className="flex-row items-center gap-2">
            <AppText accessibilityRole="header" className="flex-1 text-[15px] font-vn-bold">
              Mô tả món đồ
            </AppText>
            {trimmed.length > 0 ? (
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: aiActive }}
                onPress={toggleAi}
                className="flex-row items-center gap-2"
              >
                <Svg
                  width={15}
                  height={15}
                  viewBox="0 0 24 24"
                  fill="#FFC22E"
                  stroke="#E8A200"
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                >
                  <Path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
                </Svg>
                <AppText
                  className={`text-[13px] font-vn-semibold ${
                    aiActive ? 'text-[#0B4A99]' : 'text-[#5A6772]'
                  }`}
                >
                  Trình bày
                </AppText>
                <Switch on={aiActive} large={false} />
              </Pressable>
            ) : null}
          </View>

          {!aiActive ? (
            <TextInput
              accessibilityLabel="Mô tả món đồ"
              value={description}
              maxLength={ITEM_DESCRIPTION_MAX_LENGTH}
              onChangeText={(text) => {
                setDescription(text);
                setSaveUnclear(null);
                if (aiOn) setAiOn(false);
              }}
              placeholder={PLACEHOLDER}
              placeholderTextColor="#8A96A3"
              multiline
              textAlignVertical="top"
              className={`min-h-[150px] rounded-[14px] border-[1.5px] bg-white p-3.5 font-vn text-[14.5px] leading-[23px] text-[#0F2440] ${
                unclear ? 'border-[#B42318]' : trimmed ? 'border-[#1673D9]' : 'border-[#D5DDE5]'
              }`}
            />
          ) : null}
          {unclear && !aiActive ? (
            <AppText
              accessibilityRole="alert"
              className="text-[12.5px] leading-[18px] text-[#B42318]"
            >
              {unclear}
            </AppText>
          ) : null}

          {aiActive && !previewContent ? (
            <View
              accessibilityLabel="Trao đang viết lại"
              className="min-h-[150px] gap-2.5 rounded-[14px] bg-[#F1F7FE] p-3.5"
            >
              <AppText className="text-[13px] font-vn-bold text-[#0B4A99]">
                Trao đang đọc mô tả…
              </AppText>
              <View className="h-4 w-3/4 rounded-md bg-[#E6F1FF]" />
              <View className="h-3.5 w-[45%] rounded-md bg-[#E6F1FF]" />
              <View className="h-3.5 w-[90%] rounded-md bg-[#E6F1FF]" />
              <View className="h-3.5 w-3/5 rounded-md bg-[#E6F1FF]" />
            </View>
          ) : null}
          {previewContent ? (
            <View className="gap-3 rounded-[14px] border-[1.5px] border-[#9CC3F0] bg-[#F1F7FE] p-3.5">
              <AppText className="text-[16px] font-vn-bold leading-[21.6px]">
                {previewContent.title}
              </AppText>
              <View className="flex-row flex-wrap gap-2">
                {[
                  ...(previewContent.categoryName
                    ? [{ key: 'Danh mục', value: previewContent.categoryName }]
                    : []),
                  ...previewContent.attributes,
                ].map((attribute) => (
                  <View
                    key={attribute.key}
                    className="gap-px rounded-[10px] bg-white px-2.5 py-2"
                    style={{ width: '48.5%' }}
                  >
                    <AppText className="text-[11.5px] text-[#5A6772]">{attribute.key}</AppText>
                    <AppText className="text-[13.5px] font-vn-semibold">{attribute.value}</AppText>
                  </View>
                ))}
              </View>
              <AppText className="text-[14px] leading-[22.4px] text-[#33414D]">
                {previewContent.description}
              </AppText>
              {previewContent.story ? (
                <AppText className="rounded-[10px] bg-[#FFF9EA] px-3 py-2.5 text-[13.5px] italic leading-[20px] text-[#3D2A00]">
                  “{previewContent.story}”
                </AppText>
              ) : null}
              <AppText className="text-[12.5px] leading-[18px] text-[#5A6772]">
                Đây là bản hiển thị trên tin. Muốn sửa thì tắt Trình bày và sửa mô tả gốc.
              </AppText>
            </View>
          ) : null}
        </View>

        <View className="gap-2.5">
          <View className="flex-row items-baseline gap-2">
            <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
              Tag
            </AppText>
            <AppText className="text-[12.5px] text-[#5A6772]">để tìm lại trong Kho đồ</AppText>
          </View>
          <View
            className={`min-h-12 flex-row flex-wrap items-center gap-2 rounded-xl border-[1.5px] px-2.5 py-[7px] ${
              typing ? 'border-[#1673D9]' : 'border-[#D5DDE5]'
            }`}
          >
            {tags.map((name) => (
              <View
                key={name}
                className="h-[30px] flex-row items-center gap-1.5 rounded-full bg-[#F2F5F8] pl-2.5 pr-1.5"
              >
                <View
                  className="h-[7px] w-[7px] rounded-full"
                  style={{ backgroundColor: colorOf(name) }}
                />
                <AppText className="text-[13px] font-vn-semibold">{name}</AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Bỏ tag ${name}`}
                  onPress={() => setTags((now) => now.filter((entry) => entry !== name))}
                  className="h-[22px] w-[22px] items-center justify-center rounded-full"
                >
                  <PathIcon d={ICON_CLOSE} size={12} color="#5A6772" strokeWidth={2.6} />
                </Pressable>
              </View>
            ))}
            <TextInput
              accessibilityLabel="Thêm tag"
              value={tagText}
              maxLength={ITEM_TAG_MAX_LENGTH}
              onChangeText={setTagText}
              onFocus={() => setTagFocused(true)}
              onBlur={() => setTagFocused(false)}
              onSubmitEditing={() => addTag(tagText)}
              blurOnSubmit={false}
              returnKeyType="done"
              placeholder={tags.length > 0 ? 'Thêm tag…' : 'Gõ để thêm tag'}
              placeholderTextColor="#8A96A3"
              className="h-[30px] min-w-20 flex-1 px-1 py-0 font-vn text-[14px] text-[#0F2440]"
            />
          </View>
          {typing ? (
            <View
              accessibilityLabel="Gợi ý tag"
              className="overflow-hidden rounded-xl border border-[#E1E7EE] bg-white"
            >
              {suggestions.slice(0, 5).map((entry, index) => (
                <Pressable
                  key={entry.tag}
                  accessibilityRole="button"
                  onPress={() => addTag(entry.tag)}
                  className={`min-h-11 flex-row items-center gap-2.5 bg-white px-3.5 ${
                    index > 0 ? 'border-t border-[#F0F3F6]' : ''
                  }`}
                >
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <AppText className="flex-1 text-[14px]">{entry.tag}</AppText>
                  <AppText className="text-[12px] text-[#5A6772]">{entry.count} món</AppText>
                </Pressable>
              ))}
              {!known.some((entry) => entry.tag === tagQuery) && !tags.includes(tagQuery) ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => addTag(tagText)}
                  className={`min-h-11 flex-row items-center gap-2.5 bg-[#F7FBFF] px-3.5 ${
                    suggestions.length > 0 ? 'border-t border-[#F0F3F6]' : ''
                  }`}
                >
                  <PathIcon d={ICON_PLUS} size={14} color="#1673D9" strokeWidth={2.6} />
                  <AppText className="text-[14px] text-[#1673D9]">
                    Tạo tag mới “
                    <AppText className="font-vn-bold text-[#1673D9]">{tagText.trim()}</AppText>”
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {!typing && known.some((entry) => !tags.includes(entry.tag)) ? (
            <View className="flex-row flex-wrap gap-1.5">
              {known
                .filter((entry) => !tags.includes(entry.tag))
                .slice(0, 4)
                .map((entry) => (
                  <Pressable
                    key={entry.tag}
                    accessibilityRole="button"
                    onPress={() => addTag(entry.tag)}
                    className="h-[30px] flex-row items-center gap-[5px] rounded-full border-[1.5px] border-dashed border-[#C9D3DD] bg-white px-2.5"
                  >
                    <AppText className="text-[12.5px] font-vn-semibold text-[#33414D]">
                      + {entry.tag}
                    </AppText>
                  </Pressable>
                ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View
        className="flex-row gap-2 border-t border-[#E8ECF0] bg-white px-4 pt-2.5"
        style={{ paddingBottom: 18 + bottomInset }}
      >
        {postFlow ? (
          <BarButton
            label="Chỉ lưu vào Kho"
            tone="outline"
            disabled={!canSave || save.isPending}
            loading={save.isPending && save.variables === 'stock'}
            onPress={() => submitForm('stock')}
          />
        ) : null}
        <BarButton
          label={item ? 'Lưu thay đổi' : postFlow ? 'Tiếp: Đăng tin' : 'Thêm vào Kho đồ'}
          flex={1.3}
          disabled={!canSave || save.isPending}
          // Without the second button (editing, or adding outside the post flow) every save is
          // `'stock'`, so this button shows the progress then too.
          loading={save.isPending && (!postFlow || save.variables !== 'stock')}
          onPress={() => submitForm(postFlow ? 'post' : 'stock')}
        />
      </View>

      {added ? (
        <BottomSheet onClose={() => router.replace('/stock')}>
          <View className="flex-row items-center gap-3 rounded-2xl bg-[#F1F7FE] p-3">
            <View className="h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-xl bg-[#E3E9F5]">
              {added.photos[0] ? (
                <Image
                  source={{ uri: added.photos[0].thumbUrl }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <CatIcon kind="collect" size={34} />
              )}
            </View>
            <View className="min-w-0 flex-1 gap-0.5">
              <AppText className="text-[12.5px] font-vn-semibold text-[#2F9E63]">
                ✓ Đã thêm vào Kho đồ
              </AppText>
              <AppText numberOfLines={1} className="text-[15px] font-vn-semibold">
                {added.title}
              </AppText>
            </View>
          </View>
          <View className="gap-1">
            <AppText className="text-[19px] font-vn-bold">Đăng tin luôn không?</AppText>
            <AppText className="text-[14px] leading-[21px] text-[#5A6772]">
              Thông tin và ảnh vừa nhập sẽ được dùng sẵn cho tin đăng. Bạn có thể đăng sau từ Kho
              đồ.
            </AppText>
          </View>
          <View className="flex-row gap-2.5">
            <BarButton label="Để sau" tone="tinted" onPress={() => router.replace('/stock')} />
            <BarButton
              label="Đăng tin luôn"
              flex={1.4}
              onPress={() =>
                router.replace({
                  pathname: '/stock/[id]/post',
                  params: { id: added.id, from: 'stock' },
                })
              }
            />
          </View>
        </BottomSheet>
      ) : null}

      {openTileData ? (
        <BottomSheet
          title={
            openTileData.kind === 'video'
              ? `Video ${videos.findIndex((entry) => entry.id === openTileData.id) + 1}`
              : `Ảnh ${photos.findIndex((entry) => entry.id === openTileData.id) + 1}`
          }
          onClose={() => setOpenTile(null)}
        >
          <View className="h-[260px] items-center justify-center overflow-hidden rounded-2xl bg-[#DCEBFB]">
            {openTileData.url || openTileData.kind === 'video' ? (
              <TileMedia tile={openTileData} large />
            ) : (
              <CatIcon kind="collect" size={120} />
            )}
          </View>
          <View className="gap-1.5">
            <AppText className="text-[13px] font-vn-semibold">
              {openTileData.kind === 'video' ? 'Mô tả video' : 'Mô tả ảnh'}{' '}
              <AppText className="text-[13px] text-[#5A6772]">(không bắt buộc)</AppText>
            </AppText>
            <TextInput
              accessibilityLabel={openTileData.kind === 'video' ? 'Mô tả video' : 'Mô tả ảnh'}
              value={openTileData.caption}
              maxLength={ITEM_CAPTION_MAX_LENGTH}
              onChangeText={(value) => setCaption(openTileData, value)}
              className="min-h-[52px] rounded-xl border-[1.5px] border-[#1673D9] px-3.5 py-3 font-vn text-[14.5px] text-[#0F2440]"
            />
          </View>
          <View className="flex-row gap-2.5">
            {openTileData.kind === 'photo' ? (
              <Pressable
                accessibilityRole="button"
                disabled={photos[0]?.id === openTileData.id}
                onPress={() => {
                  setPhotos((now) => [
                    openTileData,
                    ...now.filter((entry) => entry.id !== openTileData.id),
                  ]);
                  setOpenTile(null);
                }}
                className={`h-12 flex-1 items-center justify-center rounded-[14px] bg-[#F1F7FE] ${
                  photos[0]?.id === openTileData.id ? 'opacity-50' : ''
                }`}
              >
                <AppText className="text-[14.5px] font-vn-semibold">Đặt làm ảnh bìa</AppText>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={openTileData.kind === 'video' ? 'Xoá video' : 'Xoá ảnh'}
              onPress={() => removeTile(openTileData)}
              className="h-12 w-12 items-center justify-center rounded-[14px] bg-[#FDECEA]"
            >
              <PathIcon d={ICON_TRASH} size={20} color="#B42318" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpenTile(null)}
              className="h-12 flex-1 items-center justify-center rounded-[14px] bg-[#1673D9]"
            >
              <AppText className="text-[14.5px] font-vn-bold text-white">Xong</AppText>
            </Pressable>
          </View>
        </BottomSheet>
      ) : null}

      {confirmingSave ? (
        <ConfirmSheet
          title={`${item?.waitingOffers ?? 0} đề nghị đang chờ sẽ bị từ chối`}
          description="Người hỏi đã gửi đề nghị theo nội dung đang đăng. Sửa đồ thì tin được duyệt lại, và khi bản sửa được duyệt các đề nghị đó tự bị từ chối để họ gửi lại theo nội dung mới. Đề nghị đổi bằng món này bị từ chối ngay."
          confirmLabel="Vẫn lưu"
          destructive
          onConfirm={() => {
            const after = confirmingSave;
            setConfirmingSave(null);
            save.mutate(after);
          }}
          onCancel={() => setConfirmingSave(null)}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** A photo, a clip's poster, or the dark tile of a clip just picked on this phone (no poster yet). */
function TileMedia({ tile, large }: { tile: Tile; large?: boolean }) {
  if (tile.url) {
    return (
      <>
        <Image
          source={{ uri: tile.url }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
        {tile.kind === 'video' && large ? <PlayBadge /> : null}
      </>
    );
  }
  return (
    <View className="h-full w-full items-center justify-center bg-[#0F2440]">
      <PlayBadge />
    </View>
  );
}

function PlayBadge() {
  return (
    <View className="absolute inset-0 items-center justify-center">
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="#FFFFFF">
        <Path d="M8 5v14l11-7z" />
      </Svg>
    </View>
  );
}
