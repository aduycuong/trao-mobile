import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { ScreenBar } from '@/components/navigation/screen-bar';
import { ActionBar } from '@/components/reports/action-bar';
import { EvidencePicker } from '@/components/reports/evidence-picker';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { useEvidence } from '@/hooks/useEvidence';
import { useGoBack } from '@/hooks/useGoBack';
import { caseKey, fetchMyCase, submitStatementRequest } from '@/services/cases/cases-api';
import { CASE_TEXT_MAX_LENGTH } from '@/services/reports/report-rules';

/**
 * Giải trình: Trao asks one side of a case for their account before deciding. No canvas artboard
 * shows this screen (same in the web app), so it uses the form pieces of the report screens.
 */
export function StatementScreen({ caseId }: { caseId: string }) {
  const goBack = useGoBack('/');
  const queryClient = useQueryClient();
  const { session, getIdToken } = useAuth();
  const evidence = useEvidence();
  const { data, error, refetch, isPending } = useQuery({
    queryKey: caseKey(caseId, session?.uid),
    queryFn: async () => fetchMyCase(await getIdToken(), caseId),
    enabled: !!session,
    retry: false,
  });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const token = await getIdToken();
      const evidenceKeys = await evidence.uploadAll(token);
      await submitStatementRequest(token, caseId, { body: text.trim(), evidenceKeys });
      Alert.alert('Đã gửi giải trình cho Trao.');
      await queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    } catch (caught) {
      Alert.alert(
        'Không gửi được giải trình',
        caught instanceof Error ? caught.message : 'Thử lại sau.'
      );
    } finally {
      setBusy(false);
    }
  }

  let body: React.ReactNode;
  if (isPending) {
    body = (
      <View className="items-center py-10">
        <ActivityIndicator color="#1673D9" />
      </View>
    );
  } else if (error || !data) {
    body = (
      <View accessibilityRole="alert" className="m-4 rounded-2xl bg-[#FDECEA] px-4 py-3">
        <AppText className="text-[14px] text-[#B42318]">
          {error?.message ?? 'Không mở được hồ sơ.'}
        </AppText>
        <Pressable onPress={() => void refetch()} className="mt-1.5 self-start">
          <AppText className="text-[14px] font-vn-semibold text-[#B42318] underline">
            Thử lại
          </AppText>
        </Pressable>
      </View>
    );
  } else if (data.status === 'decided') {
    body = (
      <View className="m-4 gap-1.5 rounded-2xl bg-[#F1F7FE] p-3.5">
        <AppText className="text-[15px] font-vn-bold">Trao đã xét xong</AppText>
        <AppText className="text-[13.5px] leading-[21px] text-[#33414D]">{data.decision}</AppText>
      </View>
    );
  } else if (data.status !== 'awaiting_statement') {
    body = (
      <View className="m-4 rounded-2xl bg-[#F1F7FE] p-3.5">
        <AppText className="text-[13.5px] leading-[21px] text-[#33414D]">
          {data.answered
            ? 'Trao đã nhận giải trình của bạn và đang xem xét. Bạn sẽ nhận thông báo khi có quyết định.'
            : 'Hiện Trao không cần bạn giải trình thêm.'}
        </AppText>
      </View>
    );
  } else {
    body = (
      <>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-[18px] px-4 pb-5 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-1.5 rounded-2xl bg-[#F7F9FB] p-3.5">
            <AppText className="text-[12px] font-vn-semibold text-[#5A6772]">
              Trao hỏi{data.title ? ` về ${data.title}` : ''}
            </AppText>
            <AppText className="text-[14.5px] font-vn-semibold leading-[22.5px]">
              {data.question}
            </AppText>
          </View>
          <View className="gap-2">
            <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
              Giải trình của bạn
            </AppText>
            <TextInput
              accessibilityLabel="Giải trình của bạn"
              value={text}
              onChangeText={setText}
              maxLength={CASE_TEXT_MAX_LENGTH}
              multiline
              textAlignVertical="top"
              className="min-h-[130px] rounded-[14px] border-[1.5px] border-[#1673D9] bg-white px-3.5 py-3 font-vn text-[14px] leading-[21.7px] text-[#0F2440]"
            />
          </View>
          <View className="gap-2.5">
            <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
              Bằng chứng <AppText className="text-[13px] text-[#5A6772]">không bắt buộc</AppText>
            </AppText>
            <EvidencePicker
              uris={evidence.uris}
              canAdd={evidence.canAdd}
              onAdd={() => void evidence.add()}
              onRemove={evidence.remove}
            />
          </View>
          <AppText className="text-[13px] leading-[19.5px] text-[#5A6772]">
            Trao đọc cả hai phía rồi mới quyết định. Người kia không thấy giải trình này.
          </AppText>
        </ScrollView>
        <ActionBar
          buttons={[
            {
              label: busy ? 'Đang gửi…' : 'Gửi giải trình',
              disabled: !text.trim() || busy,
              loading: busy,
              onPress: () => void submit(),
            },
          ]}
        />
      </>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <ScreenBar title="Giải trình" onBack={goBack} />
      {body}
    </KeyboardAvoidingView>
  );
}
