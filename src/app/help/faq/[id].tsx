import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { MarkdownContent } from '@/components/help/markdown-content';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { AppText } from '@/components/ui/app-text';
import { fetchFaq } from '@/services/help/help-api';
import { PolicySkeleton } from '@/components/ui/skeletons';

/** One FAQ with its answer (Markdown). Open to guests. */
export default function FaqScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, refetch, isPending } = useQuery({
    queryKey: ['faq', id],
    queryFn: () => fetchFaq(id),
    retry: false,
  });

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/help');
  };

  return (
    <View className="flex-1 bg-white">
      <ScreenBar title="Câu hỏi thường gặp" onBack={back} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-8 pt-2">
        {isPending ? <PolicySkeleton /> : null}
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
              {data.question}
            </AppText>
            <MarkdownContent>{data.answer}</MarkdownContent>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
