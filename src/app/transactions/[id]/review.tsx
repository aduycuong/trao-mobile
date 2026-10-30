import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { RequireSession } from '@/components/auth/require-session';
import { ReviewScreen } from '@/components/reviews/review-screen';

/** Đánh giá giao dịch. */
export default function ReviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RequireSession>
      <ReviewScreen transactionId={id} />
    </RequireSession>
  );
}
