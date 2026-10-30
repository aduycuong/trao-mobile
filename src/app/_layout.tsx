import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  useFonts,
} from '@expo-google-fonts/be-vietnam-pro';
import { Stack } from 'expo-router';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { AppProviders } from '@/providers';

/** Push registration and tap routing; rendered inside the providers and the router. */
function PushEffects() {
  usePushNotifications();
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });

  // The splash stays up until the fonts are ready (or failed, then the system font is used).
  if (!fontsLoaded && !fontError) return null;

  return (
    <AppProviders>
      <PushEffects />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        {/* Full height like the web gate; it still slides up from the bottom. */}
        <Stack.Screen
          name="auth-gate"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </AppProviders>
  );
}
