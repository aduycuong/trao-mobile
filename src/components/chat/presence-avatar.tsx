import React from 'react';
import { View } from 'react-native';
import { UserAvatar } from '@/components/me/user-avatar';

type PresenceAvatarProps = {
  name: string | null | undefined;
  avatarUrl: string | null | undefined;
  size: number;
  online: boolean;
  /** Diameter of the green dot, and the white ring around it (canvas Chat: 13/2.5 in the list, 11/2 in the thread). */
  dot: { size: number; ring: number; offset: number };
  textClassName?: string;
};

export const LIST_DOT = { size: 13, ring: 2.5, offset: 1 } as const;
export const THREAD_DOT = { size: 11, ring: 2, offset: 0 } as const;

/** Avatar with the green "Đang hoạt động" dot at the bottom right. */
export function PresenceAvatar({
  name,
  avatarUrl,
  size,
  online,
  dot,
  textClassName,
}: PresenceAvatarProps) {
  return (
    <View style={{ width: size, height: size }}>
      <UserAvatar name={name} avatarUrl={avatarUrl} size={size} textClassName={textClassName} />
      {online ? (
        <View
          accessibilityLabel="Đang hoạt động"
          className="absolute rounded-full bg-[#2F9E63]"
          style={{
            right: dot.offset,
            bottom: dot.offset,
            width: dot.size,
            height: dot.size,
            borderWidth: dot.ring,
            borderColor: '#FFFFFF',
          }}
        />
      ) : null}
    </View>
  );
}
