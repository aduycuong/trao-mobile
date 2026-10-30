import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { RequireSession } from '@/components/auth/require-session';
import { ReportScreen } from '@/components/reports/report-screen';
import { isReportTargetType } from '@/services/reports/report-rules';

/** Báo cáo: `/report?type=transaction|listing|user&id=`. */
export default function ReportRoute() {
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>();
  if (!isReportTargetType(type) || !id) return null;
  return (
    <RequireSession>
      <ReportScreen type={type} id={id} />
    </RequireSession>
  );
}
