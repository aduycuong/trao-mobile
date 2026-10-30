import React, { memo, useRef } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ChatMediaGrid } from '@/components/chat/chat-media-grid';
import { ChatSticker } from '@/components/chat/chat-sticker';
import { AppText } from '@/components/ui/app-text';
import { useChatMediaProgress } from '@/hooks/useChatMedia';
import { detectScamSigns, SCAM_WARNINGS } from '@/services/chat/detect-scam';
import {
  BLOCKED_MEDIA_TEXT,
  BLOCKED_OWN_MEDIA_TEXT,
  formatChatMessageTime,
  getReplyPreviewText,
  messageStatusLabel,
  type ChatSystemTone,
  type ChatThreadItem,
} from '@/services/chat/chat-view';

/** Colors of a system line (canvas Chat): [background, text]. */
/** Line height of the reaction chip's text, so it sits in the middle of the 24px chip. */
const CHIP_TEXT = { lineHeight: 16 } as const;

const SYSTEM_TONES: Record<ChatSystemTone, readonly [string, string]> = {
  info: ['#E9EEF4', '#33414D'],
  deal: ['#FFF4D6', '#8A5A00'],
  done: ['#E3F4EA', '#1E6B43'],
};

/** Canvas tick paths: one for "đã gửi", two for "đã nhận / đã xem". */
const TICK_ONE = 'M4 12.5l4.5 4.5L19 7';
const TICK_TWO = 'M2 12.5l4.5 4.5L17 6.5M9.5 16.5l1 1L22 6.5';

export type BubbleRect = { x: number; y: number; width: number; height: number };

type BubbleHandlers = {
  onLongPress: (item: ChatThreadItem, rect: BubbleRect) => void;
  onReact: (item: ChatThreadItem, emoji: string) => void;
  onJumpTo: (messageId: string) => void;
  onOpenImage: (item: ChatThreadItem, index: number) => void;
  onRetry: (item: ChatThreadItem) => void;
  onDiscard: (item: ChatThreadItem) => void;
  /** Reports the sender (the "Báo cáo" of the scam caution). */
  onReport: (item: ChatThreadItem) => void;
};

type ChatBubbleProps = BubbleHandlers & {
  item: ChatThreadItem;
  /** Who wrote the message this one answers ("Bạn" or the other person's name). */
  replyAuthorName: string | null;
};

/**
 * System line (canvas Chat, `m.sys`): a centered grey pill. Part 7B extends it for the deal events
 * (the tone already follows `content.event`); a deal card would replace the pill here.
 */
export function ChatSystemLine({ item }: { item: ChatThreadItem }) {
  const [bg, fg] = SYSTEM_TONES[item.systemTone ?? 'info'];
  return (
    <View className="items-center">
      <View className="max-w-[88%] rounded-xl px-3 py-1.5" style={{ backgroundColor: bg }}>
        <AppText
          className="text-center text-[12.5px] font-vn-semibold leading-[17.5px]"
          style={{ color: fg }}
        >
          {item.text}
        </AppText>
      </View>
    </View>
  );
}

/** The bubble itself: text, image(s), sticker, or the notes for unsent and blocked messages. */
export function ChatBubbleBody({
  item,
  onOpenImage,
}: {
  item: ChatThreadItem;
  onOpenImage?: (index: number) => void;
}) {
  const mine = item.isMine;
  const failed = item.status === 'failed';
  const inFlight =
    item.status === 'sending' || item.status === 'uploading' || item.status === 'moderating';
  const shape = mine
    ? {
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 4,
      }
    : {
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 18,
      };
  const colors = failed
    ? { backgroundColor: '#E5342B' }
    : mine
      ? { backgroundColor: '#1673D9' }
      : { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8ECF0' };
  const textColor = mine || failed ? 'text-white' : 'text-[#0F2440]';

  if (item.deleted) {
    return (
      <View
        className="px-3 py-[9px]"
        style={[shape, mine ? { backgroundColor: '#1673D9' } : colors, { opacity: 0.7 }]}
      >
        <AppText className={`text-[14.5px] italic ${textColor}`}>Tin nhắn đã được thu hồi</AppText>
      </View>
    );
  }
  if (item.blocked) {
    return (
      <View
        className="border border-dashed border-[#D5DDE5] bg-[#F1F4F7] px-3 py-[9px]"
        style={shape}
      >
        <AppText className="text-[13.5px] text-[#5A6772]">
          {mine ? BLOCKED_OWN_MEDIA_TEXT : BLOCKED_MEDIA_TEXT}
        </AppText>
      </View>
    );
  }
  if (item.kind === 'sticker' && item.sticker) {
    return (
      <View className="p-0.5" style={{ opacity: failed ? 0.6 : inFlight ? 0.7 : 1 }}>
        <ChatSticker id={item.sticker.id} size={120} />
      </View>
    );
  }
  if (item.kind === 'media') {
    return (
      <View
        className="gap-1 overflow-hidden p-1"
        style={[shape, colors, { opacity: inFlight ? 0.7 : 1 }]}
      >
        <ChatMediaGrid media={item.media} onOpen={(index) => onOpenImage?.(index)} />
        {item.text ? (
          <AppText className={`px-2 py-1 text-[14.5px] leading-[21px] ${textColor}`}>
            {item.text}
          </AppText>
        ) : null}
      </View>
    );
  }
  return (
    <View className="px-3 py-[9px]" style={[shape, colors, { opacity: inFlight ? 0.7 : 1 }]}>
      <AppText className={`text-[14.5px] leading-[21px] ${textColor}`}>{item.text}</AppText>
    </View>
  );
}

function ReplyQuote({
  reply,
  name,
  mine,
  onPress,
}: {
  reply: NonNullable<ChatThreadItem['replyTo']>;
  name: string;
  mine: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Tin gốc của ${name}`}
      onPress={onPress}
      className={`mb-0.5 max-w-full rounded-[10px] border-l-[3px] px-2.5 py-1 ${
        mine ? 'border-[#0B4A99] bg-[#E6F1FF]' : 'border-[#1673D9] bg-[#F1F7FE]'
      }`}
    >
      <AppText numberOfLines={1} className="text-[11.5px] font-vn-semibold">
        {name}
      </AppText>
      <AppText numberOfLines={2} className={`text-[12px] ${reply.deleted ? 'italic' : ''}`}>
        {getReplyPreviewText(reply)}
      </AppText>
    </Pressable>
  );
}

/** "11:02", a tick and "Đã xem"; while uploading "Đang tải ảnh lên… 45%". */
function MetaLine({ item }: { item: ChatThreadItem }) {
  const progress = useChatMediaProgress(item.clientMsgId);
  const status = item.status;
  const label = messageStatusLabel(status);
  const percent =
    status === 'uploading' && progress !== null ? ` ${Math.round(progress * 100)}%` : '';
  const tick = status === 'sent' || status === 'delivered' || status === 'read';
  const seen = status === 'read';

  return (
    <View className="flex-row items-center gap-[3px] px-1">
      <AppText className="text-[11px] text-[#8A96A3]">
        {formatChatMessageTime(item.createdAt)}
      </AppText>
      {item.isMine && label ? (
        <>
          {tick ? (
            <Svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke={seen ? '#1673D9' : '#8A96A3'}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d={status === 'sent' ? TICK_ONE : TICK_TWO} />
            </Svg>
          ) : null}
          <AppText
            className={`text-[11px] ${
              status === 'failed' ? 'font-vn-semibold text-[#B42318]' : 'text-[#8A96A3]'
            }`}
          >
            {`${label}${percent}`}
          </AppText>
        </>
      ) : null}
    </View>
  );
}

function ScamNotice({ text, onReport }: { text: string; onReport: () => void }) {
  const signs = detectScamSigns(text);
  if (signs.length === 0) return null;
  return (
    <View
      accessibilityRole="alert"
      className="w-full flex-row gap-2 rounded-xl border border-[#F5DE9A] bg-[#FFF4D6] px-3 py-2.5"
    >
      <Svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#8A5A00"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginTop: 2 }}
      >
        <Path d="M12 3l9 16H3zM12 10v4M12 17h.01" />
      </Svg>
      <View className="min-w-0 flex-1 gap-1">
        <AppText className="text-[12.5px] font-vn-bold leading-[18px] text-[#3D2A00]">
          Cẩn thận, tin nhắn này có dấu hiệu lừa đảo
        </AppText>
        {signs.map((sign) => (
          <AppText key={sign} className="text-[12.5px] leading-[18px] text-[#3D2A00]">
            {SCAM_WARNINGS[sign]}
          </AppText>
        ))}
        <Pressable accessibilityRole="button" onPress={onReport} className="self-start">
          <AppText className="text-[12.5px] font-vn-bold text-[#B42318]">Báo cáo</AppText>
        </Pressable>
      </View>
    </View>
  );
}

function ChatBubbleView({
  item,
  replyAuthorName,
  onLongPress,
  onReact,
  onJumpTo,
  onOpenImage,
  onRetry,
  onDiscard,
  onReport,
}: ChatBubbleProps) {
  const bubbleRef = useRef<View>(null);
  if (item.kind === 'system') return <ChatSystemLine item={item} />;

  const mine = item.isMine;
  const failed = item.status === 'failed';
  const inFlight =
    item.status === 'sending' || item.status === 'uploading' || item.status === 'moderating';
  const canAct = !item.deleted && !item.blocked && !inFlight && !failed && item.id !== null;

  function openActions() {
    bubbleRef.current?.measureInWindow((x, y, width, height) =>
      onLongPress(item, { x, y, width, height })
    );
  }

  const body = <ChatBubbleBody item={item} onOpenImage={(index) => onOpenImage(item, index)} />;

  return (
    <View className="gap-0.5" style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <View
        className="max-w-[76%] gap-0.5"
        style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}
      >
        {item.replyTo && !item.deleted ? (
          <ReplyQuote
            reply={item.replyTo}
            name={replyAuthorName ?? 'Bạn bè'}
            mine={mine}
            onPress={() => onJumpTo(item.replyTo!.id)}
          />
        ) : null}
        <View ref={bubbleRef} collapsable={false}>
          {canAct ? (
            <Pressable
              onLongPress={openActions}
              delayLongPress={250}
              accessibilityHint="Nhấn giữ để thả cảm xúc, trả lời hoặc xoá"
              accessibilityActions={[{ name: 'longpress', label: 'Mở menu tin nhắn' }]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === 'longpress') openActions();
              }}
            >
              {body}
            </Pressable>
          ) : (
            body
          )}
        </View>
      </View>

      {canAct && item.reactions.length > 0 ? (
        <View
          className="flex-row flex-wrap gap-1 px-2.5"
          style={{ marginTop: -10, zIndex: 2, justifyContent: mine ? 'flex-end' : 'flex-start' }}
        >
          {item.reactions.map((reaction) => {
            const on = item.myReaction === reaction.emoji;
            return (
              <Pressable
                key={reaction.emoji}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${reaction.emoji} ${reaction.count}`}
                onPress={() => onReact(item, reaction.emoji)}
                className={`h-6 flex-row items-center justify-center gap-[3px] rounded-full border px-[7px] ${
                  on ? 'border-[#1673D9] bg-[#E6F1FF]' : 'border-[#E1E7EE] bg-white'
                }`}
                style={{ elevation: 1 }}
              >
                {/* A fixed line height keeps the font's tall metrics from pushing the text low. */}
                <AppText
                  className="text-[13px]"
                  style={CHIP_TEXT}
                  includeFontPadding={false}
                  textAlignVertical="center"
                >
                  {reaction.emoji}
                </AppText>
                <AppText
                  className={`text-[11.5px] font-vn-semibold ${
                    on ? 'text-[#0B4A99]' : 'text-[#5A6772]'
                  }`}
                  style={CHIP_TEXT}
                  includeFontPadding={false}
                  textAlignVertical="center"
                >
                  {reaction.count}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <MetaLine item={item} />

      {failed ? (
        <View className="items-end gap-1 px-1">
          {item.error ? (
            <AppText className="text-[11.5px] text-[#B42318]">{item.error}</AppText>
          ) : null}
          <View className="flex-row gap-3">
            <Pressable accessibilityRole="button" onPress={() => onRetry(item)}>
              <AppText className="text-[12px] font-vn-bold text-[#1673D9]">Gửi lại</AppText>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => onDiscard(item)}>
              <AppText className="text-[12px] font-vn-semibold text-[#5A6772]">Xoá</AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {!mine && !item.deleted && !item.blocked && item.text && item.kind === 'text' ? (
        <View className="max-w-[76%]">
          <ScamNotice text={item.text} onReport={() => onReport(item)} />
        </View>
      ) : null}
    </View>
  );
}

function sameReply(a: ChatThreadItem['replyTo'], b: ChatThreadItem['replyTo']) {
  return a === b || (!!a && !!b && a.id === b.id && a.deleted === b.deleted && a.text === b.text);
}

/** Rows are rebuilt on every store change; only a row whose own content changed renders again. */
function sameBubble(prev: ChatBubbleProps, next: ChatBubbleProps) {
  const a = prev.item;
  const b = next.item;
  return (
    prev.replyAuthorName === next.replyAuthorName &&
    prev.onLongPress === next.onLongPress &&
    prev.onReact === next.onReact &&
    prev.onJumpTo === next.onJumpTo &&
    prev.onOpenImage === next.onOpenImage &&
    prev.onRetry === next.onRetry &&
    prev.onDiscard === next.onDiscard &&
    prev.onReport === next.onReport &&
    a.key === b.key &&
    a.id === b.id &&
    a.status === b.status &&
    a.text === b.text &&
    a.deleted === b.deleted &&
    a.blocked === b.blocked &&
    a.error === b.error &&
    a.myReaction === b.myReaction &&
    a.systemTone === b.systemTone &&
    a.sticker?.id === b.sticker?.id &&
    a.media.length === b.media.length &&
    a.media.every(
      (media, at) => media.key === b.media[at]?.key && media.localUri === b.media[at]?.localUri
    ) &&
    a.reactions.length === b.reactions.length &&
    a.reactions.every(
      (r, at) => r.emoji === b.reactions[at]?.emoji && r.count === b.reactions[at]?.count
    ) &&
    sameReply(a.replyTo, b.replyTo)
  );
}

export const ChatBubble = memo(ChatBubbleView, sameBubble);
