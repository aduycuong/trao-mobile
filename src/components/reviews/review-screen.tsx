import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { CoinIcon } from '@/components/icons/coin-icon';
import { UserAvatar } from '@/components/me/user-avatar';
import { AppText } from '@/components/ui/app-text';
import { ErrorBox } from '@/components/ui/form-controls';
import { ICON_CLOSE, PathIcon } from '@/components/ui/path-icon';
import { useAuth } from '@/hooks/useAuth';
import { DEAL_QUERY_ROOTS } from '@/hooks/useDealActions';
import { useGoBack } from '@/hooks/useGoBack';
import { fetchReviewContext, submitReviewRequest } from '@/services/reviews/reviews-api';
import {
  REVIEW_COMMENT_MAX_LENGTH,
  REVIEW_RATE_LABELS,
  REVIEW_REPORT_HINT_UP_TO_STARS,
  REVIEW_STAR_PATH,
  canSubmitReview,
  criteriaAfterRating,
  isPraise,
  rateColor,
  reviewPlaceholder,
} from '@/services/reviews/review-rules';
import { DEAL_TYPE_LABEL } from '@/services/deals/deal-banner';
import type { ReviewContext } from '@/types/deals';
import { formatDayMonth } from '@/utils/format';

function Star({ on, size }: { on: boolean; size: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={on ? '#FFC22E' : 'none'}
      stroke={on ? '#E8A200' : '#C3CCD6'}
      strokeWidth={1.5}
      strokeLinejoin="round"
    >
      <Path d={REVIEW_STAR_PATH} />
    </Svg>
  );
}

const CHECK = 'M5 12l5 5 9-10';

/** Đánh giá giao dịch (canvas Review): stars, the criteria that fit them, a comment, then "Đã gửi đánh giá". */
export function ReviewScreen({ transactionId }: { transactionId: string }) {
  const insets = useSafeAreaInsets();
  const goBack = useGoBack({ pathname: '/transactions/[id]', params: { id: transactionId } });
  const { session, getIdToken } = useAuth();
  const { data, error, refetch, isPending } = useQuery({
    queryKey: ['transactions', transactionId, 'review', session?.uid ?? null],
    queryFn: async () => fetchReviewContext(await getIdToken(), transactionId),
    enabled: !!session,
    retry: false,
  });

  return (
    <View className="flex-1 bg-white">
      <View
        className="flex-row items-center gap-1 border-b border-[#EEF2F6] px-2"
        style={{ height: 56 + insets.top, paddingTop: insets.top }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng"
          onPress={goBack}
          className="h-11 w-11 items-center justify-center"
        >
          <PathIcon d={ICON_CLOSE} size={20} strokeWidth={2.2} />
        </Pressable>
        <AppText accessibilityRole="header" className="flex-1 text-[17px] font-vn-bold">
          Đánh giá giao dịch
        </AppText>
      </View>

      {isPending ? (
        <View className="items-center py-10">
          <ActivityIndicator color="#1673D9" />
        </View>
      ) : error || !data ? (
        <ErrorBox
          message={error?.message ?? 'Không mở được màn đánh giá.'}
          onRetry={() => refetch()}
          onBack={goBack}
        />
      ) : (
        <ReviewBody key={data.transactionId} context={data} />
      )}
    </View>
  );
}

function ReviewBody({ context }: { context: ReviewContext }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { getIdToken } = useAuth();
  const other = context.counterpart.name ?? 'Người kia';

  const [rating, setRating] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{
    rating: number;
    published: boolean;
    rewardAmount: number;
  } | null>(
    context.mine
      ? { rating: context.mine.rating, published: context.mine.published, rewardAmount: 0 }
      : null
  );

  const praise = isPraise(rating);
  const chips = praise ? context.praise : context.complaints;
  const publishDay = formatDayMonth(new Date(context.publishAt));

  async function submit() {
    if (!canSubmitReview(rating) || busy) return;
    setBusy(true);
    try {
      const result = await submitReviewRequest(await getIdToken(), context.transactionId, {
        rating,
        criteria: picked,
        comment: comment.trim() || undefined,
      });
      setSent({ rating, published: result.published, rewardAmount: result.rewardAmount });
      await Promise.all([
        ...DEAL_QUERY_ROOTS.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey: [queryKey] })
        ),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['user'] }),
      ]);
    } catch (error) {
      Alert.alert(
        'Không gửi được đánh giá',
        error instanceof Error ? error.message : 'Thử lại sau.'
      );
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: 'center',
            gap: 14,
            paddingHorizontal: 24,
            paddingTop: 40,
            paddingBottom: 20,
          }}
        >
          <View className="h-[76px] w-[76px] items-center justify-center rounded-full bg-[#E3F4EA]">
            <PathIcon d={CHECK} size={38} color="#2F9E63" strokeWidth={2.6} />
          </View>
          <AppText accessibilityRole="header" className="mt-1 text-[21px] font-vn-bold">
            Đã gửi đánh giá
          </AppText>
          <View accessibilityLabel={`Bạn chấm ${sent.rating} sao`} className="flex-row gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} on={n <= sent.rating} size={26} />
            ))}
          </View>
          <AppText className="text-center text-[14.5px] leading-[22.5px] text-[#33414D]">
            {sent.published ? (
              <>
                Cả hai đã đánh giá, nên đánh giá của bạn đã hiện trên hồ sơ{' '}
                <AppText className="text-[14.5px] font-vn-bold">{other}</AppText>.
              </>
            ) : (
              <>
                Đánh giá của bạn sẽ hiện trên hồ sơ{' '}
                <AppText className="text-[14.5px] font-vn-bold">{other}</AppText> khi {other} cũng
                đánh giá, hoặc sau 7 ngày ({publishDay}).
              </>
            )}
          </AppText>
          {sent.rewardAmount > 0 ? (
            <View className="mt-1.5 w-full flex-row items-center gap-3 rounded-2xl bg-[#FFF9EA] p-3.5">
              <CoinIcon size={40} />
              <View className="flex-1 gap-0.5">
                <AppText className="text-[15px] font-vn-bold">
                  +{sent.rewardAmount} tiền thưởng
                </AppText>
                <AppText className="text-[12.5px] text-[#5A6772]">Thưởng cho việc đánh giá</AppText>
              </View>
            </View>
          ) : null}
          <View className="w-full flex-row items-center gap-3 rounded-2xl border border-[#E6ECF2] p-3.5">
            <UserAvatar
              name={context.counterpart.name}
              avatarUrl={context.counterpart.avatarUrl}
              size={40}
              textClassName="text-[15px] text-[#0F2440]"
            />
            <View className="flex-1 gap-0.5">
              {sent.published ? (
                <>
                  <AppText className="text-[14px] font-vn-bold">{other} đã đánh giá bạn</AppText>
                  <AppText className="text-[12.5px] text-[#5A6772]">Xem trên hồ sơ của bạn</AppText>
                </>
              ) : (
                <>
                  <AppText className="text-[14px] font-vn-bold">{other} chưa đánh giá bạn</AppText>
                  <AppText className="text-[12.5px] text-[#5A6772]">
                    Bạn sẽ thấy khi cả hai đánh giá được hiện
                  </AppText>
                </>
              )}
            </View>
          </View>
        </ScrollView>
        <View
          className="flex-row gap-2.5 border-t border-[#EEF2F6] bg-white px-4 pt-2.5"
          style={{ paddingBottom: 16 + insets.bottom }}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/u/[handle]',
                params: { handle: context.counterpart.handle },
              })
            }
            className="h-[50px] flex-1 items-center justify-center rounded-[14px] border-[1.5px] border-[#C9DDF4] bg-white"
          >
            <AppText className="text-[15px] font-vn-semibold text-[#1673D9]">Xem hồ sơ</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (context.inboxId) {
                router.replace({
                  pathname: '/chat/[inboxId]',
                  params: { inboxId: context.inboxId },
                });
              } else {
                router.replace('/chat');
              }
            }}
            style={{ flex: 1.4 }}
            className="h-[50px] items-center justify-center rounded-[14px] bg-[#1673D9]"
          >
            <AppText className="text-[15px] font-vn-bold text-white">Về trò chuyện</AppText>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          gap: 22,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 20,
        }}
      >
        <View className="flex-row items-center gap-3 rounded-2xl bg-[#F7F9FB] p-3">
          <View className="h-[60px] w-[52px] overflow-hidden rounded-xl bg-[#DCEBFB]">
            {context.item.coverUrl ? (
              <Image
                source={{ uri: context.item.coverUrl }}
                style={{ width: 52, height: 60 }}
                contentFit="cover"
              />
            ) : null}
          </View>
          <View className="min-w-0 flex-1 gap-[3px]">
            <AppText numberOfLines={1} className="text-[14px] font-vn-semibold">
              {context.item.title}
            </AppText>
            <AppText className="text-[13px] font-vn-semibold text-[#1673D9]">
              {DEAL_TYPE_LABEL[context.type]} · {context.agreed}
            </AppText>
            <View className="flex-row items-center gap-[5px]">
              <PathIcon d={CHECK} size={13} color="#2F9E63" strokeWidth={2.6} />
              <AppText className="text-[12px] text-[#1E6B43]">
                Giao dịch thành công · {formatDayMonth(new Date(context.completedAt))}
              </AppText>
            </View>
          </View>
        </View>

        <View className="items-center gap-2.5">
          <UserAvatar
            name={context.counterpart.name}
            avatarUrl={context.counterpart.avatarUrl}
            size={64}
            textClassName="text-[22px] text-[#0F2440]"
          />
          <AppText
            accessibilityRole="header"
            className="text-center text-[18px] font-vn-bold leading-[24px]"
          >
            Giao dịch với {other} thế nào?
          </AppText>
          <View accessibilityRole="radiogroup" className="mt-0.5 flex-row gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                accessibilityRole="radio"
                accessibilityState={{ checked: n === rating }}
                accessibilityLabel={`${n} sao · ${REVIEW_RATE_LABELS[n]}`}
                onPress={() => {
                  setPicked((current) => criteriaAfterRating(rating, n, current));
                  setRating(n);
                }}
                className="h-[52px] w-[52px] items-center justify-center"
              >
                <Star on={n <= rating} size={42} />
              </Pressable>
            ))}
          </View>
          <AppText
            className="min-h-5 text-[14.5px] font-vn-bold"
            style={{ color: rateColor(rating) }}
          >
            {rating ? REVIEW_RATE_LABELS[rating] : 'Chạm để chọn số sao'}
          </AppText>
        </View>

        {rating > 0 ? (
          <>
            <View className="gap-2.5">
              <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
                {praise ? 'Điều bạn hài lòng' : 'Điều chưa ổn'}{' '}
                <AppText className="text-[13px] text-[#5A6772]">chọn nhiều</AppText>
              </AppText>
              <View className="flex-row flex-wrap gap-2">
                {chips.map((chip) => {
                  const on = picked.includes(chip.code);
                  const fg = on ? (praise ? '#1E6B43' : '#B42318') : '#0F2440';
                  return (
                    <Pressable
                      key={chip.code}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() =>
                        setPicked((current) =>
                          on
                            ? current.filter((code) => code !== chip.code)
                            : [...current, chip.code]
                        )
                      }
                      className="h-[38px] flex-row items-center gap-1.5 rounded-full border-[1.5px] px-3.5"
                      style={{
                        borderColor: on ? (praise ? '#2F9E63' : '#F0533A') : '#D5DDE5',
                        backgroundColor: on ? (praise ? '#E3F4EA' : '#FDECEA') : '#FFFFFF',
                      }}
                    >
                      {on ? <PathIcon d={CHECK} size={13} color={fg} strokeWidth={3} /> : null}
                      <AppText className="text-[13.5px] font-vn-semibold" style={{ color: fg }}>
                        {chip.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="gap-2">
              <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
                Nhận xét <AppText className="text-[13px] text-[#5A6772]">không bắt buộc</AppText>
              </AppText>
              <TextInput
                value={comment}
                onChangeText={setComment}
                maxLength={REVIEW_COMMENT_MAX_LENGTH}
                multiline
                textAlignVertical="top"
                accessibilityLabel="Nhận xét"
                placeholder={reviewPlaceholder(context.role, context.type)}
                placeholderTextColor="#A3AEB9"
                className="min-h-[92px] rounded-[14px] border-[1.5px] border-[#D5DDE5] px-3.5 py-3 font-vn text-[14px] leading-[21.7px] text-[#0F2440]"
              />
              <AppText className="self-end text-[12px] text-[#A3AEB9]">
                {comment.length}/{REVIEW_COMMENT_MAX_LENGTH}
              </AppText>
            </View>

            {rating <= REVIEW_REPORT_HINT_UP_TO_STARS ? (
              <View className="flex-row gap-3 rounded-[14px] border border-[#F6D2CC] bg-[#FDF2F0] px-3.5 py-3">
                <PathIcon d="M12 3l9 16H3zM12 10v4M12 17h.01" size={20} color="#B42318" />
                <View className="min-w-0 flex-1 gap-1.5">
                  <AppText className="text-[13.5px] leading-[20px] text-[#33414D]">
                    Giao dịch có vấn đề cần Trao xử lý (hàng sai mô tả, bị lừa…)? Đánh giá chỉ để
                    người khác tham khảo; muốn Trao xem xét thì gửi báo cáo.
                  </AppText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => Alert.alert('Báo cáo', 'Tính năng này sắp có.')}
                    className="self-start"
                  >
                    <AppText className="text-[13.5px] font-vn-bold text-[#B42318]">
                      Gửi báo cáo
                    </AppText>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        <View className="flex-row gap-2.5 rounded-[14px] bg-[#F1F7FE] px-3.5 py-3">
          <View className="mt-0.5">
            <Svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1673D9"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Rect x={5} y={11} width={14} height={10} rx={2} />
              <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </Svg>
          </View>
          <AppText className="min-w-0 flex-1 text-[13px] leading-[19.5px] text-[#33414D]">
            Đánh giá được giữ kín đến khi{' '}
            <AppText className="text-[13px] font-vn-bold">{other}</AppText> cũng đánh giá, hoặc sau
            7 ngày ({publishDay}), rồi mới hiện trên hồ sơ. Gửi rồi không sửa được.
          </AppText>
        </View>
      </ScrollView>

      <View
        className="gap-1.5 border-t border-[#EEF2F6] bg-white px-4 pt-2.5"
        style={{ paddingBottom: 16 + insets.bottom }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: rating === 0 || busy }}
          disabled={rating === 0 || busy}
          onPress={() => void submit()}
          className={`h-[52px] items-center justify-center rounded-[14px] ${
            rating ? 'bg-[#1673D9]' : 'bg-[#E1E7ED]'
          }`}
        >
          <AppText
            className={`text-[16px] font-vn-bold ${rating ? 'text-white' : 'text-[#A3AEB9]'}`}
          >
            {busy ? 'Đang gửi…' : 'Gửi đánh giá'}
          </AppText>
        </Pressable>
        {context.rewardAmount > 0 ? (
          <View className="flex-row items-center justify-center gap-1.5">
            <CoinIcon size={15} />
            <AppText className="text-[12.5px] text-[#5A6772]">
              Nhận {context.rewardAmount} tiền thưởng khi gửi
            </AppText>
          </View>
        ) : null}
      </View>
    </>
  );
}
