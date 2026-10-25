import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '@/components/ui/app-text';
import type { MyProfile } from '@/types/profile';

const ICONS = {
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  group:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5 5 0 0 1 3.5 6',
  follower: 'M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21a7 7 0 0 1 12.5-4.3M16 19l2 2 4-4',
  invite:
    'M4 9h16v4H4zM5 13v7h14v-7M12 9v11M12 9c-1.5-3.5-5-4-5-1.5S12 9 12 9zM12 9c1.5-3.5 5-4 5-1.5S12 9 12 9z',
  wallet: 'M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14h.01',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.5-1-2 3.4 2.1 1.6a7 7 0 0 0 0 2.4l-2.1 1.6 2 3.4 2.5-1a7 7 0 0 0 2 1.2L10 21h4l.4-2.6a7 7 0 0 0 2-1.2l2.5 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01',
} as const;

type Row = {
  icon: keyof typeof ICONS;
  label: string;
  sub: string;
  meta?: string;
  /** "Sắp có": dimmed, no destination. */
  soon?: boolean;
};

function buildGroups(profile: MyProfile): { title: string; rows: Row[] }[] {
  return [
    {
      title: 'Cộng đồng',
      rows: [
        {
          icon: 'follower',
          label: 'Followers · Following',
          sub: 'Người theo dõi bạn và người bạn theo dõi',
          meta: `${profile.followerCount} · ${profile.followingCount}`,
        },
        { icon: 'invite', label: 'Mời bạn bè', sub: 'Gửi link mời bạn bè vào Trao' },
        { icon: 'group', label: 'Nhóm', sub: 'Hội nhóm theo sở thích', meta: 'Sắp có', soon: true },
      ],
    },
    {
      title: 'Tài khoản & ứng dụng',
      rows: [
        { icon: 'user', label: 'Tài khoản', sub: 'Hồ sơ, email, số điện thoại, mật khẩu' },
        {
          icon: 'gear',
          label: 'Cài đặt',
          sub: 'Thông báo, tự phát video, khu vực, giao diện',
        },
        {
          icon: 'help',
          label: 'Trợ giúp & chính sách',
          sub: 'An toàn giao dịch, hàng cấm, báo cáo của tôi',
        },
        { icon: 'invite', label: 'Góp ý cho Trao', sub: 'Gặp lỗi hay có ý tưởng? Nhắn đội Trao' },
        {
          icon: 'wallet',
          label: 'Thanh toán qua trung gian',
          sub: 'Trao giữ tiền đến khi nhận hàng',
          meta: 'Sắp có',
          soon: true,
        },
      ],
    },
  ];
}

/**
 * The two menu groups of the Tôi tab. Rows open screens of later parts of the plan (followers,
 * account, settings, help), so for now they have no destination.
 */
export function MenuGroups({ profile }: { profile: MyProfile }) {
  return (
    <>
      {buildGroups(profile).map((group) => (
        <View key={group.title} className="mt-[18px] border-t-8 border-[#F2F5F8]">
          <AppText
            accessibilityRole="header"
            className="px-4 pb-1 pt-3.5 text-[13px] font-vn-semibold text-[#5A6772]"
          >
            {group.title}
          </AppText>
          {group.rows.map((row) => (
            <Pressable
              key={row.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              className="min-h-14 flex-row items-center gap-3 px-4"
              style={{ opacity: row.soon ? 0.55 : 1 }}
            >
              <View className="h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#F1F7FE]">
                <Svg
                  width={20}
                  height={20}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1673D9"
                  strokeWidth={1.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d={ICONS[row.icon]} />
                </Svg>
              </View>
              <View className="min-w-0 flex-1 gap-px">
                <AppText className="text-[15px] font-vn-medium">{row.label}</AppText>
                <AppText className="text-[12.5px] text-[#5A6772]">{row.sub}</AppText>
              </View>
              {row.meta ? (
                <AppText className="text-[13px] text-[#5A6772]">{row.meta}</AppText>
              ) : null}
              <Svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#A3AEB9"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M9 6l6 6-6 6" />
              </Svg>
            </Pressable>
          ))}
        </View>
      ))}
    </>
  );
}
