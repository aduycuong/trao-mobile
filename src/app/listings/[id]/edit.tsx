import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PostListingFlow } from '@/components/post/post-listing-flow';
import { AppText } from '@/components/ui/app-text';
import { ErrorBox } from '@/components/ui/form-controls';
import { useAuth } from '@/hooks/useAuth';
import { useGoBack } from '@/hooks/useGoBack';
import { fetchMyListing, listingQueryKey } from '@/services/listings/listings-api';
import { RequireSession } from '@/components/auth/require-session';

/**
 * Edit a listing, send a rejected one again, or post a closed one again: the Đăng tin steps with
 * the listing's own fields filled in. The server decides what needs a new review.
 */
function EditListingContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { session, getIdToken } = useAuth();
  const goBack = useGoBack({ pathname: '/listings/[id]', params: { id } });
  const {
    data: listing,
    error,
    refetch,
    isPending,
  } = useQuery({
    queryKey: listingQueryKey(id, session?.uid),
    queryFn: async () => fetchMyListing(await getIdToken(), id),
    enabled: !!session,
  });

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#1673D9" />
      </View>
    );
  }
  if (error || !listing) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <ErrorBox
          message={error?.message ?? 'Không tìm thấy tin.'}
          onRetry={() => refetch()}
          onBack={goBack}
        />
      </View>
    );
  }

  const closed = listing.status === 'closed';
  const blocked = closed
    ? listing.canRepost
      ? null
      : listing.repostBlockedReason
    : listing.editBlockedReason;
  if (blocked) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <View accessibilityRole="alert" className="m-4 rounded-2xl bg-[#FFF4D6] px-4 py-3">
          <AppText className="text-[14px] text-[#3D2A00]">{blocked}</AppText>
          <Pressable onPress={goBack} className="mt-1.5">
            <AppText className="text-[14px] font-vn-semibold text-[#3D2A00] underline">
              Quay lại
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <PostListingFlow
      itemId={listing.itemId}
      from="edit"
      initialType={listing.type}
      listingId={listing.id}
      prefill={listing.fields}
      title={closed ? 'Đăng lại' : 'Sửa tin'}
    />
  );
}

export default function EditListingScreen() {
  return (
    <RequireSession>
      <EditListingContent />
    </RequireSession>
  );
}
