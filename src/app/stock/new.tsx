import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ItemForm } from '@/components/stock/item-form';
import { useAuth } from '@/hooks/useAuth';

/** Thêm đồ (canvas Post, step "item"); `?flow=post` makes it step 1 of Đăng tin. */
export default function NewItemScreen() {
  const { flow } = useLocalSearchParams<{ flow?: string }>();
  const { session, status } = useAuth();

  if (!session && status !== 'restoring') return <Redirect href="/auth-gate" />;
  return <ItemForm flow={flow === 'post' ? 'post' : undefined} />;
}
