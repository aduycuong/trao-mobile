import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { setFollowing } from '@/services/profile/people-api';

type FollowButtonProps = {
  handle: string;
  following: boolean;
  /** `large`: the profile; `compact`: lists and the listings header. */
  size?: 'large' | 'compact';
  /** Label when not following, e.g. "Follow lại" in the followers list. */
  idleLabel?: string;
  /** Runs after the server accepted the change. */
  onChanged: (following: boolean) => void;
};

/** Follow / "Đang follow" toggle. A guest is sent to the sign-in screen first. */
export function FollowButton({
  handle,
  following,
  size = 'compact',
  idleLabel = 'Follow',
  onChanged,
}: FollowButtonProps) {
  const router = useRouter();
  const { session, getIdToken } = useAuth();
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!session) {
      router.push('/auth-gate');
      return;
    }
    setPending(true);
    try {
      await setFollowing(await getIdToken(), handle, !following);
      onChanged(!following);
    } catch (caught) {
      Alert.alert(
        'Không thực hiện được',
        caught instanceof Error ? caught.message : 'Thử lại sau.'
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: following, disabled: pending }}
      disabled={pending}
      onPress={toggle}
      className={`items-center justify-center ${
        size === 'large' ? 'h-11 flex-1 rounded-xl' : 'h-[34px] rounded-[10px] px-3.5'
      } ${following ? 'border-[1.5px] border-[#D5DDE5] bg-white' : 'bg-[#1673D9]'} ${
        pending ? 'opacity-60' : ''
      }`}
    >
      <AppText
        className={`font-vn-bold ${size === 'large' ? 'text-[14.5px]' : 'text-[13px]'} ${
          following ? '' : 'text-white'
        }`}
      >
        {following ? 'Đang follow' : idleLabel}
      </AppText>
    </Pressable>
  );
}
