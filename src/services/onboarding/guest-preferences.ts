import { getAsyncStorage } from '@/utils/async-storage';
import type { GuestPreferences } from '@/types/onboarding';

const STORAGE_KEY = 'trao.guest-preferences';

function isGuestPreferences(value: unknown): value is GuestPreferences {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GuestPreferences>;
  return (
    typeof candidate.locationName === 'string' &&
    Array.isArray(candidate.categoryIds) &&
    typeof candidate.location === 'object'
  );
}

export async function loadGuestPreferences(): Promise<GuestPreferences | null> {
  try {
    const raw = await getAsyncStorage().getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isGuestPreferences(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveGuestPreferences(preferences: GuestPreferences) {
  try {
    await getAsyncStorage().setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Without storage the start flow just shows again next launch.
  }
}

export async function clearGuestPreferences() {
  try {
    await getAsyncStorage().removeItem(STORAGE_KEY);
  } catch {
    // Ignore; the next sign-in tries again.
  }
}
