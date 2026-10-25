export type GeoPoint = { lat: number; lng: number };

export type RegionIds = {
  countryId: string;
  cityId: string;
  localId: string | null;
};

/** An area the backend resolved; `point` is private to the user who resolved it. */
export type ResolvedLocation = {
  point: GeoPoint;
  regionIds: RegionIds;
  /** Display name, e.g. "Bến Thành, Hồ Chí Minh". */
  name: string;
};

export type PlaceSuggestion = {
  placeId: string;
  description: string;
  /** Bold part of the row. */
  mainText: string;
  secondaryText: string;
};

export type OnboardingLocation = {
  /** `device`: GPS position. `area`: picked area. */
  source: 'device' | 'area';
  point: GeoPoint;
  regionIds: RegionIds;
};

export type SaveOnboardingBody = {
  /** Null when the area step was skipped. */
  location: OnboardingLocation | null;
  categoryIds: string[];
};

export type CategorySummary = {
  id: string;
  slug: string;
  name: string;
};

/** What a guest picked at the start, kept on this device until they sign in. */
export type GuestPreferences = SaveOnboardingBody & {
  /** Display name of the area, only for this device. */
  locationName: string;
};
