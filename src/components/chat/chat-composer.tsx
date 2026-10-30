import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { ChatSticker } from '@/components/chat/chat-sticker';
import { AppText } from '@/components/ui/app-text';
import { PathIcon } from '@/components/ui/path-icon';
import { useChatDraft } from '@/hooks/useChatDraft';
import { getReplyPreviewText } from '@/services/chat/chat-view';
import { CHAT_MEDIA_MAX_FILES, CHAT_TEXT_MAX_LENGTH } from '@/services/chat/constants';
import { CHAT_STICKERS } from '@/services/chat/stickers';
import type { ChatReplyTo, LocalMediaItem } from '@/types/chat';

const EMOJIS = [
  '😀',
  '😊',
  '😂',
  '🥰',
  '😍',
  '😉',
  '🤔',
  '😅',
  '🙏',
  '👍',
  '👌',
  '👏',
  '🙌',
  '💪',
  '🤝',
  '❤️',
  '🔥',
  '🎉',
  '✨',
  '😢',
  '😮',
  '😴',
  '🤗',
  '😎',
  '📦',
  '🚚',
  '📍',
  '💵',
  '🎁',
  '⏰',
  '✅',
  '❌',
];

/** The attach panel (canvas Chat): photos work; location and item from stock are drawn and say "sẽ có". */
const ATTACH_ITEMS = [
  {
    id: 'photo',
    label: 'Ảnh',
    bg: '#E6F1FF',
    fg: '#1673D9',
    d: 'M4 6h16v12H4zM4 15l4-4 4 4 3-3 5 5M15.5 9.5h.01',
  },
  {
    id: 'camera',
    label: 'Chụp ảnh',
    bg: '#FFF4D6',
    fg: '#8A5A00',
    d: 'M4 8h3l2-2h6l2 2h3v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  },
  {
    id: 'location',
    label: 'Vị trí',
    bg: '#FDECEA',
    fg: '#B42318',
    d: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  },
  {
    id: 'item',
    label: 'Món đồ',
    bg: '#E3F4EA',
    fg: '#1E6B43',
    d: 'M3 7.5L12 3l9 4.5v9L12 21l-9-4.5zM3 7.5L12 12l9-4.5M12 12v9',
  },
] as const;

type Panel = 'emoji' | 'attach' | null;

type ChatComposerProps = {
  inboxId: string;
  /** The message being answered, shown above the box. */
  reply: { reply: ChatReplyTo; authorName: string } | null;
  onCancelReply: () => void;
  onSendText: (text: string) => void;
  onSendSticker: (sticker: { id: string; name: string }) => void;
  onSendMedia: (text: string, media: LocalMediaItem[]) => Promise<void>;
  notifyTyping: () => void;
  stopTyping: () => void;
};

function DraftThumb({ item, onRemove }: { item: LocalMediaItem; onRemove: () => void }) {
  return (
    <View className="h-16 w-16">
      <Image
        source={{ uri: item.thumbUri }}
        accessibilityLabel="Ảnh sắp gửi"
        contentFit="cover"
        className="h-16 w-16 rounded-[14px] bg-[#F1F4F7]"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bỏ ảnh"
        onPress={onRemove}
        hitSlop={8}
        className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-[#0F2440]"
      >
        <PathIcon d="M6 6l12 12M18 6L6 18" size={10} color="#FFFFFF" strokeWidth={3} />
      </Pressable>
    </View>
  );
}

/**
 * The box to write a message (canvas Chat): text, photos from the library or the camera (up to 10,
 * with a caption), emoji and stickers. What is typed and the photos picked are kept as a draft of
 * this chat on the device, so they are still there when the person comes back. Mount with
 * `key={inboxId}`.
 */
export function ChatComposer({
  inboxId,
  reply,
  onCancelReply,
  onSendText,
  onSendSticker,
  onSendMedia,
  notifyTyping,
  stopTyping,
}: ChatComposerProps) {
  const insets = useSafeAreaInsets();
  const draft = useChatDraft(inboxId);
  const [panel, setPanel] = useState<Panel>(null);
  const [emojiTab, setEmojiTab] = useState<'emoji' | 'sticker'>('emoji');
  const selection = useRef({ start: 0, end: 0 });
  const [forcedSelection, setForcedSelection] = useState<{ start: number; end: number } | null>(
    null
  );
  const inputRef = useRef<TextInput>(null);

  const hasMedia = draft.media.length > 0;
  const canSend = draft.processing === 0 && (hasMedia || draft.text.trim().length > 0);

  function togglePanel(next: Exclude<Panel, null>) {
    Keyboard.dismiss();
    setPanel((current) => (current === next ? null : next));
  }

  function addPicked(uris: string[]) {
    if (uris.length === 0) return;
    // A reply is text only: picking an image drops it.
    onCancelReply();
    void draft.addImages(uris);
  }

  function room() {
    return CHAT_MEDIA_MAX_FILES - draft.media.length - draft.processing;
  }

  async function pickFromLibrary() {
    setPanel(null);
    const left = room();
    if (left <= 0) {
      Alert.alert('Đủ ảnh rồi', `Mỗi tin gửi tối đa ${CHAT_MEDIA_MAX_FILES} ảnh.`);
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: left,
        quality: 1,
        exif: false,
      });
      if (!result.canceled) addPicked(result.assets.map((asset) => asset.uri));
    } catch {
      Alert.alert('Không mở được thư viện ảnh', 'Thử lại sau.');
    }
  }

  async function takePhoto() {
    setPanel(null);
    if (room() <= 0) {
      Alert.alert('Đủ ảnh rồi', `Mỗi tin gửi tối đa ${CHAT_MEDIA_MAX_FILES} ảnh.`);
      return;
    }
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Chưa mở được máy ảnh',
          'Hãy cho phép Trao dùng máy ảnh trong phần cài đặt của máy.',
          permission.canAskAgain
            ? [{ text: 'Đóng' }]
            : [{ text: 'Đóng' }, { text: 'Mở cài đặt', onPress: () => void Linking.openSettings() }]
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
        exif: false,
      });
      if (!result.canceled) addPicked(result.assets.map((asset) => asset.uri));
    } catch {
      Alert.alert('Không mở được máy ảnh', 'Thử lại sau.');
    }
  }

  function onAttach(id: (typeof ATTACH_ITEMS)[number]['id'], label: string) {
    if (id === 'photo') void pickFromLibrary();
    else if (id === 'camera') void takePhoto();
    else Alert.alert(label, 'Tính năng này sẽ có ở bản cập nhật tới.');
  }

  function changeText(value: string) {
    draft.setText(value);
    if (value.trim()) notifyTyping();
    else stopTyping();
  }

  function insertEmoji(emoji: string) {
    const value = draft.text;
    const start = Math.min(selection.current.start, value.length);
    const end = Math.min(selection.current.end, value.length);
    const next = value.slice(0, start) + emoji + value.slice(end);
    if (next.length > CHAT_TEXT_MAX_LENGTH) return;
    const caret = start + emoji.length;
    selection.current = { start: caret, end: caret };
    setForcedSelection(selection.current);
    changeText(next);
  }

  async function submit() {
    if (!canSend) return;
    const text = draft.text.trim();
    stopTyping();
    setPanel(null);
    if (hasMedia) {
      const media = draft.media;
      draft.handOff();
      await onSendMedia(text, media);
      return;
    }
    draft.clear();
    selection.current = { start: 0, end: 0 };
    onSendText(text);
  }

  return (
    <View className="bg-white">
      {reply ? (
        <View className="flex-row items-center gap-2 border-t border-[#EEF2F6] px-4 py-2">
          <View className="min-w-0 flex-1 border-l-[3px] border-[#1673D9] pl-2.5">
            <AppText numberOfLines={1} className="text-[12px] font-vn-semibold">
              Đang trả lời {reply.authorName}
            </AppText>
            <AppText numberOfLines={1} className="text-[12px] text-[#5A6772]">
              {getReplyPreviewText(reply.reply)}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Huỷ trả lời"
            onPress={onCancelReply}
            hitSlop={10}
            className="h-6 w-6 items-center justify-center rounded-full"
          >
            <PathIcon d="M6 6l12 12M18 6L6 18" size={14} color="#5A6772" strokeWidth={2.4} />
          </Pressable>
        </View>
      ) : null}

      {hasMedia || draft.processing > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          className="border-t border-[#EEF2F6]"
          contentContainerClassName="gap-2 px-3 pb-1 pt-2.5"
        >
          {draft.media.map((item) => (
            <DraftThumb
              key={item.localId}
              item={item}
              onRemove={() => draft.removeMedia(item.localId)}
            />
          ))}
          {Array.from({ length: draft.processing }, (_, index) => (
            <View
              key={`processing-${index}`}
              className="h-16 w-16 items-center justify-center rounded-[14px] bg-[#F1F4F7]"
            >
              <ActivityIndicator size="small" color="#5A6772" />
            </View>
          ))}
        </ScrollView>
      ) : null}
      {draft.error ? (
        <AppText className="px-4 pt-2 text-[12px] text-[#B42318]">{draft.error}</AppText>
      ) : null}

      <View
        className={`flex-row items-end gap-1.5 py-2 pl-1.5 pr-2.5 ${
          hasMedia || draft.processing > 0 ? '' : 'border-t border-[#EEF2F6]'
        }`}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đính kèm ảnh, vị trí, món đồ"
          accessibilityState={{ expanded: panel === 'attach' }}
          onPress={() => togglePanel('attach')}
          className={`h-[42px] w-[42px] items-center justify-center rounded-full ${
            panel === 'attach' ? 'bg-[#1673D9]' : 'bg-[#F1F7FE]'
          }`}
        >
          <View style={{ transform: [{ rotate: panel === 'attach' ? '45deg' : '0deg' }] }}>
            <PathIcon
              d="M12 5v14M5 12h14"
              size={20}
              color={panel === 'attach' ? '#FFFFFF' : '#1673D9'}
              strokeWidth={2.4}
            />
          </View>
        </Pressable>
        <View className="min-h-[42px] flex-1 flex-row items-center gap-1 rounded-[22px] bg-[#F2F5F8] pl-3.5 pr-1">
          <TextInput
            ref={inputRef}
            value={draft.text}
            onChangeText={changeText}
            onFocus={() => setPanel(null)}
            onSelectionChange={(event) => {
              selection.current = event.nativeEvent.selection;
              setForcedSelection(null);
            }}
            selection={forcedSelection ?? undefined}
            maxLength={CHAT_TEXT_MAX_LENGTH}
            multiline
            accessibilityLabel="Nhập tin nhắn"
            placeholder={hasMedia ? 'Thêm lời nhắn…' : 'Nhắn tin…'}
            placeholderTextColor="#8A96A3"
            className="max-h-[110px] min-w-0 flex-1 py-2.5 font-vn text-[14.5px] text-[#0F2440]"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Emoji và sticker"
            accessibilityState={{ expanded: panel === 'emoji' }}
            onPress={() => togglePanel('emoji')}
            className="h-9 w-9 items-center justify-center rounded-full"
          >
            <Svg
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill="none"
              stroke={panel === 'emoji' ? '#1673D9' : '#5A6772'}
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Circle cx={12} cy={12} r={9} />
              <Path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
            </Svg>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gửi"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={() => void submit()}
          className={`h-[42px] w-[42px] items-center justify-center rounded-full ${
            canSend ? 'bg-[#1673D9]' : 'bg-[#9CC3F0]'
          }`}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="#FFFFFF">
            <Path d="M3 11.5L21 3l-6.5 18-3-7.5z" />
          </Svg>
        </Pressable>
      </View>

      {panel === 'attach' ? (
        <View className="flex-row border-t border-[#EEF2F6] px-3 py-[22px]" style={{ height: 150 }}>
          {ATTACH_ITEMS.map((entry) => (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityLabel={entry.label}
              onPress={() => onAttach(entry.id, entry.label)}
              className="flex-1 items-center gap-2"
            >
              <View
                className="h-14 w-14 items-center justify-center rounded-[18px]"
                style={{ backgroundColor: entry.bg }}
              >
                <PathIcon d={entry.d} size={26} color={entry.fg} strokeWidth={1.9} />
              </View>
              <AppText className="text-[12.5px] font-vn-medium">{entry.label}</AppText>
            </Pressable>
          ))}
        </View>
      ) : null}

      {panel === 'emoji' ? (
        <View className="border-t border-[#EEF2F6]" style={{ height: 272 }}>
          <View accessibilityRole="tablist" className="flex-row gap-1.5 px-3 py-2">
            {(
              [
                ['emoji', 'Emoji'],
                ['sticker', 'Stickers'],
              ] as const
            ).map(([id, label]) => (
              <Pressable
                key={id}
                accessibilityRole="tab"
                accessibilityState={{ selected: emojiTab === id }}
                onPress={() => setEmojiTab(id)}
                className={`h-8 items-center justify-center rounded-full px-3.5 ${
                  emojiTab === id ? 'bg-[#0F2440]' : 'bg-[#F2F5F8]'
                }`}
              >
                <AppText
                  className={`text-[13.5px] font-vn-semibold ${
                    emojiTab === id ? 'text-white' : 'text-[#33414D]'
                  }`}
                >
                  {label}
                </AppText>
              </Pressable>
            ))}
          </View>
          {emojiTab === 'emoji' ? (
            <ScrollView contentContainerClassName="flex-row flex-wrap px-2 pb-2">
              {EMOJIS.map((emoji) => (
                <Pressable
                  key={emoji}
                  accessibilityRole="button"
                  accessibilityLabel={`Chèn ${emoji}`}
                  onPress={() => insertEmoji(emoji)}
                  className="h-11 items-center justify-center"
                  style={{ width: '12.5%' }}
                >
                  <AppText className="text-[26px]">{emoji}</AppText>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <ScrollView contentContainerClassName="flex-row flex-wrap gap-1 px-2.5 pb-2.5">
              {CHAT_STICKERS.map((sticker) => (
                <Pressable
                  key={sticker.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Sticker ${sticker.name}`}
                  onPress={() => {
                    stopTyping();
                    setPanel(null);
                    onSendSticker(sticker);
                  }}
                  className="h-24 items-center justify-center rounded-[14px] bg-[#F7F9FB]"
                  style={{ width: '24%' }}
                >
                  <ChatSticker id={sticker.id} size={84} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}
      <View style={{ height: insets.bottom }} />
    </View>
  );
}
