import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { AuthProvider } from '@/providers/AuthProvider';
import { ChatProvider } from '@/providers/ChatProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

/**
 * Screens that show a deal or a conversation read again every time they open, like the web
 * (React Query's own default). The rest keeps the longer `staleTime` above.
 */
const LIVE_QUERY_ROOTS = [
  'deals',
  'listing-offers',
  'listing-page',
  'listing-comments',
  'auction-board',
  'transactions',
] as const;
for (const root of LIVE_QUERY_ROOTS) queryClient.setQueryDefaults([root], { staleTime: 0 });

// React Query only learns that the app came back to the front when told; on the web the
// browser says so. Stale queries of the open screen then read again.
focusManager.setEventListener((handleFocus) => {
  if (Platform.OS === 'web') return () => {};
  const subscription = AppState.addEventListener('change', (state) =>
    handleFocus(state === 'active')
  );
  return () => subscription.remove();
});

type AppProvidersProps = {
  children: React.ReactNode;
};

/** Keeps the splash up until Firebase has restored (or ruled out) the persisted session. */
function SplashGate() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'restoring') SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  return null;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AuthProvider>
            <SplashGate />
            <ChatProvider>
              {children}
              <StatusBar style="auto" />
            </ChatProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
