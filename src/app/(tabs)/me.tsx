import React from 'react';
import { View } from 'react-native';
import { AuthButton } from '@/components/auth/auth-ui';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';

// Placeholder until the Tôi screens are built; sign-out is here so sessions can be switched while testing.
export default function MeTab() {
  const { session, signOut } = useAuth();

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white px-6">
      <AppText className="text-[16px] font-vn-semibold">Tôi</AppText>
      <AppText className="text-[14px] text-[#5A6772]">{session?.email}</AppText>
      <AuthButton variant="outline" label="Đăng xuất" onPress={() => signOut()} />
    </View>
  );
}
