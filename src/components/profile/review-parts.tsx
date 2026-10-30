import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { UserAvatar } from '@/components/me/user-avatar';
import { AppText } from '@/components/ui/app-text';
import type { PublicReview, ReviewerRole, ReviewSummary } from '@/types/people';
import { formatDayMonth } from '@/utils/format';

const STAR_PATH = 'M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z';

const FILTERS: { value: ReviewerRole | undefined; label: string }[] = [
  { value: undefined, label: 'Tất cả' },
  { value: 'buyer', label: 'Từ người mua' },
  { value: 'seller', label: 'Từ người bán' },
];

export function Stars({ rating, size }: { rating: number; size: number }) {
  return (
    <View accessibilityLabel={`${rating} sao`} className="flex-row gap-px">
      {[1, 2, 3, 4, 5].map((n) => (
        <Svg
          key={n}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={n <= rating ? '#FFC22E' : '#E1E7ED'}
        >
          <Path d={STAR_PATH} />
        </Svg>
      ))}
    </View>
  );
}

type ReviewsHeaderProps = {
  summary: ReviewSummary | undefined;
  role: ReviewerRole | undefined;
  onRole: (role: ReviewerRole | undefined) => void;
};

/** Top of the "Đánh giá" tab: score, star spread, most praised, and the buyer/seller filter. */
export function ReviewsHeader({ summary, role, onRole }: ReviewsHeaderProps) {
  const peak = summary ? Math.max(1, ...summary.distribution) : 1;

  return (
    <View className="gap-4 px-4 pt-4">
      {summary ? (
        <>
          <View className="flex-row items-center gap-4">
            <View className="w-[92px] items-center gap-0.5">
              <AppText className="text-[36px] font-vn-bold leading-[36px]">
                {summary.average !== null ? summary.average.toFixed(1) : '–'}
              </AppText>
              <AppText className="text-[12px] text-[#5A6772]">{summary.count} đánh giá</AppText>
            </View>
            <View className="flex-1 gap-1">
              {summary.distribution.map((count, index) => (
                <View key={index} className="flex-row items-center gap-2">
                  <AppText className="w-2.5 text-right text-[12px] text-[#5A6772]">
                    {5 - index}
                  </AppText>
                  <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF2F6]">
                    <View
                      className="h-full rounded-full bg-[#FFC22E]"
                      style={{ width: `${Math.round((count / peak) * 100)}%` }}
                    />
                  </View>
                  <AppText className="w-[18px] text-[12px] text-[#5A6772]">{count}</AppText>
                </View>
              ))}
            </View>
          </View>

          {summary.topCriteria.length > 0 ? (
            <View className="flex-row flex-wrap gap-1.5">
              {summary.topCriteria.map((item) => (
                <View
                  key={item.label}
                  className="h-[30px] flex-row items-center gap-[5px] rounded-full bg-[#E3F4EA] px-2.5"
                >
                  <AppText className="text-[12.5px] font-vn-semibold text-[#1E6B43]">
                    {item.label}
                  </AppText>
                  <AppText
                    className="text-[12.5px] font-vn-medium text-[#1E6B43]"
                    style={{ opacity: 0.75 }}
                  >
                    {item.count}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      <View accessibilityRole="tablist" className="flex-row gap-2">
        {FILTERS.map((filter) => {
          const on = filter.value === role;
          return (
            <Pressable
              key={filter.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => onRole(filter.value)}
              className={`h-[34px] justify-center rounded-full border-[1.5px] px-3 ${
                on ? 'border-[#0F2440] bg-[#0F2440]' : 'border-[#D5DDE5] bg-white'
              }`}
            >
              <AppText className={`text-[13px] font-vn-semibold ${on ? 'text-white' : ''}`}>
                {filter.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ReviewRow({ review }: { review: PublicReview }) {
  const good = review.rating >= 4;

  return (
    <View className="mx-4 gap-2 border-t border-[#EEF2F6] py-3.5">
      <View className="flex-row items-center gap-2.5">
        <UserAvatar
          name={review.reviewerName}
          avatarUrl={review.reviewerAvatarUrl}
          size={36}
          textClassName="text-[13px]"
        />
        <View className="min-w-0 flex-1 gap-px">
          <AppText numberOfLines={1} className="text-[14px] font-vn-bold">
            {review.reviewerName ?? 'Thành viên Trao'}
          </AppText>
          <AppText numberOfLines={1} className="text-[12px] text-[#5A6772]">
            {review.reviewerRole === 'buyer' ? 'Người mua' : 'Người bán'} · {review.context}
          </AppText>
        </View>
        <View className="items-end gap-0.5">
          <Stars rating={review.rating} size={13} />
          <AppText className="text-[11.5px] text-[#A3AEB9]">
            {formatDayMonth(new Date(review.publishedAt))}
          </AppText>
        </View>
      </View>
      {review.criteria.length > 0 ? (
        <View className="flex-row flex-wrap gap-1.5">
          {review.criteria.map((label) => (
            <View
              key={label}
              className={`h-6 justify-center rounded-md px-2 ${good ? 'bg-[#E3F4EA]' : 'bg-[#FDECEA]'}`}
            >
              <AppText
                className={`text-[12px] font-vn-semibold ${good ? 'text-[#1E6B43]' : 'text-[#B42318]'}`}
              >
                {label}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
      {review.comment ? (
        <AppText className="text-[14px] leading-[21.7px] text-[#33414D]">{review.comment}</AppText>
      ) : null}
    </View>
  );
}
