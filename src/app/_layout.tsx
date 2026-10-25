import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  useFonts,
} from '@expo-google-fonts/be-vietnam-pro';
import { Stack } from 'expo-router';
import { AppProviders } from '@/providers';

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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth-gate" options={{ presentation: 'modal' }} />
      </Stack>
    </AppProviders>
  );
}
