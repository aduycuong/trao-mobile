import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AuthError } from '@/components/auth/auth-ui';
import { CatIcon, type CatIconKind } from '@/components/icons/cat-icon';
import { AppText } from '@/components/ui/app-text';
import { fetchCategories } from '@/services/onboarding/onboarding-api';
import { FooterButton, OnboardingBar } from './onboarding-ui';

export const MIN_INTEREST_CATEGORIES = 3;

const CATEGORY_ICON_BY_SLUG: Record<string, CatIconKind> = {
  'dien-thoai': 'phone',
  laptop: 'laptop',
  'may-anh': 'camera',
  'gia-dung': 'appliance',
  'noi-that': 'furniture',
  'thoi-trang': 'fashion',
  'xe-co': 'vehicle',
  sach: 'book',
  'do-em-be': 'baby',
  'do-choi': 'toy',
  'am-thanh': 'audio',
  'suu-tam': 'collect',
};

type InterestStepProps = {
  onBack: () => void;
  saving: boolean;
  error: string | null;
  /** Empty array when skipped. */
  onDone: (categoryIds: string[]) => void;
};

export function InterestStep({ onBack, saving, error, onDone }: InterestStepProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const categories = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const ready = selected.length >= MIN_INTEREST_CATEGORIES;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  return (
    <View className="flex-1 bg-white">
      <OnboardingBar index={1} onBack={onBack} onSkip={saving ? undefined : () => onDone([])} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-5 pb-5 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1">
          <AppText className="text-[23px] font-vn-bold">Bạn hay tìm đồ gì?</AppText>
          <AppText className="text-[14px] leading-[21px] text-[#5A6772]">
            Chọn vài danh mục để &quot;Gợi ý cho bạn&quot; hợp ý hơn. Đổi được bất cứ lúc nào.
          </AppText>
        </View>
        {categories.isError ? (
          <AuthError>Không tải được danh mục. Bạn có thể bỏ qua bước này.</AuthError>
        ) : null}
        <View className="flex-row flex-wrap gap-2.5">
          {(categories.data ?? []).map((category) => {
            const on = selected.includes(category.id);
            const icon = CATEGORY_ICON_BY_SLUG[category.slug];
            return (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => toggle(category.id)}
                className={`h-24 items-center justify-center gap-1.5 rounded-2xl border-2 px-1 ${
                  on ? 'border-[#1673D9] bg-[#F1F7FE]' : 'border-[#E6ECF2] bg-white'
                }`}
                style={{ width: '31.5%' }}
              >
                {icon ? <CatIcon kind={icon} size={38} /> : null}
                <AppText className="text-[13px] font-vn-semibold" numberOfLines={1}>
                  {category.name}
                </AppText>
                {on ? (
                  <View className="absolute right-1.5 top-1.5 h-5 w-5 items-center justify-center rounded-full bg-[#1673D9]">
                    <Svg
                      width={11}
                      height={11}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={3.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <Path d="M5 12l5 5 9-10" />
                    </Svg>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        {error ? <AuthError>{error}</AuthError> : null}
      </ScrollView>
      <View className="gap-1.5 border-t border-[#EEF2F6] px-5 pb-6 pt-3">
        <AppText className="text-center text-[12.5px] text-[#5A6772]">
          {ready
            ? `Đã chọn ${selected.length} danh mục`
            : `Chọn ít nhất ${MIN_INTEREST_CATEGORIES} danh mục (${selected.length}/${MIN_INTEREST_CATEGORIES})`}
        </AppText>
        <FooterButton
          label={saving ? 'Đang lưu…' : 'Vào chợ'}
          disabled={!ready || saving}
          onPress={() => onDone(selected)}
        />
      </View>
    </View>
  );
}
