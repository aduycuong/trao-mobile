import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmSheet } from '@/components/me/confirm-sheet';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { PolicySheet } from '@/components/post/policy-sheet';
import { CancelSheet } from '@/components/transactions/cancel-sheet';
import { AppText } from '@/components/ui/app-text';
import { ErrorBox } from '@/components/ui/form-controls';
import { PathIcon } from '@/components/ui/path-icon';
import { useAuth } from '@/hooks/useAuth';
import { useGoBack } from '@/hooks/useGoBack';
import { useTransactionActions } from '@/hooks/useTransactionActions';
import { fetchTransaction, transactionKey } from '@/services/transactions/transactions-api';
import {
  FORM_LABEL,
  TRANSACTION_DONE_LABELS,
  buildTerms,
  progressSteps,
} from '@/services/transactions/transaction-rules';
import { formatDayMonth } from '@/utils/format';

/**
 * Chi tiết giao dịch (canvas Chat, chi tiết thoả thuận): the item, the terms, the five steps, and
 * what each side can do.
 */
export function TransactionScreen({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = useGoBack('/chat');
  const { session, getIdToken } = useAuth();
  const actions = useTransactionActions();
  const { data, error, refetch, isPending } = useQuery({
    queryKey: transactionKey(transactionId, session?.uid),
    queryFn: async () => fetchTransaction(await getIdToken(), transactionId),
    enabled: !!session,
    retry: false,
  });
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [policy, setPolicy] = useState(false);

  /** Báo cáo: the box of a deal the other side cancelled and the "Khiếu nại" link. */
  function reportTransaction() {
    router.push({ pathname: '/report', params: { type: 'transaction', id: transactionId } });
  }

  if (isPending) {
    return (
      <View className="flex-1 bg-white">
        <ScreenBar title="Chi tiết giao dịch" onBack={goBack} />
        <View className="items-center py-10">
          <ActivityIndicator color="#1673D9" />
        </View>
      </View>
    );
  }
  if (error || !data) {
    return (
      <View className="flex-1 bg-white">
        <ScreenBar title="Chi tiết giao dịch" onBack={goBack} />
        <ErrorBox
          message={error?.message ?? 'Không mở được giao dịch.'}
          onRetry={() => refetch()}
          onBack={goBack}
        />
      </View>
    );
  }

  const deal = data;
  const otherName = deal.counterpart.name ?? 'Người kia';
  const inProgress = deal.status === 'in_progress';
  const terms = buildTerms(deal);
  const steps = progressSteps(deal);
  const inboxId = deal.inboxId;

  return (
    <View className="flex-1 bg-white">
      <ScreenBar title="Chi tiết giao dịch" onBack={goBack} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 24,
          gap: 18,
        }}
      >
        {deal.status === 'completed' ? (
          <View className="gap-1 rounded-2xl border border-[#BFE3CD] bg-[#E3F4EA] p-3.5">
            <AppText className="text-[14.5px] font-vn-bold text-[#1E6B43]">
              Giao dịch hoàn tất · {TRANSACTION_DONE_LABELS[deal.type]}
            </AppText>
            <AppText className="text-[13.5px] leading-[20px] text-[#1E6B43]">
              {deal.role === 'buyer' || deal.counterItem
                ? 'Món đã vào Kho đồ của bạn.'
                : `Món đã chuyển cho ${otherName}.`}
              {deal.completedAt ? ` ${formatDayMonth(new Date(deal.completedAt))}.` : ''}
            </AppText>
          </View>
        ) : null}

        {deal.cancel && !deal.cancel.byMe ? (
          <View className="gap-2.5 rounded-2xl border border-[#F6D2CC] bg-[#FDF2F0] p-3.5">
            <AppText className="text-[14px] leading-[21px]">
              <AppText className="text-[14px] font-vn-bold">{otherName}</AppText> đã huỷ giao dịch
              này{deal.cancel.reasonLabel ? `: ${deal.cancel.reasonLabel}` : ''}. Nếu việc huỷ gây
              thiệt hại cho bạn, hãy báo cáo để Trao xem xét.
            </AppText>
            <Pressable
              accessibilityRole="button"
              onPress={reportTransaction}
              className="h-10 justify-center self-start rounded-[11px] border-[1.5px] border-[#B42318] bg-white px-4"
            >
              <AppText className="text-[14px] font-vn-bold text-[#B42318]">Báo cáo</AppText>
            </Pressable>
          </View>
        ) : null}
        {deal.cancel?.byMe ? (
          <View className="gap-1 rounded-2xl border border-[#E1E7ED] bg-[#F2F5F8] p-3.5">
            <AppText className="text-[14px] font-vn-bold">Trao đang xem xét việc huỷ</AppText>
            <AppText className="text-[13.5px] leading-[20px] text-[#33414D]">
              {deal.cancel.reasonLabel ? `Lý do: ${deal.cancel.reasonLabel}. ` : ''}Kết quả (có bị
              thẻ Vàng hay không) sẽ được báo cho bạn; nếu bị phạt, bạn vẫn gửi kiến nghị được.
            </AppText>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="link"
          onPress={() => router.push({ pathname: '/l/[id]', params: { id: deal.listing.id } })}
          className="flex-row items-center gap-3 rounded-2xl bg-[#F1F7FE] p-3"
        >
          <View className="h-[72px] w-[60px] overflow-hidden rounded-xl bg-[#E6F1FF]">
            {deal.item.coverUrl ? (
              <Image
                source={{ uri: deal.item.coverUrl }}
                style={{ width: 60, height: 72 }}
                contentFit="cover"
              />
            ) : null}
          </View>
          <View className="min-w-0 flex-1 gap-[3px]">
            <AppText className="text-[12px] font-vn-semibold text-[#1673D9]">
              {FORM_LABEL[deal.type]}
            </AppText>
            <AppText className="text-[15px] font-vn-semibold leading-[20px]">
              {deal.item.title}
            </AppText>
            {deal.counterItem ? (
              <AppText className="text-[12.5px] text-[#5A6772]">
                Đổi lấy {deal.counterItem.title}
              </AppText>
            ) : null}
          </View>
          <AppText className="text-[13px] font-vn-bold text-[#1673D9]">Xem tin</AppText>
        </Pressable>

        <View className="rounded-2xl border border-[#E8ECF0]">
          {terms.map(([key, value], index) => (
            <View
              key={key}
              className={`flex-row items-baseline justify-between gap-3 px-3.5 py-[11px] ${
                index > 0 ? 'border-t border-[#EEF2F6]' : ''
              }`}
            >
              <AppText className="text-[13px] text-[#5A6772]">{key}</AppText>
              <AppText className="min-w-0 flex-1 text-right text-[14px] font-vn-semibold">
                {value}
              </AppText>
            </View>
          ))}
        </View>

        <View className="gap-1">
          <AppText accessibilityRole="header" className="mb-1.5 text-[15px] font-vn-bold">
            Tiến trình
          </AppText>
          {steps.map((step, index) => (
            <View key={step.title} className="flex-row gap-3">
              <View className="w-6 items-center">
                <View
                  className={`h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
                    step.done
                      ? 'border-[#1673D9] bg-[#1673D9]'
                      : step.current
                        ? 'border-[#1673D9] bg-white'
                        : 'border-[#C3CCD6] bg-white'
                  }`}
                >
                  {step.done ? (
                    <PathIcon d="M5 12l4 4 10-10" size={12} color="#FFFFFF" strokeWidth={3.4} />
                  ) : step.current ? (
                    <View className="h-2 w-2 rounded-full bg-[#1673D9]" />
                  ) : null}
                </View>
                {index < steps.length - 1 ? (
                  <View
                    className={`w-0.5 flex-1 ${step.done ? 'bg-[#1673D9]' : 'bg-[#E1E7EE]'}`}
                    style={{ minHeight: 18 }}
                  />
                ) : null}
              </View>
              <View className="flex-1 gap-0.5 pb-3.5">
                <AppText
                  className={`text-[14px] ${
                    step.current
                      ? 'font-vn-bold'
                      : step.done
                        ? 'font-vn-semibold'
                        : 'font-vn-medium text-[#8A96A3]'
                  }`}
                >
                  {step.title}
                </AppText>
                {step.sub ? (
                  <AppText className="text-[12.5px] text-[#5A6772]">{step.sub}</AppText>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <View className="flex-row gap-4">
          <Pressable accessibilityRole="button" onPress={reportTransaction}>
            <AppText className="text-[13px] text-[#5A6772]">Khiếu nại</AppText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setPolicy(true)} className="ml-auto">
            <AppText className="text-[13px] font-vn-semibold text-[#1673D9]">
              Quy định {FORM_LABEL[deal.type].toLowerCase()}
            </AppText>
          </Pressable>
        </View>
      </ScrollView>

      {deal.status === 'completed' ? (
        <View
          className="gap-2 border-t border-[#E8ECF0] bg-white px-4 pt-3"
          style={{ paddingBottom: 16 + insets.bottom }}
        >
          {deal.review.mineSent ? (
            <AppText className="rounded-xl bg-[#F1F7FE] px-3.5 py-2.5 text-center text-[13.5px] leading-[20px] text-[#33414D]">
              Bạn đã đánh giá {otherName}.{' '}
              {deal.review.theirsSent
                ? 'Cả hai đánh giá đã hiện trên hồ sơ.'
                : `Đánh giá hiện trên hồ sơ khi ${otherName} cũng đánh giá, hoặc sau 7 ngày.`}
            </AppText>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/transactions/[id]/review', params: { id: deal.id } })
              }
              className="h-[50px] items-center justify-center rounded-[14px] bg-[#1673D9]"
            >
              <AppText className="text-[15px] font-vn-bold text-white">
                Đánh giá {otherName}
              </AppText>
            </Pressable>
          )}
        </View>
      ) : null}

      {inProgress ? (
        <View
          className="gap-2 border-t border-[#E8ECF0] bg-white px-4 pt-3"
          style={{ paddingBottom: 16 + insets.bottom }}
        >
          {deal.meConfirmed ? (
            <AppText className="rounded-xl bg-[#F1F7FE] px-3.5 py-2.5 text-center text-[13.5px] text-[#33414D]">
              Bạn đã xác nhận. Chờ {otherName} xác nhận để hoàn tất.
            </AppText>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={actions.busy}
              onPress={() => setConfirming(true)}
              className={`h-[50px] items-center justify-center rounded-[14px] bg-[#1673D9] ${
                actions.busy ? 'opacity-60' : ''
              }`}
            >
              <AppText className="text-[15px] font-vn-bold text-white">Xác nhận hoàn thành</AppText>
            </Pressable>
          )}
          <View className="flex-row gap-2">
            {inboxId ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/chat/[inboxId]',
                    params: { inboxId, listing: deal.listing.id },
                  })
                }
                className="h-11 flex-1 items-center justify-center rounded-xl border-[1.5px] border-[#C9DDF4]"
              >
                <AppText className="text-[14px] font-vn-semibold">Nhắn tin</AppText>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => setCancelling(true)}
              className="h-11 flex-1 items-center justify-center rounded-xl border-[1.5px] border-[#F3C7C2] bg-white"
            >
              <AppText className="text-[14px] font-vn-semibold text-[#B42318]">
                Huỷ giao dịch
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {confirming ? (
        <ConfirmSheet
          title="Xác nhận hoàn thành?"
          description={`Chỉ xác nhận khi hai bên đã giao nhận và thanh toán xong ${deal.item.title}. Khi cả hai cùng xác nhận, giao dịch hoàn tất và món đổi chủ.`}
          confirmLabel="Xác nhận"
          onConfirm={async () => {
            await actions.confirm(deal.id);
            setConfirming(false);
          }}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
      {cancelling ? (
        <CancelSheet
          transactionId={deal.id}
          otherName={otherName}
          onClose={() => setCancelling(false)}
        />
      ) : null}
      {policy ? <PolicySheet slug="four-forms" onClose={() => setPolicy(false)} /> : null}
    </View>
  );
}
