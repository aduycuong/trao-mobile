import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { AuthError } from '@/components/auth/auth-ui';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { pickScreenshots, uploadScreenshot } from '@/services/help/feedback-upload';
import { HELP_HOME_QUERY_KEY, postFeedback } from '@/services/help/help-api';
import type { FeedbackKind } from '@/types/help';

/** Screenshot tile and the add button: exact points (the web `h-24 w-16`), not rem classes. */
const SHOT_SIZE = { width: 64, height: 96 } as const;

const BODY_MAX_LENGTH = 2000;
const MAX_SCREENSHOTS = 3;

const KINDS: {
  value: FeedbackKind;
  label: string;
  icon: string;
  ink: string;
  question: string;
  placeholder: string;
}[] = [
  {
    value: 'bug',
    label: 'Báo lỗi',
    icon: 'M12 3l9 16H3zM12 10v4M12 17h.01',
    ink: '#B42318',
    question: 'Lỗi xảy ra thế nào?',
    placeholder: 'Bạn đang làm gì thì lỗi xuất hiện, lỗi hiện ra sao…',
  },
  {
    value: 'idea',
    label: 'Ý tưởng',
    icon: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
    ink: '#E8A200',
    question: 'Ý tưởng của bạn',
    placeholder: 'Bạn muốn Trao có thêm hoặc đổi điều gì…',
  },
  {
    value: 'other',
    label: 'Khác',
    icon: 'M4 5h16v11H8l-4 4z',
    ink: '#1673D9',
    question: 'Bạn muốn nói gì?',
    placeholder: 'Mô tả ngắn điều bạn muốn nói…',
  },
];

/** Góp ý cho Trao (canvas Help, views "feedback" and "sent"). Needs sign-in. */
export default function FeedbackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session, getIdToken } = useAuth();
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [text, setText] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [allowContact, setAllowContact] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const selected = KINDS.find((item) => item.value === kind) ?? KINDS[0]!;

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/help');
  };

  async function addScreenshots() {
    const room = MAX_SCREENSHOTS - screenshots.length;
    try {
      const picked = await pickScreenshots(room);
      if (picked.length > 0)
        setScreenshots((current) => [...current, ...picked].slice(0, MAX_SCREENSHOTS));
    } catch {
      Alert.alert('Không mở được thư viện ảnh', 'Hãy cho phép Trao xem ảnh trong cài đặt của máy.');
    }
  }

  async function send() {
    const body = text.trim();
    if (!body) {
      setError('Nhập nội dung góp ý.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const token = await getIdToken();
      const screenshotKeys: string[] = [];
      for (const uri of screenshots) screenshotKeys.push(await uploadScreenshot(token, uri));
      await postFeedback(token, {
        kind,
        body,
        screenshotKeys,
        allowContact,
        deviceInfo: {
          platform: Platform.OS,
          os: `${Platform.OS} ${Platform.Version}`,
          appVersion: Constants.expoConfig?.version,
        },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không gửi được góp ý. Thử lại sau.');
      setSending(false);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: HELP_HOME_QUERY_KEY });
    setSending(false);
    setSent(true);
  }

  if (sent) {
    return (
      <View className="flex-1 bg-white">
        <ScreenBar title="Góp ý cho Trao" onBack={back} />
        <View className="flex-1 items-center gap-3 px-7 pt-14">
          <View
            accessibilityElementsHidden
            className="h-20 w-20 items-center justify-center rounded-full bg-[#FFF4D6]"
          >
            <Svg
              width={38}
              height={38}
              viewBox="0 0 24 24"
              fill="#FFC22E"
              stroke="#E8A200"
              strokeWidth={1.4}
              strokeLinejoin="round"
            >
              <Path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" />
            </Svg>
          </View>
          <AppText className="mt-1.5 text-[21px] font-vn-bold">Cảm ơn bạn!</AppText>
          <AppText className="text-center text-[14.5px] leading-[22px] text-[#33414D]">
            Đội Trao đã nhận góp ý. Nếu cần hỏi thêm, Trao sẽ liên hệ qua email.
          </AppText>
        </View>
        <View className="px-4 pt-2.5" style={{ paddingBottom: 16 + insets.bottom }}>
          <Pressable
            accessibilityRole="button"
            onPress={back}
            className="h-[52px] items-center justify-center rounded-[14px] bg-[#1673D9]"
          >
            <AppText className="text-[16px] font-vn-bold text-white">Xong</AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <ScreenBar title="Góp ý cho Trao" onBack={back} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-[18px] px-4 pb-5 pt-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppText className="text-[14px] leading-[21.7px] text-[#33414D]">
          Trao mới ra mắt và đang hoàn thiện mỗi tuần. Góp ý của bạn đi thẳng tới đội làm sản phẩm.
        </AppText>

        <View className="gap-2">
          <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
            Bạn muốn góp ý về
          </AppText>
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
            {KINDS.map((item) => {
              const on = item.value === kind;
              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setKind(item.value)}
                  className={`h-[38px] flex-row items-center gap-1.5 rounded-full border-[1.5px] px-3.5 ${
                    on ? 'border-[#1673D9] bg-[#E6F1FF]' : 'border-[#D5DDE5] bg-white'
                  }`}
                >
                  <Svg
                    width={15}
                    height={15}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={item.ink}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Path d={item.icon} />
                  </Svg>
                  <AppText className="text-[13.5px] font-vn-semibold">{item.label}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-2">
          <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
            {selected.question}
          </AppText>
          <TextInput
            accessibilityLabel={selected.question}
            value={text}
            onChangeText={(value) => {
              setText(value);
              setError(null);
            }}
            placeholder={selected.placeholder}
            placeholderTextColor="#8794A1"
            maxLength={BODY_MAX_LENGTH}
            multiline
            textAlignVertical="top"
            className={`min-h-[130px] rounded-[14px] border-[1.5px] bg-white px-3.5 py-3 font-vn text-[14px] leading-[21.7px] text-[#0F2440] ${
              error ? 'border-[#D92D20]' : 'border-[#1673D9]'
            }`}
          />
        </View>

        <View className="gap-2.5">
          <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
            Ảnh chụp màn hình{' '}
            <AppText className="text-[13px] text-[#5A6772]">không bắt buộc</AppText>
          </AppText>
          <View className="flex-row gap-2">
            {screenshots.map((uri, index) => (
              <View key={uri} style={SHOT_SIZE}>
                <Image
                  source={{ uri }}
                  accessibilityLabel={`Ảnh chụp màn hình ${index + 1}`}
                  style={{ ...SHOT_SIZE, borderRadius: 10 }}
                  contentFit="cover"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Bỏ ảnh ${index + 1}`}
                  onPress={() =>
                    setScreenshots((current) => current.filter((item) => item !== uri))
                  }
                  className="absolute h-6 w-6 items-center justify-center rounded-full bg-[#0F2440]"
                  style={{ top: -6, right: -6, borderWidth: 2, borderColor: '#FFFFFF' }}
                >
                  <Svg
                    width={10}
                    height={10}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={3}
                    strokeLinecap="round"
                  >
                    <Path d="M6 6l12 12M18 6L6 18" />
                  </Svg>
                </Pressable>
              </View>
            ))}
            {screenshots.length < MAX_SCREENSHOTS ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Thêm ảnh"
                onPress={addScreenshots}
                className="items-center justify-center rounded-[10px] bg-[#F7FBFF]"
                style={{
                  ...SHOT_SIZE,
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: '#9CC3F0',
                }}
              >
                <Svg
                  width={22}
                  height={22}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1673D9"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                >
                  <Path d="M12 5v14M5 12h14" />
                </Svg>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View className="flex-row items-center gap-3 rounded-[14px] border border-[#E6ECF2] px-3.5 py-3">
          <View className="min-w-0 flex-1 gap-0.5">
            <AppText className="text-[14px] font-vn-bold">Cho phép Trao liên hệ lại</AppText>
            <AppText numberOfLines={1} className="text-[12.5px] text-[#5A6772]">
              Qua email {session?.email || 'của bạn'} nếu cần hỏi thêm
            </AppText>
          </View>
          {/* Sizes are plain styles (not classes) so the track and the knob cannot be squeezed. */}
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Cho phép Trao liên hệ lại"
            accessibilityState={{ checked: allowContact }}
            onPress={() => setAllowContact((current) => !current)}
            style={{
              width: 46,
              height: 28,
              padding: 3,
              borderRadius: 14,
              flexShrink: 0,
              justifyContent: 'center',
              backgroundColor: allowContact ? '#1673D9' : '#C3CCD6',
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                alignSelf: allowContact ? 'flex-end' : 'flex-start',
                backgroundColor: '#FFFFFF',
                shadowColor: '#000000',
                shadowOpacity: 0.2,
                shadowRadius: 3,
                shadowOffset: { width: 0, height: 1 },
                elevation: 2,
              }}
            />
          </Pressable>
        </View>

        {error ? <AuthError>{error}</AuthError> : null}

        <AppText className="text-[12.5px] leading-[18.75px] text-[#5A6772]">
          Góp ý kèm thông tin máy và phiên bản app để đội Trao tìm lỗi nhanh hơn. Cần xử lý tranh
          chấp giao dịch? Dùng <AppText className="text-[12.5px] font-vn-bold">Báo cáo</AppText>{' '}
          trong Chi tiết giao dịch.
        </AppText>
      </ScrollView>

      <View
        className="border-t border-[#EEF2F6] px-4 pt-2.5"
        style={{ paddingBottom: 16 + insets.bottom }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: sending, busy: sending }}
          disabled={sending}
          onPress={send}
          className={`h-[52px] items-center justify-center rounded-[14px] ${
            sending ? 'bg-[#E1E7ED]' : 'bg-[#1673D9]'
          }`}
        >
          <AppText
            className={`text-[16px] font-vn-bold ${sending ? 'text-[#A3AEB9]' : 'text-white'}`}
          >
            {sending ? 'Đang gửi…' : 'Gửi góp ý'}
          </AppText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
