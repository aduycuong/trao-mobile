import { apiRequest } from '@/services/api';
import type {
  CreateReportBody,
  ReportDetail,
  ReportTarget,
  ReportTargetType,
} from '@/types/reports';

export const reportTargetKey = (type: string, id: string, uid: string | undefined) =>
  ['report-target', type, id, uid ?? null] as const;
export const reportKey = (id: string, uid: string | undefined) =>
  ['report', id, uid ?? null] as const;

export function fetchReportTarget(
  token: string,
  type: ReportTargetType,
  id: string
): Promise<ReportTarget> {
  return apiRequest(`/api/reports/target?type=${type}&id=${encodeURIComponent(id)}`, { token });
}

export function createReportRequest(
  token: string,
  body: CreateReportBody
): Promise<{ id: string; code: string }> {
  return apiRequest('/api/reports', { token, method: 'POST', body });
}

export function fetchReport(token: string, id: string): Promise<ReportDetail> {
  return apiRequest(`/api/reports/${encodeURIComponent(id)}`, { token });
}

export async function addReportEvidenceRequest(
  token: string,
  id: string,
  body: { note?: string; evidenceKeys: string[] }
): Promise<void> {
  await apiRequest(`/api/reports/${encodeURIComponent(id)}/evidence`, {
    token,
    method: 'POST',
    body,
  });
}
