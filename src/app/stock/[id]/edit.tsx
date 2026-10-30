import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ItemForm } from '@/components/stock/item-form';
import { RequireSession } from '@/components/auth/require-session';

/** Chỉnh sửa an item of the Kho đồ (canvas Post, mode "edit"). */
function EditItemContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ItemForm itemId={id} />;
}

export default function EditItemScreen() {
  return (
    <RequireSession>
      <EditItemContent />
    </RequireSession>
  );
}
