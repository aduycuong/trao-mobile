import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ActionBar } from '@/components/reports/action-bar';
import { EvidencePicker } from '@/components/reports/evidence-picker';
import { ReportBar } from '@/components/reports/report-bar';
import { ReportSubjectCard } from '@/components/reports/report-subject-card';
import { AppText } from '@/components/ui/app-text';
import { Switch } from '@/components/ui/form-controls';
import { useAuth } from '@/hooks/useAuth';
import { useEvidence } from '@/hooks/useEvidence';
import { useGoBack } from '@/hooks/useGoBack';
import {
  createReportRequest,
  fetchReportTarget,
  reportTargetKey,
} from '@/services/reports/reports-api';
import {
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_MAX_EVIDENCE,
  REPORT_QUESTION,
  initialReason,
  reasonsFor,
  reportNote,
} from '@/services/reports/report-rules';
import type { ReportTarget, ReportTargetType } from '@/types/reports';
import { StackSkeleton } from '@/components/ui/skeletons';

/**
 * Báo cáo (canvas Report): reason, then what happened with photos, then "Đã gửi báo cáo" with the
 * code. Opened for a transaction, a listing or a user.
 */
export function ReportScreen({ type, id }: { type: ReportTargetType; id: string }) {
  const { session, getIdToken } = useAuth();
  const goBack = useGoBack('/');
  const { data, error, refetch, isPending } = useQuery({
    queryKey: reportTargetKey(type, id, session?.uid),
    queryFn: async () => fetchReportTarget(await getIdToken(), type, id),
    enabled: !!session,
    retry: false,
    staleTime: 0,
  });

  if (isPending || error || !data) {
    return (
      <View className="flex-1 bg-white">
        <ReportBar title="Báo cáo" icon="close" onBack={goBack} />
        {isPending ? (
          <StackSkeleton blocks={['h-[80px] rounded-2xl', 'h-52 rounded-2xl']} />
        ) : (
          <View accessibilityRole="alert" className="m-4 rounded-2xl bg-[#FDECEA] px-4 py-3">
            <AppText className="text-[14px] text-[#B42318]">
              {error?.message ?? 'Không mở được màn báo cáo.'}
            </AppText>
            <Pressable onPress={() => void refetch()} className="mt-1.5 self-start">
              <AppText className="text-[14px] font-vn-semibold text-[#B42318] underline">
                Thử lại
              </AppText>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  return <ReportFlow key={`${data.targetType}:${data.targetId}`} target={data} onClose={goBack} />;
}

function ReportFlow({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
  const router = useRouter();
  const { getIdToken } = useAuth();
  const evidence = useEvidence();
  const reasons = reasonsFor(target.targetType, target.reasons);
  const [step, setStep] = useState<'reason' | 'detail' | 'done'>('reason');
  const [reason, setReason] = useState<string | null>(initialReason(target.presetReason, reasons));
  const [description, setDescription] = useState('');
  const [attachChat, setAttachChat] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ id: string; code: string } | null>(null);

  const picked = reasons.find((entry) => entry.code === reason) ?? null;
  const partner = target.partnerName ?? 'bên kia';

  async function submit() {
    if (!picked || busy) return;
    setBusy(true);
    try {
      const token = await getIdToken();
      const evidenceKeys = await evidence.uploadAll(token);
      const result = await createReportRequest(token, {
        targetType: target.targetType,
        targetId: target.targetId,
        reason: picked.code,
        description: description.trim() || undefined,
        evidenceKeys,
        attachChat: target.hasChat && attachChat,
      });
      setSent(result);
      setStep('done');
    } catch (caught) {
      Alert.alert(
        'Không gửi được báo cáo',
        caught instanceof Error ? caught.message : 'Thử lại sau.'
      );
    } finally {
      setBusy(false);
    }
  }

  if (step === 'done' && sent) {
    return (
      <View className="flex-1 bg-white">
        <ReportBar title="Báo cáo" icon="close" onBack={onClose} />
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-4 pb-5 pt-4"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center gap-3 px-2 pt-5">
            <View
              accessibilityElementsHidden
              className="h-[76px] w-[76px] items-center justify-center rounded-full bg-[#E6F1FF]"
            >
              <Svg
                width={36}
                height={36}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1673D9"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M5 12l5 5 9-10" />
              </Svg>
            </View>
            <AppText className="mt-1 text-[21px] font-vn-bold">Đã gửi báo cáo</AppText>
            <View className="rounded-lg bg-[#F2F5F8] px-2.5 py-1">
              <AppText className="text-[13px] font-vn-bold text-[#33414D]">Mã #{sent.code}</AppText>
            </View>
            <AppText className="text-center text-[14.5px] leading-[22.5px] text-[#33414D]">
              Trao xem xét trong{' '}
              <AppText className="text-[14.5px] font-vn-bold text-[#33414D]">
                1–2 ngày làm việc
              </AppText>{' '}
              và báo kết quả qua thông báo. Trong lúc chờ, bạn vẫn bổ sung được bằng chứng.
            </AppText>
            {target.hasChat ? (
              <AppText className="text-center text-[13.5px] leading-[20px] text-[#5A6772]">
                Nếu báo cáo liên quan việc huỷ giao dịch, Trao xét chung với lý do huỷ trước khi
                quyết định có phạt thẻ hay không.
              </AppText>
            ) : null}
          </View>
        </ScrollView>
        <ActionBar
          buttons={[
            {
              label: 'Xem báo cáo',
              tone: 'outline',
              onPress: () => router.replace({ pathname: '/reports/[id]', params: { id: sent.id } }),
            },
            { label: 'Xong', onPress: onClose },
          ]}
        />
      </View>
    );
  }

  const ready = step === 'reason' ? reason !== null : !busy;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <ReportBar
        title="Báo cáo"
        icon={step === 'detail' ? 'back' : 'close'}
        onBack={step === 'detail' ? () => setStep('reason') : onClose}
        trailing={step === 'reason' ? '1/2' : '2/2'}
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-4 pb-5 pt-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ReportSubjectCard target={target} />

        {step === 'reason' ? (
          <View accessibilityRole="radiogroup" className="gap-1">
            <AppText accessibilityRole="header" className="mb-1.5 text-[17px] font-vn-bold">
              {REPORT_QUESTION[target.targetType]}
            </AppText>
            {reasons.map((entry) => {
              const on = entry.code === reason;
              return (
                <Pressable
                  key={entry.code}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setReason(entry.code)}
                  className="flex-row items-center gap-3 border-b border-[#EEF2F6] px-1 py-[13px]"
                >
                  <View className="flex-1 gap-0.5">
                    <AppText className={`text-[14.5px] ${on ? 'font-vn-bold' : 'font-vn-medium'}`}>
                      {entry.label}
                    </AppText>
                    {entry.hint ? (
                      <AppText className="text-[12.5px] text-[#5A6772]">{entry.hint}</AppText>
                    ) : null}
                  </View>
                  <View
                    className={`h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
                      on ? 'border-[#1673D9]' : 'border-[#C3CCD6]'
                    }`}
                  >
                    <View
                      className={`h-2.5 w-2.5 rounded-full ${on ? 'bg-[#1673D9]' : 'bg-transparent'}`}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <>
            <View className="flex-row items-center gap-2">
              <AppText className="text-[13px] text-[#5A6772]">Lý do</AppText>
              <View className="h-[30px] shrink justify-center rounded-full bg-[#FDECEA] px-3">
                <AppText numberOfLines={1} className="text-[13px] font-vn-bold text-[#B42318]">
                  {picked?.label}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setStep('reason')}
                className="ml-auto h-8 justify-center px-1.5"
              >
                <AppText className="text-[13px] font-vn-semibold text-[#1673D9]">Đổi</AppText>
              </Pressable>
            </View>

            <View className="gap-2">
              <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
                Chuyện gì đã xảy ra?
              </AppText>
              <TextInput
                accessibilityLabel="Chuyện gì đã xảy ra?"
                value={description}
                onChangeText={setDescription}
                maxLength={REPORT_DESCRIPTION_MAX_LENGTH}
                multiline
                textAlignVertical="top"
                className="min-h-[120px] rounded-[14px] border-[1.5px] border-[#1673D9] bg-white px-3.5 py-3 font-vn text-[14px] leading-[21.7px] text-[#0F2440]"
              />
              <AppText className="text-[12.5px] text-[#5A6772]">
                Ghi rõ thời gian, địa điểm, số tiền nếu có. Không cần lặp lại nội dung đã có trong
                chat.
              </AppText>
            </View>

            <View className="gap-2.5">
              <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
                Bằng chứng{' '}
                <AppText className="text-[13px] text-[#5A6772]">
                  ảnh, ảnh chụp màn hình · tối đa {REPORT_MAX_EVIDENCE}
                </AppText>
              </AppText>
              <EvidencePicker
                uris={evidence.uris}
                canAdd={evidence.canAdd}
                onAdd={() => void evidence.add()}
                onRemove={evidence.remove}
              />
              {target.hasChat ? (
                <View className="flex-row items-center gap-3 rounded-[14px] border border-[#E6ECF2] px-3.5 py-3">
                  <Svg
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1673D9"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Path d="M4 5h16v11H8l-4 4z" />
                  </Svg>
                  <View className="min-w-0 flex-1 gap-0.5">
                    <AppText className="text-[14px] font-vn-bold">
                      Gửi kèm chat với {partner}
                    </AppText>
                    <AppText className="text-[12.5px] text-[#5A6772]">
                      Chỉ đội xử lý của Trao xem, chỉ đoạn liên quan đến giao dịch này
                    </AppText>
                  </View>
                  <Pressable
                    accessibilityRole="switch"
                    accessibilityLabel="Gửi kèm chat"
                    accessibilityState={{ checked: attachChat }}
                    onPress={() => setAttachChat((current) => !current)}
                  >
                    <Switch on={attachChat} />
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View className="flex-row gap-2.5 rounded-[14px] bg-[#FFF4D6] px-3.5 py-3">
              <Svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8A5A00"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginTop: 2 }}
              >
                <Circle cx={12} cy={12} r={9} />
                <Path d="M12 8v4M12 16h.01" />
              </Svg>
              <AppText className="flex-1 text-[13px] leading-[19.5px] text-[#3D2A00]">
                {reportNote(target.targetType, partner)}
              </AppText>
            </View>
          </>
        )}
      </ScrollView>

      <ActionBar
        buttons={[
          {
            label: step === 'reason' ? 'Tiếp' : busy ? 'Đang gửi…' : 'Gửi báo cáo',
            disabled: !ready,
            loading: busy,
            onPress: () => (step === 'reason' ? setStep('detail') : void submit()),
          },
        ]}
      />
    </KeyboardAvoidingView>
  );
}
