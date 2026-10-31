import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ItemForm } from '@/components/stock/item-form';
import { RequireSession } from '@/components/auth/require-session';

/** Chỉnh sửa an item of the Kho đồ (canvas Post, mode "edit"). */
function EditItemContent() {
  const { id, after, listing } = useLocalSearchParams<{
    id: string;
    after?: string;
    listing?: string;
  }>();
  // Opened from the edit of a listing: saving ends on that listing's "sent" screen.
  return (
    <ItemForm
      itemId={id}
      afterSave={after === 'listing' && listing ? { listingId: listing } : undefined}
    />
  );
}

export default function EditItemScreen() {
  return (
    <RequireSession>
      <EditItemContent />
    </RequireSession>
  );
}
