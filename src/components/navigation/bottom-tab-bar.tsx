import { useQuery } from '@tanstack/react-query';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabIcon, type TabIconKind } from '@/components/icons/tab-icon';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { apiRequest } from '@/services/api';

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: { name: string; label: string; icon: TabIconKind }[] = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'chat', label: 'Tin nhắn', icon: 'chat' },
  { name: 'stock', label: 'Kho đồ', icon: 'stock' },
  { name: 'listings', label: 'Tin đăng', icon: 'listings' },
  { name: 'me', label: 'Tôi', icon: 'me' },
];

/** Tabs a guest can open; the rest lead to the sign-in gate. */
const GUEST_TABS = ['index'];

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, status, getIdToken } = useAuth();
  const { unreadTotal } = useChat();
  const summary = useQuery({
    queryKey: ['deals', 'summary', session?.uid],
    queryFn: async () =>
      apiRequest<{ newOffers: number }>('/api/deals/summary', { token: await getIdToken() }),
    enabled: !!session,
  });
  const badges: Partial<Record<TabIconKind, number>> = {
    chat: unreadTotal,
    listings: summary.data?.newOffers ?? 0,
  };
  const activeName = state.routes[state.index]?.name;
  // The labels sit close to the bottom edge: the home indicator (about 34 high on an iPhone, a thin
  // bar near the very bottom) only needs the lower part of the safe area, so 12 of it is given
  // back, but never less than 10 above the edge.
  const paddingBottom = Math.max(insets.bottom - 12, 10);

  return (
    <View
      accessibilityRole="tablist"
      className="flex-row border-t border-[#E8ECF0] bg-white px-1 pt-1.5"
      style={{ paddingBottom }}
    >
      {TABS.map((tab) => {
        const active = tab.name === activeName;
        const badge = session ? (badges[tab.icon] ?? 0) : 0;

        function onPress() {
          if (!session && status !== 'restoring' && !GUEST_TABS.includes(tab.name)) {
            router.push('/auth-gate');
            return;
          }
          const route = state.routes.find((r) => r.name === tab.name);
          if (route && !active) navigation.navigate(route.name);
        }

        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={onPress}
            className="min-h-[54px] flex-1 items-center justify-center gap-1"
          >
            <View className="h-[30px] w-[30px]">
              <View style={{ opacity: active ? 1 : 0.45 }}>
                <TabIcon kind={tab.icon} active={active} />
              </View>
              {badge > 0 ? (
                <View
                  accessibilityLabel={
                    tab.icon === 'chat' ? `${badge} tin chưa đọc` : `${badge} đề nghị mới`
                  }
                  className="absolute h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-[#1673D9] px-[5px]"
                  style={{ top: -4, right: -8 }}
                >
                  <AppText className="text-[10px] font-vn-bold text-white">
                    {badge > 99 ? '99+' : badge}
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText
              className={`text-[11.5px] ${
                active ? 'font-vn-bold text-[#0F2440]' : 'font-vn-medium text-[#5A6772]'
              }`}
            >
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
