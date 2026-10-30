import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { RequireSession } from '@/components/auth/require-session';
import { StatementScreen } from '@/components/reports/statement-screen';

/** Giải trình: the side Trao asks to answer in a case. */
export default function CaseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RequireSession>
      <StatementScreen caseId={id} />
    </RequireSession>
  );
}
