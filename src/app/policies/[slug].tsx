import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { MarkdownContent } from '@/components/help/markdown-content';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { AppText } from '@/components/ui/app-text';
import { fetchPolicyPage } from '@/services/help/help-api';
import { formatUpdatedDate } from '@/utils/format';

/** A policy or help page, read from the backend (Markdown). Open to guests. */
export default function PolicyScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, error, refetch, isPending } = useQuery({
    queryKey: ['policy', slug],
    queryFn: () => fetchPolicyPage(slug),
    // A missing page will not appear by asking again.
    retry: false,
  });

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/help');
  };

  return (
    <View className="flex-1 bg-white">
      <ScreenBar title={data?.title ?? 'Trợ giúp & chính sách'} onBack={back} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-8 pt-2">
        {isPending ? (
          <AppText className="py-6 text-center text-[14px] text-[#5A6772]">Đang tải…</AppText>
        ) : null}
        {error ? (
          <View accessibilityRole="alert" className="mt-2 rounded-2xl bg-[#FDECEA] px-4 py-3">
            <AppText className="text-[14px] text-[#B42318]">{error.message}</AppText>
            <Pressable onPress={() => refetch()} className="mt-1.5">
              <AppText className="text-[14px] font-vn-semibold text-[#B42318] underline">
                Thử lại
              </AppText>
            </Pressable>
          </View>
        ) : null}
        {data ? (
          <>
            <AppText
              accessibilityRole="header"
              className="mt-3 text-[22px] font-vn-bold leading-[29px]"
            >
              {data.title}
            </AppText>
            <MarkdownContent>{data.body}</MarkdownContent>
            <AppText className="mt-6 text-[12.5px] text-[#8794A1]">
              Cập nhật lần cuối {formatUpdatedDate(data.updatedAt)}
            </AppText>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
