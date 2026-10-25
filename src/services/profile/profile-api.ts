import { apiRequest } from '@/services/api';
import type { MyProfile, PhoneVerificationState } from '@/types/profile';

export const MY_PROFILE_QUERY_KEY = ['me', 'profile'] as const;

export function fetchMyProfile(token: string): Promise<MyProfile> {
  return apiRequest<MyProfile>('/api/me/profile', { token });
}

/** With `change`, an account that already has a number verifies another one. */
export function fetchPhoneVerification(
  token: string,
  change = false
): Promise<PhoneVerificationState> {
  return apiRequest<PhoneVerificationState>(
    change ? '/api/me/phone-verification?change=1' : '/api/me/phone-verification',
    { token }
  );
}
