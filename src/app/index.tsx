import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { useOnboardingState } from '@/hooks/useOnboardingState';

// Placeholder home until the Home screens are built. A first-time visitor, guest or new account,
// goes through the start flow once.
export default function Index() {
  const { loading, onboarded } = useOnboardingState();

  if (loading) return null;
  if (!onboarded) return <Redirect href="/start" />;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Trao</Text>
    </View>
  );
}
