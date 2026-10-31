import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ItemForm } from '@/components/stock/item-form';
import { RequireSession } from '@/components/auth/require-session';

/** Chỉnh sửa an item of the Kho đồ (canvas Post, mode "edit"). */
function EditItemContent() {
  const { id, after } = useLocalSearchParams<{ id: string; after?: string }>();
  return <ItemForm itemId={id} afterSave={after === 'listings' ? 'listings' : undefined} />;
}

export default function EditItemScreen() {
  return (
    <RequireSession>
      <EditItemContent />
    </RequireSession>
  );
}
