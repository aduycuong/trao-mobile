import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { RequireSession } from '@/components/auth/require-session';
import { PostStartSheet } from '@/components/post/post-start-sheet';

/** "Đăng tin" chooser as a screen (canvas Post, step "start"): a new item, or one from Kho đồ. */
function PostStartContent() {
  const router = useRouter();
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View className="flex-1 bg-transparent">
      <PostStartSheet onClose={close} />
    </View>
  );
}

export default function PostStartScreen() {
  return (
    <RequireSession>
      <PostStartContent />
    </RequireSession>
  );
}
