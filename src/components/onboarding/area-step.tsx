import * as Crypto from 'expo-crypto';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AuthError } from '@/components/auth/auth-ui';
import { AppText } from '@/components/ui/app-text';
import { resolvePlace, suggestAreas } from '@/services/onboarding/onboarding-api';
import type { PlaceSuggestion, ResolvedLocation } from '@/types/onboarding';
import { FooterButton, OnboardingBar, PinIcon } from './onboarding-ui';

const SUGGEST_DEBOUNCE_MS = 300;

type AreaStepProps = {
  onBack: () => void;
  onPicked: (location: ResolvedLocation) => void;
  /** Replaces the step bar when the picker is used outside the start flow (Tài khoản, Cài đặt). */
  header?: React.ReactNode;
  title?: string;
  description?: string;
  submitLabel?: string;
  /** Disables the button while the caller saves the pick. */
  saving?: boolean;
};

/** An area chosen from the suggestion list. */
type PickedArea = { name: string; resolved: ResolvedLocation };

function SuggestionLabel({ text, typed }: { text: string; typed: string }) {
  const matches = text.toLowerCase().startsWith(typed.toLowerCase());
  if (!matches) return <>{text}</>;
  return (
    <>
      <AppText className="text-[15px] font-vn-bold">{text.slice(0, typed.length)}</AppText>
      {text.slice(typed.length)}
    </>
  );
}

export function AreaStep({
  onBack,
  onPicked,
  header,
  title = 'Bạn ở khu vực nào?',
  description = 'Không dùng vị trí cũng được — chọn khu vực để xếp đồ gần bạn lên trước.',
  submitLabel = 'Tiếp tục',
  saving,
}: AreaStepProps) {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [picked, setPicked] = useState<PickedArea | null>(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One token per search box, shared by the suggestions and the pick that ends them.
  const sessionTokenRef = useRef(Crypto.randomUUID());
  const inputRef = useRef<TextInput>(null);

  const typed = input.trim();

  useEffect(() => {
    if (!typed || picked) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      suggestAreas({ input: typed, sessionToken: sessionTokenRef.current })
        .then((found) => {
          if (!cancelled) setSuggestions(found);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        });
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [typed, picked]);

  const visibleSuggestions = typed && !picked ? suggestions : [];

  async function pick(placeId: string, name: string) {
    setError(null);
    setResolving(true);
    try {
      const resolved = await resolvePlace({ placeId, sessionToken: sessionTokenRef.current });
      setPicked({ name, resolved });
      setInput(name);
      // A new search box gets a new session token.
      sessionTokenRef.current = Crypto.randomUUID();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Không chọn được khu vực này. Thử khu vực khác.'
      );
    } finally {
      setResolving(false);
    }
  }

  function clear() {
    setInput('');
    setPicked(null);
    setSuggestions([]);
    setError(null);
  }

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-white">
      {header ?? <OnboardingBar index={0} onBack={onBack} />}
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-5 pb-5 pt-2"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1">
          <AppText className="text-[23px] font-vn-bold">{title}</AppText>
          <AppText className="text-[14px] leading-[21px] text-[#5A6772]">{description}</AppText>
        </View>

        <View className="gap-1.5">
          <AppText className="text-[13px] font-vn-semibold text-[#5A6772]">Khu vực của bạn</AppText>
          <Pressable
            accessible={false}
            onPress={() => inputRef.current?.focus()}
            className={`h-[50px] flex-row items-center gap-2 rounded-[14px] bg-white pl-3.5 pr-1.5 ${
              focused ? 'border-2 border-[#1673D9]' : 'border-[1.5px] border-[#D5DDE5]'
            }`}
            style={
              focused
                ? {
                    shadowColor: '#1673D9',
                    shadowOpacity: 0.12,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 0 },
                  }
                : undefined
            }
          >
            <PinIcon color={typed ? '#1673D9' : '#A3AEB9'} />
            <TextInput
              ref={inputRef}
              accessibilityLabel="Khu vực của bạn"
              value={input}
              onChangeText={(text) => {
                setInput(text);
                setPicked(null);
                setError(null);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Ví dụ: Linh Xuân, Võ Văn Ngân"
              placeholderTextColor="#A3AEB9"
              autoCorrect={false}
              className={`h-full min-w-0 flex-1 text-[15px] text-[#0F2440] ${
                picked ? 'font-vn-semibold' : 'font-vn'
              }`}
            />
            {input ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xoá"
                onPress={clear}
                className="h-9 w-9 items-center justify-center"
              >
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="#A3AEB9">
                  <Circle cx={12} cy={12} r={10} />
                  <Path
                    d="M8.5 8.5l7 7M15.5 8.5l-7 7"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </Svg>
              </Pressable>
            ) : null}
          </Pressable>
          <AppText className="text-[12.5px] leading-[18.75px] text-[#5A6772]">
            Gõ tên phường, xã hoặc địa điểm gần bạn (đường, khu dân cư…). Không cần số nhà.
          </AppText>
        </View>

        {error ? <AuthError>{error}</AuthError> : null}

        {visibleSuggestions.length > 0 ? (
          <View
            accessibilityRole="list"
            className="overflow-hidden rounded-2xl border border-[#E6ECF2]"
          >
            {visibleSuggestions.map((suggestion) => (
              <Pressable
                key={suggestion.placeId}
                accessibilityRole="button"
                disabled={resolving}
                onPress={() => pick(suggestion.placeId, suggestion.mainText)}
                className={`min-h-14 flex-row items-center gap-3 border-b border-[#F2F5F8] bg-white px-3.5 py-2 ${
                  resolving ? 'opacity-60' : ''
                }`}
              >
                <PinIcon color="#5A6772" />
                <View className="min-w-0 flex-1 gap-px">
                  <AppText className="text-[15px]">
                    <SuggestionLabel text={suggestion.mainText} typed={typed} />
                  </AppText>
                  <AppText className="text-[12.5px] text-[#5A6772]">
                    {suggestion.secondaryText}
                  </AppText>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {picked ? (
          <View className="gap-3 rounded-2xl border border-[#D6E7FB] bg-[#F1F7FE] p-3.5">
            <View className="flex-row items-start gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                <PinIcon color="#1673D9" />
              </View>
              <View className="min-w-0 flex-1 gap-0.5">
                <AppText className="text-[15px] font-vn-bold">{picked.name}</AppText>
                <AppText className="text-[13px] text-[#5A6772]">
                  Dùng để xếp đồ gần bạn lên trước
                </AppText>
              </View>
            </View>
            <View className="flex-row items-center gap-2 border-t border-[#D6E7FB] pt-2.5">
              <Svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2F9E63"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z" />
              </Svg>
              <AppText className="flex-1 text-[13px] text-[#33414D]">
                Người khác chỉ thấy{' '}
                <AppText className="text-[13px] font-vn-bold">{picked.resolved.name}</AppText>
              </AppText>
            </View>
          </View>
        ) : null}
      </ScrollView>
      <View className="border-t border-[#EEF2F6] px-5 pb-6 pt-3">
        <FooterButton
          label={submitLabel}
          disabled={!picked || resolving || saving}
          onPress={() => picked && onPicked(picked.resolved)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
