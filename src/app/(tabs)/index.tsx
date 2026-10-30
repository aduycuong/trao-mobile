import { Redirect } from 'expo-router';
import { HomeScreen } from '@/components/home/home-screen';
import { useOnboardingState } from '@/hooks/useOnboardingState';

// A first-time visitor, guest or new account, goes through the start flow once; then Home.
export default function Index() {
  const { loading, onboarded } = useOnboardingState();

  if (loading) return null;
  if (!onboarded) return <Redirect href="/start" />;

  return <HomeScreen />;
}
