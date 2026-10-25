import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { MailArt } from '@/components/auth/auth-art';
import { AuthBar, AuthIntro, AuthScroll, AuthSheet } from '@/components/auth/auth-layout';
import { AuthButton, AuthError, MailIcon, TextLink } from '@/components/auth/auth-ui';
import { CatIcon } from '@/components/icons/cat-icon';
import { AppText } from '@/components/ui/app-text';
import { sendPasswordReset, sendVerificationEmail } from '@/services/firebase-auth';
import { maskEmail } from '@/utils/auth-validation';

const RESEND_COOLDOWN_SECONDS = 60;

const COPY = {
  register: {
    title: 'Kiểm tra email của bạn',
    before: 'Trao đã gửi link xác minh tới',
    after: 'Bấm vào link trong email để xác minh tài khoản.',
    secondary: 'Để sau, vào Trao',
    tip: 'Không thấy email? Xem thư mục Spam hoặc Quảng cáo.',
  },
  reset: {
    title: 'Đã gửi link đặt lại',
    before: 'Trao đã gửi link đặt lại mật khẩu tới',
    after: 'Bấm vào link trong email để đặt mật khẩu mới.',
    secondary: 'Quay lại đăng nhập',
    tip: 'Link chỉ dùng được một lần và sẽ hết hạn sau một thời gian ngắn. Không thấy email? Xem thư mục Spam.',
  },
} as const;

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function openMailApp() {
  // iOS has no "open inbox" link besides Mail's own scheme; elsewhere a blank compose is the closest.
  Linking.openURL(Platform.OS === 'ios' ? 'message://' : 'mailto:').catch(() =>
    Linking.openURL('mailto:').catch(() => {})
  );
}

export default function SentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string; email?: string }>();
  const kind = params.kind === 'register' ? 'register' : 'reset';
  const email = params.email ?? '';
  const copy = COPY[kind];
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  function goBack() {
    router.replace(kind === 'register' ? '/register' : '/forgot');
  }

  function secondary() {
    if (kind === 'register') router.replace({ pathname: '/done', params: { kind: 'welcome' } });
    else router.replace('/login');
  }

  async function resend() {
    setMessage(null);
    try {
      if (kind === 'register') await sendVerificationEmail();
      else await sendPasswordReset(email);
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
      setMessage({ error: false, text: 'Đã gửi lại link.' });
    } catch (caught) {
      setMessage({
        error: true,
        text: caught instanceof Error ? caught.message : 'Không gửi lại được. Thử lại sau.',
      });
    }
  }

  return (
    <AuthScroll>
      <AuthBar
        action={{ kind: 'back', label: 'Quay lại', onPress: goBack }}
        step={kind === 'reset' ? { current: 1, total: 2 } : undefined}
      />
      <AuthSheet>
        <AuthIntro centered topPadding={28} title={copy.title} illustration={<MailArt />}>
          {copy.before} <AppText className="font-vn-bold">{maskEmail(email)}</AppText>. {copy.after}
        </AuthIntro>
        {kind === 'register' ? (
          <View className="flex-row items-center gap-3 rounded-[14px] bg-[#F1F7FE] px-3.5 py-3">
            <CatIcon kind="me" size={40} />
            <AppText className="flex-1 text-[13px] leading-[18.85px] text-[#33414D]">
              Bạn vẫn dùng Trao bình thường trong lúc chờ. Xác minh xong, hồ sơ có huy hiệu{' '}
              <AppText className="text-[13px] font-vn-bold">✓ Email</AppText> và được cộng điểm uy
              tín.
            </AppText>
          </View>
        ) : null}
        <View className="flex-1" />
        <View className="gap-2.5">
          <AuthButton label="Mở ứng dụng Mail" onPress={openMailApp} icon={<MailIcon />} />
          <AuthButton variant="tinted" label={copy.secondary} onPress={secondary} />
          <View className="flex-row flex-wrap items-center justify-center gap-x-3.5 gap-y-1 pt-1">
            {secondsLeft > 0 ? (
              <AppText className="text-[13.5px] text-[#5A6772]">
                Chưa nhận được? Gửi lại sau{' '}
                <AppText className="text-[13.5px] font-vn-semibold">
                  {formatCountdown(secondsLeft)}
                </AppText>
              </AppText>
            ) : (
              <TextLink label="Gửi lại link" size={13.5} weight="semibold" onPress={resend} />
            )}
            <TextLink label="Đổi email" size={13.5} weight="semibold" onPress={goBack} />
          </View>
          {message ? (
            message.error ? (
              <AuthError>{message.text}</AuthError>
            ) : (
              <AppText className="text-center text-[12.5px] text-[#33414D]">{message.text}</AppText>
            )
          ) : null}
          <AppText className="text-center text-[12.5px] leading-[18.75px] text-[#5A6772]">
            {copy.tip}
          </AppText>
        </View>
      </AuthSheet>
    </AuthScroll>
  );
}
