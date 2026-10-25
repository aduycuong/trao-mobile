import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { CoinIcon } from '@/components/icons/coin-icon';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { AuthError } from '@/components/auth/auth-ui';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { subscribePhoneVerifiedSignal } from '@/services/chat/rtdb';
import { fetchPhoneVerification, MY_PROFILE_QUERY_KEY } from '@/services/profile/profile-api';
import type { PhoneVerifiedSignal } from '@/types/profile';

/** Must match the server's code lifetime. */
const PHONE_CODE_TTL_SECONDS = 60;
/** Both stamps come from the server clock; this only absorbs rounding. */
const SIGNAL_SLACK_MS = 2000;
/** A code is replaced a moment after it expires. */
const RENEW_DELAY_MS = 500;

const NOTES = [
  'Tin nhắn tính phí như SMS thường của nhà mạng.',
  'Mã tự đổi sau mỗi 1 phút, hãy dùng mã đang hiện trên màn hình.',
  'Số này đã xác minh ở tài khoản khác thì sẽ chuyển sang tài khoản này.',
];

const CHANGE_NOTES = [
  'Tin nhắn tính phí như SMS thường của nhà mạng.',
  'Mã tự đổi sau mỗi 1 phút, hãy dùng mã đang hiện trên màn hình.',
  'Số hiện tại vẫn dùng cho đến khi Trao nhận được tin từ số mới.',
  'Đổi số không được tính thêm tiền thưởng.',
  'Số này đã xác minh ở tài khoản khác thì sẽ chuyển sang tài khoản này.',
];

/** `0909440585` → `0909 440 585`. */
function formatTraoNumber(digits: string): string {
  return digits.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');
}

function CopyButton({ text, label, onCopy }: { text: string; label: string; onCopy: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Clipboard.setStringAsync(text).catch(() => {});
        onCopy();
      }}
      className="h-[34px] flex-row items-center gap-1.5 self-center rounded-full bg-[#E6F1FF] px-3.5"
    >
      <Svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0B4A99"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Rect x={9} y={9} width={11} height={11} rx={2} />
        <Path d="M5 15V6a2 2 0 0 1 2-2h9" />
      </Svg>
      <AppText className="text-[13px] font-vn-semibold text-[#0B4A99]">{label}</AppText>
    </Pressable>
  );
}

function ChatGlyph({ color, size }: { color: string; size: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={size === 20 ? 2 : 2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
    </Svg>
  );
}

function Spinner() {
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  return (
    <Animated.View
      className="h-5 w-5 rounded-full"
      style={{
        borderWidth: 2.5,
        borderColor: '#F5D78A',
        borderTopColor: '#E8A200',
        transform: [
          { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
        ],
      }}
    />
  );
}

/**
 * Phone verification by SMS (canvas PhoneVerify, states "send" and "done"). The user texts the
 * code to Trao's number; the provider's webhook tells the server, which rings the RTDB doorbell,
 * and this screen switches to "done" at once. The code is replaced every minute, so the screen
 * asks for a new one when the one on display expires.
 */
export default function VerifyPhoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session, getIdToken } = useAuth();
  const { change: changeParam } = useLocalSearchParams<{ change?: string }>();
  const change = changeParam === '1';
  const [copied, setCopied] = useState<'num' | 'code' | null>(null);
  const [signal, setSignal] = useState<PhoneVerifiedSignal | null>(null);

  const { data, error, refetch } = useQuery({
    queryKey: ['me', 'phone-verification', change ? 'change' : 'first', session?.uid],
    queryFn: async () => fetchPhoneVerification(await getIdToken(), change),
    enabled: !!session,
    // Read again only when the code expires; the doorbell reports a success.
    staleTime: Infinity,
    gcTime: change ? 0 : undefined,
  });

  const uid = session?.uid;
  useEffect(() => {
    if (!uid) return;
    return subscribePhoneVerifiedSignal(uid, setSignal) ?? undefined;
  }, [uid]);

  // The signal is the last verification ever, so it counts only when it came after the code on
  // display was issued.
  const expiresAt = data && !data.verified ? data.expiresAt : null;
  const issuedAt = expiresAt ? Date.parse(expiresAt) - PHONE_CODE_TTL_SECONDS * 1000 : null;
  const done: { maskedPhone: string; rewardAmount: number } | null = data?.verified
    ? data
    : signal && issuedAt !== null && signal.verifiedAt >= issuedAt - SIGNAL_SLACK_MS
      ? signal
      : null;
  const finished = done !== null;

  useEffect(() => {
    if (!finished) return;
    queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY });
  }, [finished, queryClient]);

  useEffect(() => {
    if (!expiresAt || finished) return;
    const wait = Date.parse(expiresAt) - Date.now() + RENEW_DELAY_MS;
    const timer = setTimeout(() => refetch(), Math.max(wait, RENEW_DELAY_MS));
    return () => clearTimeout(timer);
  }, [expiresAt, finished, refetch]);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/me');
  };
  const title = change ? 'Đổi số điện thoại' : 'Xác minh số điện thoại';

  if (done) {
    return (
      <View className="flex-1 bg-white">
        <ScreenBar title={title} onBack={back} />
        <ScrollView
          className="flex-1"
          contentContainerClassName="items-center gap-3.5 px-5 pb-4 pt-9"
          showsVerticalScrollIndicator={false}
        >
          <View className="h-[88px] w-[88px] items-center justify-center rounded-full bg-[#E3F4EA]">
            <Svg
              width={44}
              height={44}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2F9E63"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M5 12l5 5 9-10" />
            </Svg>
          </View>
          <AppText className="mt-1.5 text-center text-[22px] font-vn-bold">
            {change ? 'Đã đổi số điện thoại' : 'Đã xác minh số điện thoại'}
          </AppText>
          <AppText className="text-center text-[15px] text-[#33414D]">
            <AppText className="text-[15px] font-vn-bold">{done.maskedPhone}</AppText> · không hiện
            công khai
          </AppText>

          {done.rewardAmount > 0 ? (
            <View className="mt-2.5 flex-row items-center gap-3 self-stretch rounded-2xl bg-[#FFF4D6] p-3.5">
              <CoinIcon size={40} />
              <View className="flex-1 gap-0.5">
                <AppText className="text-[15px] font-vn-bold text-[#3D2A00]">
                  +{done.rewardAmount} tiền thưởng
                </AppText>
                <AppText className="text-[12.5px] leading-[18px] text-[#6B4E00]">
                  Đã cộng vào số dư của bạn
                </AppText>
              </View>
            </View>
          ) : null}

          <View className="flex-row items-start gap-3 self-stretch rounded-2xl border border-[#DCE6F0] p-4">
            <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-[#E3F4EA]">
              <AppText className="text-[15px] font-vn-bold text-[#2F9E63]">✓</AppText>
            </View>
            <View className="flex-1 gap-1">
              <AppText className="text-[15px] font-vn-bold">
                {change ? 'Số cũ đã được gỡ khỏi tài khoản' : 'Tài khoản đã lên Đã xác thực'}
              </AppText>
              <AppText className="text-[13.5px] leading-[20px] text-[#5A6772]">
                {change
                  ? 'Tài khoản vẫn ở mức Đã xác thực. Số cũ không còn gắn với tài khoản này.'
                  : 'Đặt giá được ở phiên chỉ dành cho tài khoản Đã xác thực, và được tính tiền thưởng khi hoạt động, giao dịch.'}
              </AppText>
            </View>
          </View>
        </ScrollView>
        <View
          className="border-t border-[#EEF2F6] px-5 pt-3"
          style={{ paddingBottom: 20 + insets.bottom }}
        >
          <Pressable
            accessibilityRole="button"
            onPress={back}
            className="h-[52px] items-center justify-center rounded-2xl bg-[#1673D9]"
          >
            <AppText className="text-[15px] font-vn-bold text-white">Xong</AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  function openSms() {
    if (!data || data.verified) return;
    const sep = Platform.OS === 'ios' ? '&' : '?';
    Linking.openURL(`sms:${data.traoNumber}${sep}body=${data.code}`).catch(() => {});
  }

  return (
    <View className="flex-1 bg-white">
      <ScreenBar title={title} onBack={back} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-[18px] px-5 pb-4 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1.5">
          <AppText className="text-[22px] font-vn-bold leading-[28.6px]">
            {change ? 'Nhắn một tin SMS từ số mới' : 'Nhắn một tin SMS để xác minh'}
          </AppText>
          <AppText className="text-[14.5px] leading-[22.5px] text-[#33414D]">
            {change
              ? 'Dùng điện thoại có số mới, nhắn mã bên dưới tới số của Trao. Trao nhận được là đổi xong, không cần nhập gì thêm.'
              : 'Dùng điện thoại có số bạn muốn xác minh, nhắn mã bên dưới tới số của Trao. Trao nhận được là xác minh xong, không cần nhập gì thêm.'}
          </AppText>
        </View>

        {error ? <AuthError>{error.message}</AuthError> : null}

        {data && !data.verified ? (
          <>
            <View className="rounded-[18px] bg-[#F4F8FC]">
              <View className="items-center gap-1.5 px-4 pb-4 pt-[18px]">
                <View className="flex-row items-center gap-1.5">
                  <Svg
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1673D9"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Path d="M22 2L11 13" />
                    <Path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </Svg>
                  <AppText className="text-[16px] font-vn-bold">Gửi đến số của Trao</AppText>
                </View>
                <AppText className="text-[28px] font-vn-bold tracking-[1.12px]">
                  {formatTraoNumber(data.traoNumber)}
                </AppText>
                <CopyButton
                  text={data.traoNumber}
                  label={copied === 'num' ? 'Đã chép' : 'Sao chép'}
                  onCopy={() => setCopied('num')}
                />
              </View>
              <View className="mx-4 h-px bg-[#DCE6F0]" />
              <View className="items-center gap-1.5 px-4 pb-[18px] pt-4">
                <View className="flex-row items-center gap-1.5">
                  <ChatGlyph color="#1673D9" size={18} />
                  <AppText className="text-[16px] font-vn-bold">Nội dung tin nhắn</AppText>
                </View>
                <AppText className="pl-[7.92px] text-[36px] font-vn-bold tracking-[7.92px] text-[#0B4A99]">
                  {data.code}
                </AppText>
                <CopyButton
                  text={data.code}
                  label={copied === 'code' ? 'Đã chép' : 'Sao chép'}
                  onCopy={() => setCopied('code')}
                />
              </View>
            </View>

            <View
              accessibilityRole="progressbar"
              className="flex-row items-center gap-3 rounded-[14px] bg-[#FFF8E6] px-3.5 py-3"
            >
              <Spinner />
              <AppText className="flex-1 text-[13.5px] leading-[20px] text-[#3D2A00]">
                Đang chờ tin nhắn của bạn... Màn này tự chuyển khi Trao nhận được.
              </AppText>
            </View>

            <View className="gap-2">
              {(change ? CHANGE_NOTES : NOTES).map((note) => (
                <View key={note} className="flex-row gap-2">
                  <View className="mt-2 h-[5px] w-[5px] rounded-full bg-[#A3AEB9]" />
                  <AppText className="flex-1 text-[13px] leading-[19.5px] text-[#5A6772]">
                    {note}
                  </AppText>
                </View>
              ))}
            </View>
          </>
        ) : null}
        {!data && !error ? (
          <AppText className="py-8 text-center text-[14px] text-[#5A6772]">Đang tạo mã…</AppText>
        ) : null}
      </ScrollView>

      {data && !data.verified ? (
        <View
          className="gap-2 border-t border-[#EEF2F6] px-5 pt-3"
          style={{ paddingBottom: 20 + insets.bottom }}
        >
          <Pressable
            accessibilityRole="button"
            onPress={openSms}
            className="h-[54px] flex-row items-center justify-center gap-2.5 rounded-2xl bg-[#1673D9]"
          >
            <ChatGlyph color="#FFFFFF" size={20} />
            <AppText className="text-[16px] font-vn-bold text-white">Mở app nhắn tin</AppText>
          </Pressable>
          <AppText className="text-center text-[12.5px] text-[#5A6772]">
            Mở sẵn số Trao và mã, bạn chỉ cần bấm Gửi.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
