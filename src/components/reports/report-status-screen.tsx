import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { ActionBar } from '@/components/reports/action-bar';
import { EvidencePicker } from '@/components/reports/evidence-picker';
import { ReportBar } from '@/components/reports/report-bar';
import { ReportSubjectCard } from '@/components/reports/report-subject-card';
import { StepTimeline } from '@/components/reports/step-timeline';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { BarButton } from '@/components/ui/form-controls';
import { useAuth } from '@/hooks/useAuth';
import { useEvidence } from '@/hooks/useEvidence';
import { useGoBack } from '@/hooks/useGoBack';
import {
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_STATUS_STYLE,
  evidenceSummary,
} from '@/services/reports/report-rules';
import { addReportEvidenceRequest, fetchReport, reportKey } from '@/services/reports/reports-api';
import type { ReportDetail } from '@/types/reports';
import { formatDayMonth } from '@/utils/format';
import { StackSkeleton } from '@/components/ui/skeletons';

/** Theo dõi báo cáo (canvas Report, step "status"): where it stands, the result, what was sent. */
export function ReportStatusScreen({ reportId }: { reportId: string }) {
  const goBack = useGoBack('/');
  const queryClient = useQueryClient();
  const { session, getIdToken } = useAuth();
  const { data, error, refetch, isPending } = useQuery({
    queryKey: reportKey(reportId, session?.uid),
    queryFn: async () => fetchReport(await getIdToken(), reportId),
    enabled: !!session,
    retry: false,
  });
  const [adding, setAdding] = useState(false);

  return (
    <View className="flex-1 bg-white">
      <ReportBar title={data ? `Báo cáo #${data.code}` : 'Báo cáo'} icon="close" onBack={goBack} />

      {isPending ? (
        <StackSkeleton blocks={['h-[80px] rounded-2xl', 'h-40 rounded-2xl']} />
      ) : error || !data ? (
        <View accessibilityRole="alert" className="m-4 rounded-2xl bg-[#FDECEA] px-4 py-3">
          <AppText className="text-[14px] text-[#B42318]">
            {error?.message ?? 'Không mở được báo cáo.'}
          </AppText>
          <Pressable onPress={() => void refetch()} className="mt-1.5 self-start">
            <AppText className="text-[14px] font-vn-semibold text-[#B42318] underline">
              Thử lại
            </AppText>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-5 px-4 pb-5 pt-4"
            showsVerticalScrollIndicator={false}
          >
            <Body report={data} />
          </ScrollView>
          <ActionBar
            buttons={[
              data.status === 'resolved'
                ? { label: 'Xong', onPress: goBack }
                : { label: 'Bổ sung bằng chứng', onPress: () => setAdding(true) },
            ]}
          />
          {adding ? (
            <AddEvidenceSheet
              reportId={data.id}
              onClose={() => setAdding(false)}
              onAdded={() => {
                setAdding(false);
                Alert.alert('Đã bổ sung cho Trao.');
                void queryClient.invalidateQueries({ queryKey: ['report', reportId] });
              }}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

function Body({ report }: { report: ReportDetail }) {
  const style = REPORT_STATUS_STYLE[report.status];
  const partner = report.target.partnerName ?? 'bên kia';
  return (
    <>
      <ReportSubjectCard target={report.target} />

      <View className="flex-row items-center gap-2">
        <View
          className="h-7 flex-row items-center gap-1.5 rounded-full px-2.5"
          style={{ backgroundColor: style.bg }}
        >
          <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: style.dot }} />
          <AppText className="text-[12.5px] font-vn-bold" style={{ color: style.fg }}>
            {report.statusLabel}
          </AppText>
        </View>
        <AppText className="text-[12.5px] text-[#5A6772]">
          Mã #{report.code} · gửi {formatDayMonth(new Date(report.createdAt))}
        </AppText>
      </View>

      {report.resolution ? (
        <View className="gap-1.5 rounded-2xl bg-[#E3F4EA] p-3.5">
          <AppText className="text-[15px] font-vn-bold text-[#1E6B43]">
            {report.resolution.title}
          </AppText>
          {report.resolution.body ? (
            <AppText className="text-[13.5px] leading-[21px] text-[#1E3D2C]">
              {report.resolution.body}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <StepTimeline steps={report.timeline} />

      <View className="gap-2 rounded-2xl border border-[#E6ECF2] p-3.5">
        <AppText className="text-[12.5px] text-[#5A6772]">Lý do</AppText>
        <AppText className="text-[14px] font-vn-bold">{report.reasonLabel}</AppText>
        {report.description ? (
          <>
            <AppText className="mt-1 text-[12.5px] text-[#5A6772]">Mô tả</AppText>
            <AppText className="text-[13.5px] leading-[21px] text-[#33414D]">
              {report.description}
            </AppText>
          </>
        ) : null}
        <AppText className="mt-1 text-[12.5px] text-[#5A6772]">Bằng chứng</AppText>
        <AppText className="text-[13.5px] text-[#33414D]">
          {evidenceSummary(report.evidenceCount, report.chatAttached, partner)}
        </AppText>
      </View>
    </>
  );
}

function AddEvidenceSheet({
  reportId,
  onClose,
  onAdded,
}: {
  reportId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { getIdToken } = useAuth();
  const evidence = useEvidence();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = (note.trim().length > 0 || evidence.uris.length > 0) && !busy;

  async function submit() {
    if (!ready) return;
    setBusy(true);
    try {
      const token = await getIdToken();
      const evidenceKeys = await evidence.uploadAll(token);
      await addReportEvidenceRequest(token, reportId, {
        note: note.trim() || undefined,
        evidenceKeys,
      });
      onAdded();
    } catch (caught) {
      Alert.alert('Không bổ sung được', caught instanceof Error ? caught.message : 'Thử lại sau.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet title="Bổ sung bằng chứng" onClose={onClose}>
      <TextInput
        accessibilityLabel="Ghi chú thêm"
        value={note}
        onChangeText={setNote}
        placeholder="Ghi chú thêm cho Trao"
        placeholderTextColor="#A3AEB9"
        maxLength={REPORT_DESCRIPTION_MAX_LENGTH}
        multiline
        textAlignVertical="top"
        className="min-h-[88px] rounded-[14px] border-[1.5px] border-[#D5DDE5] px-3.5 py-3 font-vn text-[14px] leading-[21.7px] text-[#0F2440]"
      />
      <EvidencePicker
        uris={evidence.uris}
        canAdd={evidence.canAdd}
        onAdd={() => void evidence.add()}
        onRemove={evidence.remove}
      />
      <View className="flex-row gap-2.5">
        <BarButton label="Đóng" tone="tinted" onPress={onClose} />
        <BarButton
          label={busy ? 'Đang gửi…' : 'Gửi bổ sung'}
          flex={1.4}
          disabled={!ready}
          loading={busy}
          onPress={() => void submit()}
        />
      </View>
    </BottomSheet>
  );
}
