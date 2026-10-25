import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { AreaStep } from '@/components/onboarding/area-step';
import { InterestStep } from '@/components/onboarding/interest-step';
import { LocationStep } from '@/components/onboarding/location-step';
import { WelcomeStep } from '@/components/onboarding/welcome-step';
import { useAuth } from '@/hooks/useAuth';
import { ONBOARDING_QUERY_KEY } from '@/hooks/useOnboardingState';
import { saveGuestPreferences } from '@/services/onboarding/guest-preferences';
import { postOnboarding } from '@/services/onboarding/onboarding-api';
import type { OnboardingLocation, ResolvedLocation } from '@/types/onboarding';

type Step = 'welcome' | 'location' | 'area' | 'interest';

type PickedLocation = { source: OnboardingLocation['source']; resolved: ResolvedLocation };

/** First-time flow: welcome, area, interest categories. Shown once. */
export default function StartScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, getIdToken } = useAuth();
  const params = useLocalSearchParams<{ step?: string }>();
  const [step, setStep] = useState<Step>(params.step === 'location' ? 'location' : 'welcome');
  // Null until an area is picked; stays null when the area step is skipped.
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(source: PickedLocation['source'], resolved: ResolvedLocation) {
    setPicked({ source, resolved });
    setStep('interest');
  }

  async function finish(categoryIds: string[]) {
    setError(null);
    setSaving(true);
    const location: OnboardingLocation | null = picked
      ? {
          source: picked.source,
          point: picked.resolved.point,
          regionIds: picked.resolved.regionIds,
        }
      : null;
    try {
      if (session) {
        await postOnboarding(await getIdToken(), { location, categoryIds });
        await queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
      } else {
        await saveGuestPreferences({
          location,
          locationName: picked?.resolved.name ?? '',
          categoryIds,
        });
      }
      router.replace('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không lưu được. Thử lại sau.');
      setSaving(false);
    }
  }

  switch (step) {
    case 'welcome':
      return (
        <WelcomeStep onStart={() => setStep('location')} onLogin={() => router.push('/login')} />
      );
    case 'location':
      return (
        <LocationStep
          onBack={() => setStep('welcome')}
          onSkip={() => setStep('interest')}
          onLocated={(resolved) => pick('device', resolved)}
          onPickArea={() => setStep('area')}
        />
      );
    case 'area':
      return (
        <AreaStep
          onBack={() => setStep('location')}
          onPicked={(resolved) => pick('area', resolved)}
        />
      );
    case 'interest':
      return (
        <InterestStep
          onBack={() => setStep('location')}
          saving={saving}
          error={error}
          onDone={finish}
        />
      );
  }
}
