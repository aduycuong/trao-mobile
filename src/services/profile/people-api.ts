import { apiRequest } from '@/services/api';
import type {
  BlockedUser,
  FollowTab,
  ListFollowPeopleResult,
  ListingType,
  ListUserListingsResult,
  ListUserReviewsResult,
  PublicProfile,
  ReviewerRole,
} from '@/types/people';

export const MY_FOLLOWS_QUERY_KEY = ['me', 'follows'] as const;
export const MY_BLOCKS_QUERY_KEY = ['me', 'blocks'] as const;

const base = (handle: string) => `/api/users/${encodeURIComponent(handle)}`;

/** Open to guests; with a token the answer says whether the viewer follows this user. */
export function fetchPublicProfile(handle: string, token?: string): Promise<PublicProfile> {
  return apiRequest<PublicProfile>(base(handle), { token });
}

export function fetchUserListings(params: {
  handle: string;
  type?: ListingType;
  offset: number;
  token?: string;
}): Promise<ListUserListingsResult> {
  const query = new URLSearchParams({ offset: String(params.offset) });
  if (params.type) query.set('type', params.type);
  return apiRequest<ListUserListingsResult>(`${base(params.handle)}/listings?${query}`, {
    token: params.token,
  });
}

export function fetchUserReviews(params: {
  handle: string;
  role?: ReviewerRole;
  offset: number;
}): Promise<ListUserReviewsResult> {
  const query = new URLSearchParams({ offset: String(params.offset) });
  if (params.role) query.set('role', params.role);
  return apiRequest<ListUserReviewsResult>(`${base(params.handle)}/reviews?${query}`);
}

export async function setFollowing(token: string, handle: string, following: boolean) {
  await apiRequest(`${base(handle)}/follow`, { method: following ? 'PUT' : 'DELETE', token });
}

export async function setBlocked(token: string, handle: string, blocked: boolean) {
  await apiRequest(`${base(handle)}/block`, { method: blocked ? 'PUT' : 'DELETE', token });
}

export function fetchFollowPeople(params: {
  token: string;
  tab: FollowTab;
  keyword?: string;
  offset: number;
}): Promise<ListFollowPeopleResult> {
  const query = new URLSearchParams({ tab: params.tab, offset: String(params.offset) });
  if (params.keyword) query.set('keyword', params.keyword);
  return apiRequest<ListFollowPeopleResult>(`/api/me/follows?${query}`, { token: params.token });
}

export async function fetchBlockedUsers(token: string): Promise<BlockedUser[]> {
  const data = await apiRequest<{ items: BlockedUser[] }>('/api/me/blocks', { token });
  return data.items;
}

/** Hearts a listing; the answer carries the counter the server holds now. */
export function setListingLiked(
  token: string,
  listingId: string,
  liked: boolean
): Promise<{ liked: boolean; likeCount: number }> {
  return apiRequest(`/api/listings/${encodeURIComponent(listingId)}/like`, {
    method: liked ? 'POST' : 'DELETE',
    token,
  });
}
