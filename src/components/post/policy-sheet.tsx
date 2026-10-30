import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Pressable } from 'react-native';
import { MarkdownContent } from '@/components/help/markdown-content';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { BarButton } from '@/components/ui/form-controls';
import { fetchPolicyPage } from '@/services/help/help-api';

/**
 * A policy page in a sheet over the current screen, so reading it does not leave a form half
 * done. Same text as the page (/policies/[slug]).
 */
export function PolicySheet({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { data, error, refetch, isPending } = useQuery({
    queryKey: ['policy', slug],
    queryFn: () => fetchPolicyPage(slug),
    retry: false,
  });

  return (
    <BottomSheet title={data?.title ?? 'Đang tải…'} onClose={onClose}>
      {isPending ? <AppText className="text-[14px] text-[#5A6772]">Đang tải…</AppText> : null}
      {error ? (
        <>
          <AppText accessibilityRole="alert" className="text-[14px] text-[#B42318]">
            {error.message}
          </AppText>
          <Pressable onPress={() => refetch()}>
            <AppText className="text-[14px] font-vn-semibold text-[#B42318] underline">
              Thử lại
            </AppText>
          </Pressable>
        </>
      ) : null}
      {data ? <MarkdownContent>{data.body}</MarkdownContent> : null}
      <BarButton label="Đã hiểu" onPress={onClose} />
    </BottomSheet>
  );
}
