import React, { useEffect, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { PresenceAvatar, THREAD_DOT } from '@/components/chat/presence-avatar';
import { AppText } from '@/components/ui/app-text';
import type { ChatDialogMember } from '@/types/chat';

type ChatThreadHeaderProps = {
  peer: ChatDialogMember | undefined;
  online: boolean;
  typing: boolean;
  onBack: () => void;
  onOptions: () => void;
};

/** Top bar of a chat (canvas Chat, thread): back, avatar with the green dot, name, status, options. */
export function ChatThreadHeader({
  peer,
  online,
  typing,
  onBack,
  onOptions,
}: ChatThreadHeaderProps) {
  const insets = useSafeAreaInsets();
  const status = typing ? 'Đang nhập…' : online ? 'Đang hoạt động' : 'Ngoại tuyến';
  const statusColor = typing ? '#1673D9' : online ? '#2F9E63' : '#5A6772';

  return (
    <View
      className="flex-row items-center gap-2 border-b border-[#EEF2F6] bg-white pl-1 pr-2"
      style={{ height: 60 + insets.top, paddingTop: insets.top }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={onBack}
        className="h-11 w-11 items-center justify-center"
      >
        <Svg
          width={22}
          height={22}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0F2440"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="M15 5l-7 7 7 7" />
        </Svg>
      </Pressable>
      {peer ? (
        <>
          <PresenceAvatar
            name={peer.name}
            avatarUrl={peer.avatar}
            size={38}
            online={online}
            dot={THREAD_DOT}
            textClassName="text-[14px]"
          />
          <View className="min-w-0 flex-1">
            <AppText
              numberOfLines={1}
              accessibilityRole="header"
              className="text-[15.5px] font-vn-bold"
            >
              {peer.name}
            </AppText>
            <AppText className="text-[12.5px]" style={{ color: statusColor }}>
              {status}
            </AppText>
          </View>
        </>
      ) : (
        <View className="flex-1" />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tuỳ chọn"
        onPress={onOptions}
        className="h-11 w-11 items-center justify-center"
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="#0F2440">
          <Circle cx={5} cy={12} r={2} />
          <Circle cx={12} cy={12} r={2} />
          <Circle cx={19} cy={12} r={2} />
        </Svg>
      </Pressable>
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    // Canvas `chb`: 1.2s loop, each dot rises 4px and brightens at 30%.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: 480, useNativeDriver: true }),
        Animated.delay(360 - delay),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, value]);

  return (
    <Animated.View
      className="h-[7px] w-[7px] rounded-full bg-[#8A96A3]"
      style={{
        opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
        transform: [
          { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
        ],
      }}
    />
  );
}

/** "Minh Anh đang nhập…" with three bouncing dots (canvas Chat, `typing`). */
export function TypingIndicator({ name }: { name: string }) {
  return (
    <View className="flex-row items-center gap-2 pb-2">
      <View
        accessibilityLabel={`${name} đang nhập`}
        className="h-9 flex-row items-center gap-1 bg-white px-3.5"
        style={{ borderRadius: 18, borderBottomLeftRadius: 4 }}
      >
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
      <AppText className="text-[12px] text-[#8A96A3]">{name} đang nhập…</AppText>
    </View>
  );
}
