import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { RequireSession } from '@/components/auth/require-session';
import { TransactionScreen } from '@/components/transactions/transaction-screen';

/** Chi tiết giao dịch. */
export default function TransactionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RequireSession>
      <TransactionScreen transactionId={id} />
    </RequireSession>
  );
}
