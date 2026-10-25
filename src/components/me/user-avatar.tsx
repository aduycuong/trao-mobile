import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { avatarImageUri, isImageAvatar } from '@/utils/avatar';
import { getInitials } from '@/utils/format';

type UserAvatarProps = {
  name: string | null | undefined;
  avatarUrl: string | null | undefined;
  /** Diameter in px. */
  size: number;
  /** Ring drawn around the disc (the profile header uses white + yellow). */
  ring?: boolean;
  textClassName?: string;
};

/** Avatar photo, or the initials on a yellow disc when there is none. */
export function UserAvatar({ name, avatarUrl, size, ring, textClassName }: UserAvatarProps) {
  const uri = avatarUrl && isImageAvatar(avatarUrl) ? avatarImageUri(avatarUrl) : null;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="items-center justify-center overflow-hidden rounded-full bg-[#FFE7A0]"
      style={[
        { width: size, height: size },
        ring ? { borderWidth: 3, borderColor: '#FFFFFF' } : null,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <AppText className={`font-vn-bold ${textClassName ?? ''}`}>{getInitials(name)}</AppText>
      )}
    </View>
  );
}
