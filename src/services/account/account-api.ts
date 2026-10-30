import { apiRequest } from '@/services/api';
import type {
  MyAccount,
  MySettings,
  Theme,
  UpdateMyAccountBody,
  VideoAutoplay,
} from '@/types/account';
import type { OnboardingLocation, ResolvedLocation } from '@/types/onboarding';

export const MY_ACCOUNT_QUERY_KEY = ['me', 'account'] as const;
export const MY_SETTINGS_QUERY_KEY = ['me', 'settings'] as const;

/** A location from the area picker, in the shape the save routes take. */
export function toOnboardingLocation(resolved: ResolvedLocation): OnboardingLocation {
  return { source: 'area', point: resolved.point, regionIds: resolved.regionIds };
}

export function fetchMyAccount(token: string): Promise<MyAccount> {
  return apiRequest<MyAccount>('/api/me/account', { token });
}

/** A username already taken answers 409 with a message to show on the field. */
export async function patchMyAccount(token: string, body: UpdateMyAccountBody): Promise<void> {
  await apiRequest<{ saved: true }>('/api/me/account', { method: 'PATCH', body, token });
}

export async function putMyArea(token: string, location: OnboardingLocation): Promise<void> {
  await apiRequest<{ saved: true }>('/api/me/account/area', {
    method: 'PUT',
    body: { location },
    token,
  });
}

/** Soft delete; 409 while a transaction is in progress. The caller signs out after. */
export async function deleteMyAccount(token: string): Promise<void> {
  await apiRequest<{ deleted: true }>('/api/me/account', { method: 'DELETE', token });
}

export function fetchMySettings(token: string): Promise<MySettings> {
  return apiRequest<MySettings>('/api/me/settings', { token });
}

export async function patchMySettings(
  token: string,
  body: {
    videoAutoplay?: VideoAutoplay;
    theme?: Theme;
    defaultLocation?: OnboardingLocation;
  }
): Promise<void> {
  await apiRequest<{ saved: true }>('/api/me/settings', { method: 'PATCH', body, token });
}

export async function deleteMySearchHistory(token: string): Promise<void> {
  await apiRequest<{ cleared: true }>('/api/me/search-history', { method: 'DELETE', token });
}
