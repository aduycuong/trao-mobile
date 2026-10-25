import { apiRequest } from '@/services/api';
import type {
  CategorySummary,
  GeoPoint,
  PlaceSuggestion,
  ResolvedLocation,
  SaveOnboardingBody,
} from '@/types/onboarding';

export async function fetchCategories(): Promise<CategorySummary[]> {
  const data = await apiRequest<{ categories: CategorySummary[] }>('/api/categories');
  return data.categories;
}

/** Device position → area. */
export function reverseGeocode(point: GeoPoint): Promise<ResolvedLocation> {
  return apiRequest<ResolvedLocation>(`/api/geo/reverse?lat=${point.lat}&lng=${point.lng}`);
}

export async function suggestAreas(params: {
  input: string;
  sessionToken: string;
  near?: GeoPoint;
}): Promise<PlaceSuggestion[]> {
  const query = new URLSearchParams({ input: params.input, sessionToken: params.sessionToken });
  if (params.near) {
    query.set('lat', String(params.near.lat));
    query.set('lng', String(params.near.lng));
  }
  const data = await apiRequest<{ suggestions: PlaceSuggestion[] }>(`/api/geo/suggest?${query}`);
  return data.suggestions;
}

/** Picked suggestion → area. Send the token the suggestions were fetched with. */
export function resolvePlace(params: {
  placeId: string;
  sessionToken: string;
}): Promise<ResolvedLocation> {
  const query = new URLSearchParams({ sessionToken: params.sessionToken });
  return apiRequest<ResolvedLocation>(
    `/api/geo/places/${encodeURIComponent(params.placeId)}?${query}`
  );
}

export async function postOnboarding(token: string, body: SaveOnboardingBody): Promise<void> {
  await apiRequest<{ saved: true }>('/api/me/onboarding', { method: 'POST', body, token });
}

export async function fetchOnboarded(token: string): Promise<boolean> {
  const me = await apiRequest<{ onboarded: boolean }>('/api/me', { token });
  return me.onboarded;
}
