import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { PenaltyCardSwatch } from '@/components/penalties/penalty-card-swatch';
import { ActionBar } from '@/components/reports/action-bar';
import { EvidencePicker } from '@/components/reports/evidence-picker';
import { ReportBar } from '@/components/reports/report-bar';
import { StepTimeline } from '@/components/reports/step-timeline';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { useEvidence } from '@/hooks/useEvidence';
import { useGoBack } from '@/hooks/useGoBack';
import { fetchPenalty, penaltyKey, submitAppealRequest } from '@/services/penalties/penalties-api';
import {
  PENALTY_LOOK,
  PENALTY_RULES,
  appealSteps,
  cantLines,
  inactiveNote,
  penaltyWarning,
} from '@/services/penalties/penalty-rules';
import { APPEAL_REASON_MAX_LENGTH } from '@/services/reports/report-rules';
import type { PenaltyDetail } from '@/types/penalties';
import { formatDayMonth, formatEventTime, formatUpdatedDate } from '@/utils/format';

type View_ = 'notice' | 'appeal' | 'sent';

const TITLES: Record<View_, string> = {
  notice: 'Thẻ phạt',
  appeal: 'Gửi kiến nghị',
  sent: 'Kiến nghị',
};

/** Thẻ phạt (canvas Penalty): the notice, "Gửi kiến nghị" and "Kiến nghị" once sent. */
export function PenaltyScreen({ penaltyId }: { penaltyId: string }) {
  const goBack = useGoBack('/me');
  const { session, getIdToken } = useAuth();
  const { data, error, refetch, isPending } = useQuery({
    queryKey: penaltyKey(penaltyId, session?.uid),
    queryFn: async () => fetchPenalty(await getIdToken(), penaltyId),
    enabled: !!session,
    retry: false,
  });
  const [view, setView] = useState<View_>('notice');

  return (
    <View className="flex-1 bg-white">
      <ReportBar
        title={TITLES[view]}
        icon={view === 'appeal' ? 'back' : 'close'}
        onBack={view === 'appeal' ? () => setView('notice') : goBack}
      />
      {isPending ? (
        <View className="items-center py-10">
          <ActivityIndicator color="#1673D9" />
        </View>
      ) : error || !data ? (
        <View accessibilityRole="alert" className="m-4 rounded-2xl bg-[#FDECEA] px-4 py-3">
          <AppText className="text-[14px] text-[#B42318]">
            {error?.message ?? 'Không mở được thẻ phạt.'}
          </AppText>
          <Pressable onPress={() => void refetch()} className="mt-1.5 self-start">
            <AppText className="text-[14px] font-vn-semibold text-[#B42318] underline">
              Thử lại
            </AppText>
          </Pressable>
        </View>
      ) : (
        <PenaltyBody key={data.id} penalty={data} view={view} setView={setView} onDone={goBack} />
      )}
    </View>
  );
}

function CardBox({ penalty }: { penalty: PenaltyDetail }) {
  const look = PENALTY_LOOK[penalty.kind];
  return (
    <View
      className="flex-row items-center gap-4 rounded-[18px] p-4"
      style={{ backgroundColor: look.bg }}
    >
      <View style={{ marginLeft: 4 }}>
        <PenaltyCardSwatch color={look.color} width={48} height={66} radius={7} />
      </View>
      <View className="flex-1 gap-1">
        <AppText className="text-[18px] font-vn-bold" style={{ color: look.ink }}>
          {look.head}
        </AppText>
        <AppText className="text-[13.5px]" style={{ color: look.ink }}>
          Hiệu lực {formatDayMonth(new Date(penalty.startsAt))} –{' '}
          {formatUpdatedDate(penalty.endsAt)}
        </AppText>
        {penalty.active ? (
          <View
            className="mt-0.5 self-start rounded-full px-[9px] py-[3px]"
            style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}
          >
            <AppText className="text-[12px] font-vn-bold" style={{ color: look.ink }}>
              Còn {penalty.daysLeft} ngày
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Bullet({ line, ok }: { line: string; ok: boolean }) {
  return (
    <View className="flex-row items-start gap-2.5">
      <Svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke={ok ? '#2F9E63' : '#B42318'}
        strokeWidth={ok ? 2.6 : 2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginTop: 1 }}
      >
        {ok ? (
          <Path d="M5 12l5 5 9-10" />
        ) : (
          <>
            <Circle cx={12} cy={12} r={9} />
            <Path d="M6 6l12 12" />
          </>
        )}
      </Svg>
      <AppText className="flex-1 text-[14px] leading-[20px]">{line}</AppText>
    </View>
  );
}

function PenaltyBody({
  penalty,
  view,
  setView,
  onDone,
}: {
  penalty: PenaltyDetail;
  view: View_;
  setView: (view: View_) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getIdToken } = useAuth();
  const evidence = useEvidence();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const look = PENALTY_LOOK[penalty.kind];

  async function submit() {
    if (!reason.trim() || busy) return;
    setBusy(true);
    try {
      const token = await getIdToken();
      const evidenceKeys = await evidence.uploadAll(token);
      await submitAppealRequest(token, penalty.id, { reason: reason.trim(), evidenceKeys });
      await queryClient.invalidateQueries({ queryKey: ['penalty', penalty.id] });
      void queryClient.invalidateQueries({ queryKey: ['penalties', 'active'] });
      setView('sent');
    } catch (caught) {
      Alert.alert(
        'Không gửi được kiến nghị',
        caught instanceof Error ? caught.message : 'Thử lại sau.'
      );
    } finally {
      setBusy(false);
    }
  }

  if (view === 'appeal') {
    const ready = reason.trim().length > 0 && !busy;
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-[18px] px-4 pb-5 pt-[18px]"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <CardBox penalty={penalty} />
          <View className="gap-2">
            <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
              Vì sao bạn cho rằng thẻ này chưa đúng?
            </AppText>
            <TextInput
              accessibilityLabel="Lý do kiến nghị"
              value={reason}
              onChangeText={setReason}
              maxLength={APPEAL_REASON_MAX_LENGTH}
              multiline
              textAlignVertical="top"
              className="min-h-[130px] rounded-[14px] border-[1.5px] border-[#1673D9] bg-white px-3.5 py-3 font-vn text-[14px] leading-[21.7px] text-[#0F2440]"
            />
          </View>
          <View className="gap-2.5">
            <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
              Bằng chứng mới{' '}
              <AppText className="text-[13px] text-[#5A6772]">không bắt buộc</AppText>
            </AppText>
            <EvidencePicker
              uris={evidence.uris}
              canAdd={evidence.canAdd}
              onAdd={() => void evidence.add()}
              onRemove={evidence.remove}
            />
          </View>
          <View className="flex-row gap-2.5 rounded-[14px] bg-[#F1F7FE] px-3.5 py-3">
            <Svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1673D9"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginTop: 2 }}
            >
              <Circle cx={12} cy={12} r={9} />
              <Path d="M12 8v4M12 16h.01" />
            </Svg>
            <AppText className="flex-1 text-[13px] leading-[19.5px] text-[#33414D]">
              Mỗi thẻ được kiến nghị{' '}
              <AppText className="text-[13px] font-vn-bold text-[#33414D]">một lần</AppText>. Trao
              trả lời trong 3 ngày làm việc; trong lúc chờ, thẻ vẫn có hiệu lực. Kiến nghị được chấp
              nhận thì thẻ được gỡ và xoá khỏi hồ sơ công khai.
            </AppText>
          </View>
        </ScrollView>
        <ActionBar
          buttons={[
            {
              label: busy ? 'Đang gửi…' : 'Gửi kiến nghị',
              disabled: !ready,
              loading: busy,
              onPress: () => void submit(),
            },
          ]}
        />
      </KeyboardAvoidingView>
    );
  }

  if (view === 'sent' && penalty.appeal) {
    const appeal = penalty.appeal;
    return (
      <>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-[18px] px-4 pb-5 pt-[18px]"
          showsVerticalScrollIndicator={false}
        >
          <CardBox penalty={penalty} />
          <StepTimeline steps={appealSteps(appeal, formatEventTime)} />
          {appeal.status === 'pending' ? (
            <AppText className="text-[13.5px] leading-[21px] text-[#5A6772]">
              Trong lúc chờ, thẻ vẫn có hiệu lực. Bạn nhận thông báo khi có kết quả.
            </AppText>
          ) : null}
        </ScrollView>
        <ActionBar buttons={[{ label: 'Xong', onPress: onDone }]} />
      </>
    );
  }

  const rule = PENALTY_RULES[penalty.kind];
  return (
    <>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-[18px] px-4 pb-5 pt-[18px]"
        showsVerticalScrollIndicator={false}
      >
        {!penalty.active ? (
          <View className="rounded-[14px] bg-[#F2F5F8] px-3.5 py-3">
            <AppText className="text-[13.5px] leading-[20px] text-[#33414D]">
              {inactiveNote(penalty.status)}
            </AppText>
          </View>
        ) : null}
        <CardBox penalty={penalty} />

        <View className="gap-1.5">
          <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
            Lý do
          </AppText>
          <AppText className="text-[14px] leading-[21.7px] text-[#33414D]">
            {penalty.reason}
          </AppText>
          {penalty.transactionId ? (
            <Pressable
              accessibilityRole="link"
              onPress={() =>
                router.push({
                  pathname: '/transactions/[id]',
                  params: { id: penalty.transactionId! },
                })
              }
              className="self-start"
            >
              <AppText className="text-[13.5px] font-vn-semibold text-[#1673D9]">
                Xem giao dịch và kết quả xét
              </AppText>
            </Pressable>
          ) : null}
        </View>

        {penalty.active ? (
          <>
            <View className="gap-2">
              <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
                Tạm không làm được
              </AppText>
              {cantLines(penalty).map((line) => (
                <Bullet key={line} line={line} ok={false} />
              ))}
            </View>
            <View className="gap-2">
              <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
                Vẫn làm được
              </AppText>
              {rule.can.map((line) => (
                <Bullet key={line} line={line} ok />
              ))}
            </View>
            <View
              className="flex-row gap-2.5 rounded-[14px] px-3.5 py-3"
              style={{ backgroundColor: look.warnBg }}
            >
              <Svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke={look.warnInk}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginTop: 2 }}
              >
                <Path d="M12 3l9 16H3zM12 10v4M12 17h.01" />
              </Svg>
              <AppText className="flex-1 text-[13.5px] leading-[20px] text-[#33414D]">
                {penaltyWarning(penalty)}
              </AppText>
            </View>
          </>
        ) : null}
      </ScrollView>

      <ActionBar
        buttons={[
          ...(penalty.canAppeal
            ? [
                {
                  label: 'Gửi kiến nghị',
                  tone: 'outline' as const,
                  onPress: () => setView('appeal'),
                },
              ]
            : penalty.appeal
              ? [
                  {
                    label: 'Xem kiến nghị',
                    tone: 'outline' as const,
                    onPress: () => setView('sent'),
                  },
                ]
              : []),
          { label: 'Đã hiểu', onPress: onDone },
        ]}
      />
    </>
  );
}
