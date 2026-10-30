import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ChatBubble, type BubbleRect } from '@/components/chat/chat-bubble';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatImageViewer } from '@/components/chat/chat-image-viewer';
import { ChatMessageActions, type MessageAction } from '@/components/chat/chat-message-actions';
import { ChatThreadHeader, TypingIndicator } from '@/components/chat/chat-thread-header';
import { ThreadListingCard, useThreadBanner } from '@/components/chat/chat-thread-slots';
import { ConfirmSheet } from '@/components/me/confirm-sheet';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { PathIcon } from '@/components/ui/path-icon';
import { useChat } from '@/hooks/useChat';
import { usePeerPresence, useTypingNotifier, useTypingUids } from '@/hooks/useChatRealtime';
import { useChatThread } from '@/hooks/useChatThread';
import { useGoBack } from '@/hooks/useGoBack';
import {
  canUnsendMessage,
  findMember,
  getPeerMember,
  type ChatThreadItem,
  type ChatThreadMedia,
} from '@/services/chat/chat-view';
import { CHAT_UNSEND_WINDOW_SECONDS } from '@/services/chat/constants';
import { setActiveChatInbox } from '@/services/push/active-chat';
import { dismissChatNotifications } from '@/services/push/push-device';
import { toChatMessageSticker } from '@/services/chat/stickers';
import type { ChatReplyTo } from '@/types/chat';

/** Farther than this from the newest message shows "Tin mới nhất"; closer than this counts as at the end. */
const FAR_FROM_END = 240;
const NEAR_END = 48;

type Confirming = { item: ChatThreadItem; scope: 'everyone' | 'me' };

function fail(title: string, error: unknown) {
  Alert.alert(title, error instanceof Error ? error.message : 'Thử lại sau.');
}

/**
 * A chat (canvas Chat, thread): the person on top, the listing the talk is about, the messages
 * (text, photos, stickers, reactions, replies, unsend) and the box to write. The list is inverted
 * (newest first) so it stays at the newest message and older ones load as the user scrolls up.
 */
export function ChatThreadScreen({ inboxId, listingId }: { inboxId: string; listingId?: string }) {
  const goBack = useGoBack('/chat');
  const { ready } = useChat();
  const thread = useChatThread(inboxId);
  const router = useRouter();
  const { dialog, items, meUserId, firebaseUid } = thread;
  const lastSystemKey = [...items].reverse().find((item) => item.kind === 'system')?.key;
  const banner = useThreadBanner(inboxId, listingId, lastSystemKey);

  const listRef = useRef<FlatList<ChatThreadItem>>(null);
  const [replying, setReplying] = useState<{ inboxId: string; reply: ChatReplyTo } | null>(null);
  const reply = replying?.inboxId === inboxId ? replying.reply : null;
  const [actions, setActions] = useState<{ item: ChatThreadItem; rect: BubbleRect } | null>(null);
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const [viewing, setViewing] = useState<{ media: ChatThreadMedia[]; index: number } | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Where the list stopped being at its end, to count what arrived since ("Tin mới nhất").
  const [awayFrom, setAwayFrom] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemCountRef = useRef(0);

  const peer = dialog && firebaseUid ? getPeerMember(dialog, firebaseUid) : undefined;
  const online = usePeerPresence(peer?.firebaseUid);
  const typingUids = useTypingUids(inboxId, firebaseUid);
  const { notifyTyping, stopTyping } = useTypingNotifier(inboxId, firebaseUid);
  const peerTyping = typingUids.length > 0;

  // Its pushes are not banners while the thread is open, and the ones in the tray are cleared.
  useEffect(() => {
    setActiveChatInbox(inboxId);
    void dismissChatNotifications(inboxId);
    return () => setActiveChatInbox(null);
  }, [inboxId]);

  // The unsend window closes on its own: look again once in a while.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    []
  );

  // Newest first for the inverted list.
  const data = useMemo(() => [...items].reverse(), [items]);
  const itemCount = items.length;
  useEffect(() => {
    itemCountRef.current = itemCount;
  }, [itemCount]);

  const unsendSeconds = dialog?.unsendWindowSeconds ?? CHAT_UNSEND_WINDOW_SECONDS;
  const replyAuthor = useCallback(
    (senderId: string) =>
      senderId === meUserId
        ? 'Bạn'
        : ((dialog ? findMember(dialog, senderId)?.name : null) ?? 'Bạn bè'),
    [dialog, meUserId]
  );

  const showNotice = useCallback((text: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = setTimeout(() => setNotice(null), 1800);
  }, []);

  const scrollToEnd = useCallback(() => {
    setAwayFrom(null);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const offset = event.nativeEvent.contentOffset.y;
    setAwayFrom((current) =>
      offset <= NEAR_END
        ? null
        : offset > FAR_FROM_END
          ? (current ?? itemCountRef.current)
          : current
    );
  }

  const jumpTo = useCallback(
    (messageId: string) => {
      const at = data.findIndex((entry) => entry.id === messageId);
      if (at === -1) {
        Alert.alert('Chưa thấy tin gốc', 'Kéo lên để tải thêm tin cũ, rồi thử lại.');
        return;
      }
      listRef.current?.scrollToIndex({ index: at, viewPosition: 0.5, animated: true });
    },
    [data]
  );

  const { react, removeMessage, retry, discard, send, sendSticker, sendMedia } = thread;

  const onReact = useCallback(
    (item: ChatThreadItem, emoji: string) => {
      if (!item.id) return;
      // Choosing the emoji already on the message takes it off.
      react(item.id, item.myReaction === emoji ? null : emoji).catch((error: unknown) =>
        fail('Không thả được cảm xúc', error)
      );
    },
    [react]
  );
  const onLongPress = useCallback(
    (item: ChatThreadItem, rect: BubbleRect) => setActions({ item, rect }),
    []
  );
  const onOpenImage = useCallback(
    (item: ChatThreadItem, index: number) => setViewing({ media: item.media, index }),
    []
  );
  const onRetry = useCallback((item: ChatThreadItem) => retry(item.clientMsgId), [retry]);
  const onDiscard = useCallback((item: ChatThreadItem) => discard(item.clientMsgId), [discard]);
  const peerUserId = peer?.userId;
  /** Reports the other person (the scam caution, the message menu and the header options). */
  const reportPeer = useCallback(() => {
    if (!peerUserId) {
      Alert.alert('Chưa mở được báo cáo', 'Thử lại sau.');
      return;
    }
    router.push({ pathname: '/report', params: { type: 'user', id: peerUserId } });
  }, [peerUserId, router]);

  function handleSendText(text: string) {
    send(text, reply).catch((error: unknown) => fail('Không gửi được tin nhắn', error));
    setReplying(null);
    scrollToEnd();
  }

  function handleSendSticker(sticker: { id: string; name: string }) {
    sendSticker(toChatMessageSticker(sticker), reply).catch((error: unknown) =>
      fail('Không gửi được sticker', error)
    );
    setReplying(null);
    scrollToEnd();
  }

  async function handleSendMedia(text: string, media: Parameters<typeof sendMedia>[1]) {
    scrollToEnd();
    try {
      await sendMedia(text, media);
    } catch (error) {
      fail('Không gửi được ảnh', error);
    }
  }

  function handleAction(action: MessageAction) {
    const target = actions?.item;
    setActions(null);
    if (!target) return;

    if (action === 'reply') {
      if (!target.id || target.seq === null) return;
      setReplying({
        inboxId,
        reply: {
          id: target.id,
          seq: target.seq,
          senderId: target.senderId,
          type: target.kind === 'media' ? 'media' : target.kind === 'sticker' ? 'sticker' : 'text',
          deleted: false,
          text: target.text
            ? target.text.slice(0, 100)
            : target.kind === 'sticker'
              ? 'Sticker'
              : null,
        },
      });
    } else if (action === 'copy') {
      void Clipboard.setStringAsync(target.text ?? '').then(() => showNotice('Đã chép tin nhắn.'));
    } else if (action === 'unsend') {
      setConfirming({ item: target, scope: 'everyone' });
    } else if (action === 'hide') {
      setConfirming({ item: target, scope: 'me' });
    } else {
      reportPeer();
    }
  }

  async function confirmRemove() {
    const { item, scope } = confirming ?? {};
    const messageId = item?.id;
    if (!item || !scope || !messageId) return;
    setConfirming(null);
    if (
      scope === 'everyone' &&
      !canUnsendMessage({
        isMine: item.isMine,
        createdAt: item.createdAt,
        unsendWindowSeconds: unsendSeconds,
      })
    ) {
      Alert.alert('Hết thời gian thu hồi', 'Bạn vẫn có thể xoá ở phía mình.');
      return;
    }
    try {
      await removeMessage(messageId, scope);
    } catch (error) {
      fail('Không xoá được tin nhắn', error);
    }
  }

  if (!ready || (!dialog && !thread.opened)) {
    return (
      <View className="flex-1 bg-[#F7F9FB]">
        <ChatThreadHeader
          peer={undefined}
          online={false}
          typing={false}
          onBack={goBack}
          onOptions={() => {}}
        />
        <AppText className="px-4 py-8 text-center text-[13.5px] text-[#5A6772]">Đang tải…</AppText>
      </View>
    );
  }

  if (!dialog || !meUserId) {
    return (
      <View className="flex-1 bg-[#F7F9FB]">
        <ChatThreadHeader
          peer={undefined}
          online={false}
          typing={false}
          onBack={goBack}
          onOptions={() => {}}
        />
        <AppText className="px-4 py-8 text-center text-[14px]">
          Không tìm thấy cuộc trò chuyện.
        </AppText>
      </View>
    );
  }

  const newSince = awayFrom === null ? 0 : Math.max(0, itemCount - awayFrom);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-[#F7F9FB]"
    >
      <ChatThreadHeader
        peer={peer}
        online={online}
        typing={peerTyping}
        onBack={goBack}
        onOptions={() => setOptionsOpen(true)}
      />

      {listingId && !banner.hasContextDeal ? <ThreadListingCard listingId={listingId} /> : null}
      {banner.element ? (
        <View className="border-b border-[#EEF2F6] bg-[#F7F9FB] px-3 py-2.5">{banner.element}</View>
      ) : null}

      <View className="min-h-0 flex-1">
        <FlatList
          ref={listRef}
          inverted
          data={data}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <View className="pb-2">
              <ChatBubble
                item={item}
                replyAuthorName={item.replyTo ? replyAuthor(item.replyTo.senderId) : null}
                onLongPress={onLongPress}
                onReact={onReact}
                onJumpTo={jumpTo}
                onOpenImage={onOpenImage}
                onRetry={onRetry}
                onDiscard={onDiscard}
                onReport={reportPeer}
              />
            </View>
          )}
          ListHeaderComponent={
            peerTyping ? <TypingIndicator name={peer?.name ?? 'Người kia'} /> : null
          }
          ListFooterComponent={
            thread.loadingOlder ? (
              <AppText className="py-2 text-center text-[11px] text-[#8A96A3]">
                Đang tải thêm…
              </AppText>
            ) : thread.openError && items.length === 0 ? (
              <View accessibilityRole="alert" className="rounded-xl bg-[#FDECEA] px-3 py-2">
                <AppText className="text-[13px] text-[#B42318]">{thread.openError}</AppText>
              </View>
            ) : null
          }
          ListEmptyComponent={
            thread.opened && !thread.openError ? (
              // Inverted lists draw the empty state upside down; flip it back.
              <View style={{ transform: [{ scaleY: -1 }] }}>
                <AppText className="py-8 text-center text-[13.5px] text-[#5A6772]">
                  Chưa có tin nhắn. Hãy nhắn câu đầu tiên.
                </AppText>
              </View>
            ) : null
          }
          onEndReached={() => {
            if (thread.hasMoreOlder && !thread.loadingOlder) void thread.loadOlder();
          }}
          onEndReachedThreshold={0.6}
          onScroll={onScroll}
          scrollEventThrottle={64}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
            setTimeout(
              () =>
                listRef.current?.scrollToIndex({
                  index: info.index,
                  viewPosition: 0.5,
                  animated: true,
                }),
              250
            );
          }}
          maintainVisibleContentPosition={{ minIndexForVisible: 1, autoscrollToTopThreshold: 100 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          initialNumToRender={14}
          maxToRenderPerBatch={10}
          windowSize={9}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 14 }}
        />
        {notice ? (
          <View pointerEvents="none" className="absolute bottom-3 left-0 right-0 items-center">
            <View className="rounded-full bg-[#0F2440] px-4 py-2">
              <AppText className="text-[13px] font-vn-semibold text-white">{notice}</AppText>
            </View>
          </View>
        ) : null}
        {awayFrom !== null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              newSince > 0 ? `Xuống tin mới nhất, ${newSince} tin mới` : 'Xuống tin mới nhất'
            }
            onPress={scrollToEnd}
            className="absolute bottom-3 right-3 h-10 flex-row items-center gap-1.5 rounded-full border border-[#E1E7EE] bg-white pl-3 pr-3.5"
            style={{
              elevation: 4,
              shadowColor: '#0F2440',
              shadowOpacity: 0.18,
              shadowRadius: 9,
              shadowOffset: { width: 0, height: 6 },
            }}
          >
            <PathIcon d="M12 5v14M5 12l7 7 7-7" size={16} color="#1673D9" strokeWidth={2.4} />
            <AppText className="text-[13px] font-vn-semibold">
              {newSince > 0 ? `${newSince} tin mới` : 'Tin mới nhất'}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {dialog.sendLocked ? (
        <AppText className="border-t border-[#EEF2F6] bg-white px-4 py-3 text-center text-[13px] text-[#5A6772]">
          Bạn không nhắn được cho người này.
        </AppText>
      ) : (
        <ChatComposer
          key={inboxId}
          inboxId={inboxId}
          reply={
            reply
              ? {
                  reply,
                  authorName:
                    reply.senderId === meUserId ? 'chính mình' : replyAuthor(reply.senderId),
                }
              : null
          }
          onCancelReply={() => setReplying(null)}
          onSendText={handleSendText}
          onSendSticker={handleSendSticker}
          onSendMedia={handleSendMedia}
          notifyTyping={notifyTyping}
          stopTyping={stopTyping}
        />
      )}

      {actions ? (
        <ChatMessageActions
          item={actions.item}
          rect={actions.rect}
          canUnsend={canUnsendMessage({
            isMine: actions.item.isMine,
            createdAt: actions.item.createdAt,
            unsendWindowSeconds: unsendSeconds,
            now,
          })}
          onReact={(emoji) => {
            const target = actions.item;
            setActions(null);
            onReact(target, emoji);
          }}
          onAction={handleAction}
          onClose={() => setActions(null)}
        />
      ) : null}

      {confirming ? (
        <ConfirmSheet
          title={confirming.scope === 'everyone' ? 'Thu hồi tin nhắn?' : 'Xoá ở phía tôi?'}
          description={
            confirming.scope === 'everyone'
              ? 'Mọi người trong cuộc trò chuyện sẽ thấy tin này đã được thu hồi.'
              : 'Tin vẫn còn với người kia. Chỉ mình bạn không thấy nữa.'
          }
          confirmLabel={confirming.scope === 'everyone' ? 'Thu hồi' : 'Xoá'}
          destructive
          onConfirm={confirmRemove}
          onCancel={() => setConfirming(null)}
        />
      ) : null}

      {viewing ? (
        <ChatImageViewer
          media={viewing.media}
          startIndex={viewing.index}
          onClose={() => setViewing(null)}
        />
      ) : null}

      {optionsOpen ? (
        <BottomSheet onClose={() => setOptionsOpen(false)}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setOptionsOpen(false);
              reportPeer();
            }}
            className="h-12 justify-center"
          >
            <AppText className="text-[15px] font-vn-semibold text-[#B42318]">
              Báo cáo {peer?.name ?? 'người này'}
            </AppText>
          </Pressable>
        </BottomSheet>
      ) : null}
    </KeyboardAvoidingView>
  );
}
