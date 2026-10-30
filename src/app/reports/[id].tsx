import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { RequireSession } from '@/components/auth/require-session';
import { ReportStatusScreen } from '@/components/reports/report-status-screen';

/** Theo dõi một báo cáo đã gửi. */
export default function ReportStatusRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RequireSession>
      <ReportStatusScreen reportId={id} />
    </RequireSession>
  );
}
