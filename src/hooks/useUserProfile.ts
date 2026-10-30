import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchPublicProfile, fetchUserListings } from '@/services/profile/people-api';
import type { ListingType, PublicProfile } from '@/types/people';

export function userProfileKey(handle: string, uid: string | undefined) {
  return ['user', handle, 'profile', uid ?? null] as const;
}

/** A user's public profile. Open to guests; the answer says whether the viewer follows them. */
export function useUserProfile(handle: string) {
  const { session, getIdToken } = useAuth();

  return useQuery({
    queryKey: userProfileKey(handle, session?.uid),
    queryFn: async () => fetchPublicProfile(handle, session ? await getIdToken() : undefined),
    // A user who does not exist (or is blocked) will not appear by asking again.
    retry: false,
  });
}

/** Writes a follow into the cached profile and refreshes what shows the counters. */
export function useSetFollowingInCache(handle: string) {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return (following: boolean) => {
    queryClient.setQueryData<PublicProfile>(userProfileKey(handle, session?.uid), (current) =>
      current
        ? {
            ...current,
            following,
            followerCount: Math.max(0, current.followerCount + (following ? 1 : -1)),
          }
        : current
    );
    void queryClient.invalidateQueries({ queryKey: ['me'] });
  };
}

/** The listings anyone can see for a user, a page at a time. */
export function useUserListings(handle: string, type: ListingType | undefined, enabled = true) {
  const { session, getIdToken } = useAuth();

  return useInfiniteQuery({
    queryKey: ['user', handle, 'listings', type ?? 'all', session?.uid ?? null],
    queryFn: async ({ pageParam }) =>
      fetchUserListings({
        handle,
        type,
        offset: pageParam,
        token: session ? await getIdToken() : undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled,
  });
}
