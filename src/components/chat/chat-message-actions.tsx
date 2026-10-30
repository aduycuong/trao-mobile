import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatBubbleBody, type BubbleRect } from '@/components/chat/chat-bubble';
import { AppText } from '@/components/ui/app-text';
import { CHAT_REACTIONS } from '@/services/chat/constants';
import type { ChatThreadItem } from '@/services/chat/chat-view';

export type MessageAction = 'reply' | 'copy' | 'unsend' | 'hide' | 'report';

type ChatMessageActionsProps = {
  item: ChatThreadItem;
  rect: BubbleRect;
  /** Whether the sender can still unsend for everyone (the window is open). */
  canUnsend: boolean;
  onReact: (emoji: string) => void;
  onAction: (action: MessageAction) => void;
  onClose: () => void;
};

/** Height of the reaction pill (canvas Chat: 5 + 40 + 5) and the gap to the message. */
const PILL_HEIGHT = 50;
const GAP = 6;
const MENU_ROW = 44;

/**
 * What a long press on a message opens (canvas Chat, `m.focus`): the other messages fade, the
 * six reactions float above the message and the menu hangs below it. Anyone can react (text,
 * photo or sticker); picking the emoji already chosen takes it off. The sender can unsend while
 * the window is open and can always hide the message for themselves.
 */
export function ChatMessageActions({
  item,
  rect,
  canUnsend,
  onReact,
  onAction,
  onClose,
}: ChatMessageActionsProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [groupHeight, setGroupHeight] = useState(0);

  const mine = item.isMine;
  const menu: { action: MessageAction; label: string; danger?: boolean }[] = [
    { action: 'reply', label: 'Trả lời' },
    ...(item.text ? [{ action: 'copy' as const, label: 'Sao chép' }] : []),
    ...(canUnsend ? [{ action: 'unsend' as const, label: 'Thu hồi' }] : []),
    { action: 'hide', label: 'Xoá ở phía tôi', danger: true },
    ...(mine ? [] : [{ action: 'report' as const, label: 'Báo cáo', danger: true }]),
  ];

  // The group sits where the message was; it moves up or down only when it would leave the screen.
  const minTop = insets.top + 8;
  const maxTop = screenHeight - insets.bottom - 8 - groupHeight;
  const top = Math.max(minTop, Math.min(rect.y - PILL_HEIGHT - GAP, maxTop));

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        accessibilityLabel="Đóng"
        onPress={onClose}
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(247,249,251,0.82)' }}
      />
      <ScrollView
        pointerEvents="box-none"
        contentContainerStyle={{
          paddingTop: top,
          paddingBottom: insets.bottom + 8,
          paddingHorizontal: 12,
          alignItems: mine ? 'flex-end' : 'flex-start',
        }}
      >
        <View
          onLayout={(event) => setGroupHeight(event.nativeEvent.layout.height)}
          style={{ alignItems: mine ? 'flex-end' : 'flex-start', maxWidth: '100%' }}
        >
          <View
            accessibilityRole="toolbar"
            accessibilityLabel="Thả cảm xúc"
            className="flex-row gap-0.5 rounded-full bg-white px-2 py-[5px]"
            style={{
              marginBottom: GAP,
              elevation: 8,
              shadowColor: '#0F2440',
              shadowOpacity: 0.22,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            {CHAT_REACTIONS.map((reaction) => (
              <Pressable
                key={reaction.emoji}
                accessibilityRole="button"
                accessibilityLabel={`Thả ${reaction.label}`}
                accessibilityState={{ selected: item.myReaction === reaction.emoji }}
                onPress={() => onReact(reaction.emoji)}
                className={`h-10 w-10 items-center justify-center rounded-full ${
                  item.myReaction === reaction.emoji ? 'bg-[#E6F1FF]' : ''
                }`}
              >
                <AppText className="text-[24px]">{reaction.emoji}</AppText>
              </Pressable>
            ))}
          </View>

          <View className="max-w-[76%]" style={{ minWidth: 0 }}>
            <ChatBubbleBody item={item} />
          </View>

          <View
            className="overflow-hidden rounded-[14px] bg-white"
            style={{
              width: 196,
              marginTop: GAP,
              elevation: 8,
              shadowColor: '#0F2440',
              shadowOpacity: 0.22,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            {menu.map((entry, at) => (
              <Pressable
                key={entry.action}
                accessibilityRole="button"
                onPress={() => onAction(entry.action)}
                className={`justify-center px-3.5 active:bg-[#F7F9FB] ${at > 0 ? 'border-t border-[#EEF2F6]' : ''}`}
                style={{ height: MENU_ROW }}
              >
                <AppText
                  className={`text-[14.5px] ${entry.danger ? 'text-[#B42318]' : 'text-[#0F2440]'}`}
                >
                  {entry.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}
