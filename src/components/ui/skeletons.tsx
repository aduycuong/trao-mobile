import React, { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { SkeletonBlock } from '@/components/ui/form-controls';

/**
 * The placeholders below copy the web `Skeleton` shapes screen by screen (sizes, counts and
 * gaps), so a screen shows the same outline while it loads. `SkeletonGroup` pulses the blocks
 * together, like the web `animate-pulse`.
 */
export function SkeletonGroup({
  children,
  label = 'Đang tải',
  className = '',
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    // The classes go on a plain View: an Animated.View does not read `className`, which left the
    // layout (rows, wrapping, padding) out of every group.
    <Animated.View accessibilityLabel={label} accessibilityRole="progressbar" style={{ opacity }}>
      <View className={className}>{children}</View>
    </Animated.View>
  );
}

/** Blocks stacked in a column, each given by its size classes: `['h-24 rounded-2xl', ...]`. */
export function StackSkeleton({
  blocks,
  className = 'gap-4 p-4',
}: {
  blocks: string[];
  className?: string;
}) {
  return (
    <SkeletonGroup className={className}>
      {blocks.map((block, index) => (
        <SkeletonBlock key={index} className={`w-full ${block}`} />
      ))}
    </SkeletonGroup>
  );
}

/** Kho đồ: four rows with a 64 × 78 photo and three lines. */
export function StockRowsSkeleton() {
  return (
    <SkeletonGroup className="pt-2">
      {[0, 1, 2, 3].map((index) => (
        <View key={index} className="flex-row gap-3 border-t border-[#EEF2F6] px-4 py-3.5">
          <SkeletonBlock className="h-[78px] w-16 rounded-[14px]" />
          <View className="flex-1 gap-2">
            <SkeletonBlock className="h-4 w-4/5" />
            <SkeletonBlock className="h-3.5 w-1/2" />
            <SkeletonBlock className="h-3.5 w-2/3" />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** Tin đăng: four rows with a 56 × 68 photo and three lines. */
export function ListingRowsSkeleton() {
  return (
    <SkeletonGroup className="pt-3">
      {[0, 1, 2, 3].map((index) => (
        <View key={index} className="flex-row gap-3 border-t border-[#EEF2F6] px-4 py-3">
          <SkeletonBlock className="h-[68px] w-14 rounded-xl" />
          <View className="flex-1 gap-2">
            <SkeletonBlock className="h-4 w-4/5" />
            <SkeletonBlock className="h-3.5 w-1/2" />
            <SkeletonBlock className="h-3.5 w-2/3" />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** Picking an item to post: four rows with a 56 × 64 photo and two lines. */
export function PickRowsSkeleton() {
  return (
    <SkeletonGroup>
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          className="flex-row items-center gap-3 border-t border-[#EEF2F6] px-4 py-3"
        >
          <SkeletonBlock className="h-16 w-14 rounded-xl" />
          <View className="flex-1 gap-2">
            <SkeletonBlock className="h-4 w-4/5" />
            <SkeletonBlock className="h-3.5 w-1/2" />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** People lists (followers, following): avatar, two lines and a button. */
export function PeopleRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <SkeletonGroup>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} className="flex-row items-center gap-3 px-4 py-3">
          <SkeletonBlock className="h-12 w-12 rounded-full" />
          <View className="flex-1 gap-1.5">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-3.5 w-52 max-w-full" />
          </View>
          <SkeletonBlock className="h-[34px] w-[84px] rounded-[10px]" />
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** Người đã chặn: three rows with an avatar, a name and a button. */
export function BlockedRowsSkeleton() {
  return (
    <SkeletonGroup>
      {[0, 1, 2].map((index) => (
        <View key={index} className="flex-row items-center gap-3 px-4 py-3">
          <SkeletonBlock className="h-12 w-12 rounded-full" />
          <SkeletonBlock className="h-4 flex-1" />
          <SkeletonBlock className="h-[34px] w-20 rounded-[10px]" />
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** Tab Tôi: the profile line, two cards, a long card and three menu rows. */
export function MeSkeleton() {
  return (
    <SkeletonGroup>
      <View className="flex-row items-center gap-3.5 px-4">
        <SkeletonBlock className="h-[68px] w-[68px] rounded-full" />
        <View className="flex-1 gap-2">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-3.5 w-52 max-w-full" />
          <SkeletonBlock className="h-3.5 w-28" />
        </View>
      </View>
      <SkeletonBlock className="mx-4 mt-4 h-[66px] rounded-2xl" />
      <SkeletonBlock className="mx-4 mt-4 h-[330px] rounded-[20px]" />
      <SkeletonBlock className="mx-4 mt-3 h-[110px] rounded-[20px]" />
      <View className="mt-[18px] gap-4 border-t-8 border-[#F2F5F8] px-4 pt-5">
        {[0, 1, 2].map((row) => (
          <View key={row} className="flex-row items-center gap-3">
            <SkeletonBlock className="h-[38px] w-[38px] rounded-[11px]" />
            <View className="flex-1 gap-1.5">
              <SkeletonBlock className="h-4 w-36" />
              <SkeletonBlock className="h-3 w-56 max-w-full" />
            </View>
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

/** Tài khoản: the avatar, then three groups of 4, 2 and 3 label + value rows. */
export function AccountSkeleton() {
  return (
    <SkeletonGroup>
      <View className="items-center gap-2 px-4 pb-2 pt-5">
        <SkeletonBlock className="h-[88px] w-[88px] rounded-full" />
        <SkeletonBlock className="h-4 w-32" />
      </View>
      {[4, 2, 3].map((rows, group) => (
        <View key={group} className="mt-2.5 border-t-8 border-[#F2F5F8] px-4 pt-4">
          <SkeletonBlock className="mb-3 h-3.5 w-28" />
          {Array.from({ length: rows }, (_, row) => (
            <View key={row} className="gap-1.5 py-2.5">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-4 w-48" />
            </View>
          ))}
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** Cài đặt: three groups of 5, 2 and 4 rows. */
export function SettingsSkeleton() {
  return (
    <SkeletonGroup className="gap-5 px-4 pt-5">
      {[5, 2, 4].map((rows, group) => (
        <View key={group} className="gap-4">
          <SkeletonBlock className="h-3.5 w-24" />
          {Array.from({ length: rows }, (_, row) => (
            <SkeletonBlock key={row} className="h-6 w-full" />
          ))}
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** Trợ giúp: the search box, a card, six topic tiles and five lines. */
export function HelpSkeleton() {
  return (
    <SkeletonGroup className="gap-5">
      <SkeletonBlock className="h-[46px] w-full rounded-[14px]" />
      <SkeletonBlock className="h-[98px] w-full rounded-[18px]" />
      <View className="flex-row flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <SkeletonBlock key={index} className="h-[74px] w-[48.5%] rounded-[14px]" />
        ))}
      </View>
      {[0, 1, 2, 3, 4].map((index) => (
        <SkeletonBlock key={index} className="h-5 w-full" />
      ))}
    </SkeletonGroup>
  );
}

/** Help search results: four lines. */
export function HelpSearchSkeleton() {
  return (
    <SkeletonGroup className="gap-3">
      {[0, 1, 2, 3].map((index) => (
        <SkeletonBlock key={index} className="h-5 w-full" />
      ))}
    </SkeletonGroup>
  );
}

/** A policy or FAQ page: heading, two paragraphs. */
export function PolicySkeleton() {
  return (
    <SkeletonGroup className="gap-3 pt-3">
      <SkeletonBlock className="h-6 w-2/3" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-5/6" />
      <SkeletonBlock className="mt-3 h-5 w-1/2" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-4/5" />
    </SkeletonGroup>
  );
}

/** The policy opened in a sheet: no heading, the title is already in the bar. */
export function PolicySheetSkeleton() {
  return (
    <SkeletonGroup className="gap-3 pt-2">
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-5/6" />
      <SkeletonBlock className="mt-3 h-5 w-1/2" />
      <SkeletonBlock className="h-4 w-4/5" />
    </SkeletonGroup>
  );
}

/** Editing one account field: its label and the input (taller for the bio). */
export function FieldSkeleton({ tall }: { tall?: boolean }) {
  return (
    <SkeletonGroup className="gap-2 px-5 pt-5">
      <SkeletonBlock className="h-4 w-28" />
      <SkeletonBlock className={`w-full rounded-[14px] ${tall ? 'h-32' : 'h-[52px]'}`} />
    </SkeletonGroup>
  );
}

/** Under the photo of an item in the Kho đồ. */
export function ItemBodySkeleton() {
  return (
    <SkeletonGroup className="gap-3 px-4 pt-4">
      <SkeletonBlock className="h-6 w-28 rounded-full" />
      <SkeletonBlock className="h-6 w-4/5" />
      <SkeletonBlock className="h-4 w-1/2" />
      <SkeletonBlock className="mt-4 h-20 w-full rounded-2xl" />
    </SkeletonGroup>
  );
}

/** Under the photo of a listing page. */
export function ListingBodySkeleton() {
  return (
    <SkeletonGroup className="gap-3 px-4 pt-4">
      <SkeletonBlock className="h-[26px] w-20 rounded-full" />
      <SkeletonBlock className="h-7 w-4/5" />
      <SkeletonBlock className="h-8 w-1/2" />
      <SkeletonBlock className="h-24 w-full rounded-2xl" />
    </SkeletonGroup>
  );
}

/**
 * Rows of two listing cards, like the real list (10 between the columns, 20 between the rows).
 * `className` is the padding around it; the default is the screen gutter, so pass `''` inside a
 * container that already has one.
 */
export function CardGridSkeleton({
  count = 4,
  className = 'px-4',
}: {
  count?: number;
  className?: string;
}) {
  const rows = Array.from({ length: Math.ceil(count / 2) }, (_, row) => row);
  return (
    <SkeletonGroup className={className}>
      <View className="gap-y-5 pt-3">
        {rows.map((row) => (
          <View key={row} className="flex-row gap-x-2.5">
            {[0, 1].map((column) => (
              <View key={column} className="flex-1 gap-2">
                <SkeletonBlock className="aspect-[4/5] w-full rounded-2xl" />
                <SkeletonBlock className="h-4 w-1/2" />
                <SkeletonBlock className="h-4 w-4/5" />
              </View>
            ))}
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

/** Waiting for a phone-verification code. */
export function PhoneVerifySkeleton() {
  return (
    <SkeletonGroup label="Đang tạo mã" className="gap-[18px]">
      <SkeletonBlock className="h-[250px] w-full rounded-[18px]" />
      <SkeletonBlock className="h-12 w-full rounded-[14px]" />
      <SkeletonBlock className="h-4 w-3/4" />
    </SkeletonGroup>
  );
}

/** A public profile: the header line, a button row and two cards. */
export function ProfileSkeleton() {
  return (
    <SkeletonGroup className="gap-3.5 px-4 pt-[18px]">
      <View className="flex-row items-center gap-3.5">
        <SkeletonBlock className="h-[76px] w-[76px] rounded-full" />
        <View className="flex-1 gap-2">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-3.5 w-52 max-w-full" />
          <SkeletonBlock className="h-3.5 w-28" />
        </View>
      </View>
      <SkeletonBlock className="h-11 w-full rounded-xl" />
      <SkeletonBlock className="h-[68px] w-full rounded-2xl" />
      <SkeletonBlock className="h-[200px] w-full rounded-2xl" />
    </SkeletonGroup>
  );
}

/** The reviews of a profile: the summary card, a heading and three reviews. */
export function ProfileReviewsSkeleton() {
  return (
    <SkeletonGroup className="gap-4 px-4 pb-6 pt-4">
      <SkeletonBlock className="h-[88px] w-full rounded-2xl" />
      <SkeletonBlock className="h-8 w-2/3" />
      {[0, 1, 2].map((index) => (
        <SkeletonBlock key={index} className="h-20 w-full rounded-xl" />
      ))}
    </SkeletonGroup>
  );
}
