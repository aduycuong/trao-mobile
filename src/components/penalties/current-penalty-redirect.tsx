import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { useGoBack } from '@/hooks/useGoBack';
import { fetchActiveCard } from '@/services/penalties/penalties-api';

/**
 * `/penalty`: opens the card the user is under now. With none (the web goes back to Tôi), the
 * Help list says so instead of throwing the user to another tab.
 */
export function CurrentPenaltyRedirect() {
  const { session, getIdToken } = useAuth();
  const goBack = useGoBack('/me');
  const { data, error, refetch } = useQuery({
    queryKey: ['penalties', 'active', 'open', session?.uid ?? null],
    queryFn: async () => fetchActiveCard(await getIdToken()),
    enabled: !!session,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  if (data?.card)
    return <Redirect href={{ pathname: '/penalty/[id]', params: { id: data.card.id } }} />;

  return (
    <View className="flex-1 bg-white">
      <ScreenBar title="Thẻ phạt" onBack={goBack} />
      {error ? (
        <View accessibilityRole="alert" className="m-4 rounded-2xl bg-[#FDECEA] px-4 py-3">
          <AppText className="text-[14px] text-[#B42318]">{error.message}</AppText>
          <Pressable onPress={() => void refetch()} className="mt-1.5 self-start">
            <AppText className="text-[14px] font-vn-semibold text-[#B42318] underline">
              Thử lại
            </AppText>
          </Pressable>
        </View>
      ) : data ? (
        <View className="m-4 gap-1.5 rounded-2xl bg-[#F1F7FE] p-3.5">
          <AppText className="text-[15px] font-vn-bold">Bạn đang không có thẻ phạt</AppText>
          <AppText className="text-[13.5px] leading-[21px] text-[#33414D]">
            Tài khoản của bạn đang bình thường. Khi nhận thẻ Vàng hoặc thẻ Đỏ, bạn xem lý do và gửi
            kiến nghị ở đây.
          </AppText>
        </View>
      ) : (
        <View className="items-center py-10">
          <ActivityIndicator color="#1673D9" />
        </View>
      )}
    </View>
  );
}
