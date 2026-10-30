import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { RequireSession } from '@/components/auth/require-session';
import { PenaltyScreen } from '@/components/penalties/penalty-screen';

/** Thẻ phạt, gửi kiến nghị và kiến nghị đã gửi. */
export default function PenaltyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RequireSession>
      <PenaltyScreen penaltyId={id} />
    </RequireSession>
  );
}
