import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppText } from '@/components/ui/app-text';

/** The search box of Home (canvas Main): opens the search screen with all its filters. */
export function HomeSearchPill() {
  const router = useRouter();

  return (
    <View className="bg-[#E6F1FF] px-4 pb-3.5 pt-2.5">
      <Pressable
        accessibilityRole="search"
        accessibilityLabel="Tìm kiếm và bộ lọc: Mọi danh mục gần bạn"
        onPress={() => router.push('/search')}
        className="min-h-[58px] flex-row items-center gap-3 rounded-[18px] bg-white py-2 pl-4 pr-2"
        style={{
          shadowColor: '#1673D9',
          shadowOpacity: 0.08,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
      >
        <Svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1673D9"
          strokeWidth={2.2}
          strokeLinecap="round"
        >
          <Circle cx={11} cy={11} r={7} />
          <Path d="M20 20l-4-4" />
        </Svg>
        <View className="min-w-0 flex-1 gap-px">
          <AppText numberOfLines={1} className="text-[15px] font-vn-semibold">
            Mọi danh mục gần bạn
          </AppText>
          <AppText numberOfLines={1} className="text-[12.5px] text-[#5A6772]">
            Mọi hình thức · Mọi mức giá
          </AppText>
        </View>
        <View className="h-[42px] w-[42px] items-center justify-center rounded-[13px] bg-[#F1F7FE]">
          <Svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0F2440"
            strokeWidth={1.9}
            strokeLinecap="round"
          >
            <Path d="M4 7h9M18 7h2M4 17h3M12 17h8" />
            <Circle cx={15.5} cy={7} r={2.3} />
            <Circle cx={9.5} cy={17} r={2.3} />
          </Svg>
        </View>
      </Pressable>
    </View>
  );
}
