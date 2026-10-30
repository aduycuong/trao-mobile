import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { PostListingFlow } from '@/components/post/post-listing-flow';
import { LISTING_TYPES, type ListingType } from '@/types/people';
import { RequireSession } from '@/components/auth/require-session';

/** Đăng tin for an item of the Kho đồ (canvas Post, steps "listing" and "check"). */
function PostItemContent() {
  const { id, from, type } = useLocalSearchParams<{ id: string; from?: string; type?: string }>();
  const initialType = LISTING_TYPES.find((entry): entry is ListingType => entry === type);

  return (
    <PostListingFlow
      itemId={id}
      from={from === 'new' ? 'new' : 'stock'}
      initialType={initialType}
    />
  );
}

export default function PostItemScreen() {
  return (
    <RequireSession>
      <PostItemContent />
    </RequireSession>
  );
}
