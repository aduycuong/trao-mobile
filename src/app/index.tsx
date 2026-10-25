import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

// Placeholder home until the Home screens are built; guests land on sign-in for now.
export default function Index() {
  const { status } = useAuth();

  if (status === 'signedOut') return <Redirect href="/login" />;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Trao</Text>
    </View>
  );
}
