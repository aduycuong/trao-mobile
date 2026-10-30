import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { UserAvatar } from '@/components/me/user-avatar';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { fetchPendingActions } from '@/services/deals/deals-api';

const SHOWN = 3;

/** The server sends web paths (`/app/transactions/:id`); the app's routes have no `/app` prefix. */
export function appHref(href: string): Href {
  return href.replace(/^\/app(?=\/|$)/, '') as Href;
}

/**
 * "Chờ bạn chốt" on Home (canvas Main, `myBids`): deals to confirm and offers to answer, the first
 * few with a button, the rest in the chat list.
 */
export function PendingDeals() {
  const router = useRouter();
  const { session, getIdToken } = useAuth();
  const { data } = useQuery({
    queryKey: ['deals', 'pending', session?.uid],
    queryFn: async () => fetchPendingActions(await getIdToken()),
    enabled: !!session,
  });
  const items = data?.items ?? [];
  if (!session || items.length === 0) return null;

  return (
    <View className="mx-4 mb-[22px] rounded-[20px] bg-[#F1F7FE] px-3.5 pb-1.5 pt-1">
      <View className="flex-row items-center gap-2">
        <AppText accessibilityRole="header" className="flex-1 text-[15px] font-vn-bold">
          Chờ bạn chốt{' '}
          <AppText className="text-[15px] font-vn-medium text-[#5A6772]">{items.length}</AppText>
        </AppText>
        {items.length > SHOWN ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/chat')}
            className="min-h-11 justify-center"
          >
            <AppText className="text-[13px] font-vn-semibold text-[#1673D9]">Xem tất cả</AppText>
          </Pressable>
        ) : null}
      </View>
      {items.slice(0, SHOWN).map((entry) => (
        <Pressable
          key={entry.key}
          accessibilityRole="link"
          onPress={() => router.push(appHref(entry.href))}
          className="flex-row items-center gap-3 border-t border-[#E3E8ED] py-2.5"
        >
          <UserAvatar
            name={entry.counterpart.name}
            avatarUrl={entry.counterpart.avatarUrl}
            size={44}
            textClassName="text-[14px] text-[#0F2440]"
          />
          <View className="min-w-0 flex-1 gap-0.5">
            <AppText numberOfLines={1} className="text-[13.5px] font-vn-semibold">
              {entry.title}
            </AppText>
            <AppText numberOfLines={1} className="text-[12.5px] text-[#5A6772]">
              {entry.status}
            </AppText>
          </View>
          <View
            className={`h-[30px] justify-center rounded-full px-3 ${
              entry.kind === 'confirm' ? 'bg-[#FFC22E]' : 'bg-[#1673D9]'
            }`}
          >
            <AppText
              className={`text-[12.5px] font-vn-bold ${
                entry.kind === 'confirm' ? 'text-[#3D2A00]' : 'text-white'
              }`}
            >
              {entry.cta}
            </AppText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
