import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CatIcon } from '@/components/icons/cat-icon';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ICON_CHEVRON_RIGHT, PathIcon } from '@/components/ui/path-icon';
import { usePenaltyGuard } from '@/hooks/usePenaltyGuard';

/** "Đăng tin" chooser (canvas Post, step "start"): a new item, or one from Kho đồ. */
export function PostStartSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const postGuard = usePenaltyGuard();

  function newItem() {
    if (!postGuard.guard('post')) return;
    onClose();
    router.push({ pathname: '/stock/new', params: { flow: 'post' } });
  }

  function fromStock() {
    if (!postGuard.guard('post')) return;
    onClose();
    router.push('/post/pick');
  }

  return (
    <>
      <BottomSheet title="Đăng tin" onClose={onClose}>
        <Pressable
          accessibilityRole="button"
          onPress={newItem}
          className="flex-row items-center gap-3.5 rounded-2xl border-[1.5px] border-[#9CC3F0] bg-[#F1F7FE] p-3.5"
        >
          <View className="h-12 w-12 items-center justify-center rounded-[14px] bg-[#1673D9]">
            <Svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M4 8h3l2-2h6l2 2h3v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            </Svg>
          </View>
          <View className="flex-1 gap-0.5">
            <AppText className="text-[15.5px] font-vn-bold">Món mới</AppText>
            <AppText className="text-[13px] text-[#5A6772]">
              Chụp ảnh, viết vài dòng là xong
            </AppText>
          </View>
          <PathIcon d={ICON_CHEVRON_RIGHT} size={18} color="#1673D9" strokeWidth={2.2} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={fromStock}
          className="flex-row items-center gap-3.5 rounded-2xl border-[1.5px] border-[#E1E7EE] bg-white p-3.5"
        >
          <View className="h-12 w-12 items-center justify-center rounded-[14px] bg-[#F1F7FE]">
            <CatIcon kind="stock" size={32} />
          </View>
          <View className="flex-1 gap-0.5">
            <AppText className="text-[15.5px] font-vn-bold">Từ Kho đồ</AppText>
            <AppText className="text-[13px] text-[#5A6772]">
              Chọn món bạn đã có, không cần nhập lại
            </AppText>
          </View>
          <PathIcon d={ICON_CHEVRON_RIGHT} size={18} color="#5A6772" strokeWidth={2.2} />
        </Pressable>
      </BottomSheet>
      {postGuard.sheet}
    </>
  );
}
