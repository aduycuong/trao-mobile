import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { AppText } from '@/components/ui/app-text';

type AuthFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  invalid?: boolean;
  /** Renders the show/hide eye and hides the text until toggled. */
  password?: boolean;
  /** Right of the label, e.g. "Quên mật khẩu?". */
  labelAction?: React.ReactNode;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  editable?: boolean;
};

export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  invalid,
  password,
  labelAction,
  keyboardType,
  autoComplete,
  textContentType,
  autoCapitalize = 'none',
  returnKeyType,
  onSubmitEditing,
  editable = true,
}: AuthFieldProps) {
  const [shown, setShown] = useState(false);
  const [focused, setFocused] = useState(false);
  const border = invalid ? 'border-[#D92D20]' : focused ? 'border-[#1673D9]' : 'border-[#D5DDE5]';

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <AppText className="text-[13.5px] font-vn-semibold">{label}</AppText>
        {labelAction}
      </View>
      <View>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8794A1"
          secureTextEntry={password && !shown}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          textContentType={textContentType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`h-[52px] rounded-[14px] border-[1.5px] font-vn text-[15px] text-[#0F2440] ${border} ${
            invalid ? 'bg-[#FFF6F5]' : 'bg-white'
          } ${password ? 'pl-4 pr-[52px]' : 'px-4'}`}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shown ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            onPress={() => setShown((s) => !s)}
            className="absolute right-1 top-1 h-11 w-11 items-center justify-center"
          >
            <Svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5A6772"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
              <Circle cx={12} cy={12} r={3} />
            </Svg>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <View accessibilityRole="alert" className="flex-row items-start gap-1.5">
      <View className="mt-px">
        <Svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#B42318"
          strokeWidth={2.2}
          strokeLinecap="round"
        >
          <Circle cx={12} cy={12} r={9} />
          <Path d="M12 7.5v5.5M12 16.5h.01" />
        </Svg>
      </View>
      <AppText className="flex-1 text-[13px] leading-[18px] text-[#B42318]">{children}</AppText>
    </View>
  );
}

type AuthButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'tinted' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
};

export function AuthButton({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
}: AuthButtonProps) {
  const skin =
    variant === 'primary'
      ? 'bg-[#1673D9]'
      : variant === 'tinted'
        ? 'bg-[#F1F7FE]'
        : 'border-[1.5px] border-[#D5DDE5] bg-white';
  const text =
    variant === 'primary'
      ? 'text-[16px] font-vn-semibold text-white'
      : 'text-[15px] font-vn-semibold text-[#0F2440]';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={
        variant === 'primary'
          ? {
              shadowColor: '#1673D9',
              shadowOpacity: 0.28,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 6,
            }
          : undefined
      }
      className={`h-[52px] w-full flex-row items-center justify-center gap-2 rounded-[14px] ${skin} ${
        disabled && !loading ? 'opacity-50' : ''
      }`}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#0F2440'} /> : icon}
      <AppText className={text}>{label}</AppText>
    </Pressable>
  );
}

export function TextLink({
  label,
  onPress,
  size = 14,
  weight = 'bold',
}: {
  label: string;
  onPress: () => void;
  size?: number;
  weight?: 'bold' | 'semibold';
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      className="min-h-8 justify-center"
      hitSlop={6}
    >
      <AppText
        className={`text-[#1673D9] ${weight === 'bold' ? 'font-vn-bold' : 'font-vn-semibold'}`}
        style={{ fontSize: size }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const GOOGLE_PATHS = [
  [
    '#FFC107',
    'M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z',
  ],
  [
    '#FF3D00',
    'M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z',
  ],
  [
    '#4CAF50',
    'M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z',
  ],
  [
    '#1976D2',
    'M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z',
  ],
] as const;

function GoogleMark() {
  return (
    <Svg width={22} height={22} viewBox="0 0 48 48">
      {GOOGLE_PATHS.map(([fill, d]) => (
        <Path key={fill} fill={fill} d={d} />
      ))}
    </Svg>
  );
}

function FacebookMark() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={12} fill="#1877F2" />
      <Path
        fill="#FFFFFF"
        d="M15.1 12.9l.4-2.9h-2.8V8.2c0-.8.4-1.6 1.6-1.6h1.3V4.2s-1.1-.2-2.2-.2c-2.3 0-3.8 1.4-3.8 3.9V10H7.1v2.9h2.5V20c.5.1 1 .1 1.5.1s1 0 1.5-.1v-7.1h2.5z"
      />
    </Svg>
  );
}

/** Google/Facebook need native sign-in SDKs that are not wired yet, so tapping says so. */
export function SocialButtons() {
  const soon = (name: string) => () =>
    Alert.alert(name, `Đăng nhập bằng ${name} sẽ có trong bản sau. Hãy dùng email nhé.`);

  return (
    <View className="gap-2.5">
      <AuthButton
        variant="outline"
        label="Tiếp tục với Google"
        icon={<GoogleMark />}
        onPress={soon('Google')}
      />
      <AuthButton
        variant="outline"
        label="Tiếp tục với Facebook"
        icon={<FacebookMark />}
        onPress={soon('Facebook')}
      />
    </View>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-px flex-1 bg-[#E3E8ED]" />
      <AppText className="text-[13px] text-[#5A6772]">{label}</AppText>
      <View className="h-px flex-1 bg-[#E3E8ED]" />
    </View>
  );
}

export function MailIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinejoin="round"
    >
      <Rect x={3} y={5} width={18} height={14} rx={2.5} />
      <Path d="M4 7l8 6 8-6" />
    </Svg>
  );
}
