import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '@/components/ui/app-text';

type ProfileMoreSheetProps = {
  onClose: () => void;
  onShare: () => void;
  onBlock: () => void;
};

type Row = {
  label: string;
  sub: string;
  icon: string;
  ink: string;
  bg: string;
  color: string;
  /** Rows of a later part of the plan show but do nothing yet. */
  soon?: boolean;
  onPress?: () => void;
};

/** Options of someone else's profile (canvas Profile, sheet "more"). */
export function ProfileMoreSheet({ onClose, onShare, onBlock }: ProfileMoreSheetProps) {
  const insets = useSafeAreaInsets();
  const rows: Row[] = [
    {
      label: 'Chia sẻ hồ sơ',
      sub: 'Gửi link hồ sơ cho bạn bè',
      icon: 'M4 12v7h16v-7M12 3v12M7 8l5-5 5 5',
      ink: '#1673D9',
      bg: '#F1F7FE',
      color: '#0F2440',
      onPress: onShare,
    },
    {
      label: 'Báo cáo người dùng',
      sub: 'Báo lừa đảo, quấy rối, giả mạo, spam',
      icon: 'M5 21V4h11l-1 4 4 4H5',
      ink: '#B42318',
      bg: '#FDECEA',
      color: '#B42318',
      soon: true,
    },
    {
      label: 'Chặn',
      sub: 'Không thấy tin của nhau, không nhắn tin được',
      icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8',
      ink: '#5A6772',
      bg: '#F2F5F8',
      color: '#0F2440',
      onPress: onBlock,
    },
  ];

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityLabel="Đóng"
          onPress={onClose}
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(15,36,64,0.45)' }}
        />
        <View
          accessibilityViewIsModal
          className="rounded-t-[26px] bg-white px-3 pt-2.5"
          style={{ paddingBottom: 22 + insets.bottom }}
        >
          <View className="mb-2 h-1 w-10 self-center rounded-full bg-[#D5DCE3]" />
          {rows.map((row) => (
            <Pressable
              key={row.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: !row.onPress }}
              onPress={row.onPress}
              className="flex-row items-center gap-3.5 rounded-xl px-2 py-3"
              style={{ opacity: row.soon ? 0.55 : 1 }}
            >
              <View
                className="h-[38px] w-[38px] items-center justify-center rounded-[11px]"
                style={{ backgroundColor: row.bg }}
              >
                <Svg
                  width={19}
                  height={19}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={row.ink}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d={row.icon} />
                </Svg>
              </View>
              <View className="flex-1 gap-px">
                <AppText className="text-[15px] font-vn-semibold" style={{ color: row.color }}>
                  {row.label}
                </AppText>
                <AppText className="text-[12.5px] text-[#5A6772]">{row.sub}</AppText>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}
