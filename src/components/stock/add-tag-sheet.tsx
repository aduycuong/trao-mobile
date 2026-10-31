import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { ItemThumb } from '@/components/stock/item-thumb';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { BarButton, Checkbox } from '@/components/ui/form-controls';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchMyItems,
  fetchMyTags,
  MY_TAGS_QUERY_KEY,
  updateMyItem,
} from '@/services/stock/items-api';
import { ITEM_PAGE_MAX_SIZE, ITEM_TAGS_MAX_COUNT, ITEM_TAG_MAX_LENGTH } from '@/types/stock';
import { StackSkeleton } from '@/components/ui/skeletons';

type AddTagSheetProps = {
  onClose: () => void;
  /** Called after the tag is put on the picked items, with its name. */
  onAdded: (tag: string) => void | Promise<void>;
};

/** "+ Tag" of the Kho đồ: name a tag and pick the items that get it, in a bottom sheet. */
export function AddTagSheet({ onClose, onAdded }: AddTagSheetProps) {
  const { session, getIdToken } = useAuth();
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const { data, error, isPending } = useQuery({
    queryKey: ['items', 'pick', session?.uid],
    queryFn: async () => fetchMyItems(await getIdToken(), { offset: 0, limit: ITEM_PAGE_MAX_SIZE }),
  });

  // Every tag the user has made, also the ones on no item (the list of items has only those in use).
  const { data: tagData } = useQuery({
    queryKey: [...MY_TAGS_QUERY_KEY, session?.uid],
    queryFn: async () => fetchMyTags(await getIdToken()),
    enabled: !!session,
  });
  const tag = name.trim().toLowerCase();
  const known = tagData?.tags ?? [];
  const rows = data?.items ?? [];
  const hasTag = (row: (typeof rows)[number]) => row.tags.some((entry) => entry.tag === tag);
  const full = (row: (typeof rows)[number]) => row.tags.length >= ITEM_TAGS_MAX_COUNT;
  const chosen = rows.filter((row) => picked.includes(row.id) && !hasTag(row) && !full(row));

  const save = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      await Promise.all(
        chosen.map((row) =>
          updateMyItem(token, row.id, { tags: [...row.tags.map((entry) => entry.tag), tag] })
        )
      );
    },
    onSuccess: () => onAdded(tag),
    onError: (caught) => Alert.alert('Không thêm được tag', caught.message || 'Thử lại sau.'),
  });

  function toggle(id: string) {
    setPicked((now) => (now.includes(id) ? now.filter((entry) => entry !== id) : [...now, id]));
  }

  return (
    <BottomSheet title="Thêm tag" onClose={onClose}>
      <View className="gap-1.5">
        <AppText className="text-[13px] font-vn-semibold">Tên tag</AppText>
        <TextInput
          accessibilityLabel="Tên tag"
          value={name}
          maxLength={ITEM_TAG_MAX_LENGTH}
          onChangeText={setName}
          placeholder="Ví dụ: dọn nhà, giữ lại"
          placeholderTextColor="#8A96A3"
          className="h-12 rounded-xl border-[1.5px] border-[#D5DDE5] bg-white px-3.5 font-vn text-[15px] text-[#0F2440]"
        />
        {known.length > 0 ? (
          <View className="flex-row flex-wrap gap-1.5 pt-1">
            {known.map((entry) => (
              <Pressable
                key={entry.tag}
                onPress={() => setName(entry.tag)}
                className="h-[30px] flex-row items-center gap-[5px] rounded-full border-[1.5px] border-dashed border-[#C9D3DD] bg-white px-2.5"
              >
                <View
                  className="h-[7px] w-[7px] rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <AppText className="text-[12.5px] font-vn-semibold text-[#33414D]">
                  {entry.tag}
                </AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <View className="gap-2">
        <View className="flex-row items-baseline gap-2">
          <AppText className="flex-1 text-[15px] font-vn-bold">Gắn cho món nào</AppText>
          <AppText className="text-[12.5px] text-[#5A6772]">{chosen.length} món</AppText>
        </View>
        {isPending ? (
          <StackSkeleton
            className="gap-2"
            blocks={['h-14 rounded-xl', 'h-14 rounded-xl', 'h-14 rounded-xl']}
          />
        ) : null}
        {error ? (
          <AppText accessibilityRole="alert" className="text-[13px] text-[#B42318]">
            {error.message}
          </AppText>
        ) : null}
        <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
          {rows.map((row) => {
            const already = tag.length > 0 && hasTag(row);
            const blocked = already || full(row);
            const on = !blocked && picked.includes(row.id);
            return (
              <Pressable
                key={row.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on, disabled: blocked }}
                disabled={blocked}
                onPress={() => toggle(row.id)}
                className={`flex-row items-center gap-3 rounded-xl px-1 py-2 ${
                  blocked ? 'opacity-50' : ''
                }`}
              >
                <ItemThumb
                  url={row.coverUrl}
                  categorySlug={row.categorySlug}
                  width={48}
                  height={48}
                  radius={10}
                  iconSize={26}
                />
                <View className="min-w-0 flex-1">
                  <AppText numberOfLines={1} className="text-[14px] font-vn-semibold">
                    {row.title}
                  </AppText>
                  {already ? (
                    <AppText className="text-[12px] text-[#5A6772]">Đã có tag này</AppText>
                  ) : null}
                  {!already && full(row) ? (
                    <AppText className="text-[12px] text-[#5A6772]">
                      Đã đủ {ITEM_TAGS_MAX_COUNT} tag
                    </AppText>
                  ) : null}
                </View>
                <Checkbox on={on} />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View className="flex-row gap-2.5">
        <BarButton label="Huỷ" tone="tinted" onPress={onClose} />
        <BarButton
          label="Thêm tag"
          flex={1.4}
          loading={save.isPending}
          disabled={tag.length === 0 || chosen.length === 0}
          onPress={() => save.mutate()}
        />
      </View>
    </BottomSheet>
  );
}
