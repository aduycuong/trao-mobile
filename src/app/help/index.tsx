import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { AppText } from '@/components/ui/app-text';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchHelpHome, HELP_HOME_QUERY_KEY, searchHelp } from '@/services/help/help-api';

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MAX_LENGTH = 100;

const TOPIC_ICONS: Record<string, string> = {
  'trade-safety': 'M12 3l7 3v6c0 4-3 7.5-7 9-4-1.5-7-5-7-9V6z',
  'listing-guidelines': 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01',
  'four-forms': 'M7 7h11l-3-3M17 17H6l3 3',
  'penalties-appeals': 'M6 4h10v16H6z',
  'reviews-reputation':
    'M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z',
  rewards: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 12h6M12 9v6',
};
/** Page icon for a topic the canvas has no icon for. */
const DEFAULT_TOPIC_ICON = 'M7 3h8l4 4v14H7zM14 3v5h5';

function Chevron({ color = '#A3AEB9', size = 16, width = 2 }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

function FaqRow({ question, onPress }: { question: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-[52px] flex-row items-center gap-2.5 border-b border-[#F2F5F8] py-2"
    >
      <AppText className="flex-1 text-[14px]">{question}</AppText>
      <Chevron />
    </Pressable>
  );
}

function PageRow({
  title,
  summary,
  onPress,
}: {
  title: string;
  summary: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-2.5 border-b border-[#F2F5F8] py-2"
    >
      <View className="flex-1 gap-0.5">
        <AppText className="text-[14.5px] font-vn-medium">{title}</AppText>
        {summary ? <AppText className="text-[12.5px] text-[#5A6772]">{summary}</AppText> : null}
      </View>
      <Chevron />
    </Pressable>
  );
}

/** Trợ giúp & chính sách (canvas Help, view "help"). Open to guests; "Của bạn" only when signed in. */
export default function HelpScreen() {
  const router = useRouter();
  const { session, getIdToken } = useAuth();
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query.trim(), SEARCH_DEBOUNCE_MS);

  const { data, error, refetch, isPending } = useQuery({
    queryKey: [...HELP_HOME_QUERY_KEY, session?.uid ?? null],
    queryFn: async () => fetchHelpHome(session ? await getIdToken() : undefined),
  });
  const search = useQuery({
    queryKey: ['help', 'search', debounced],
    queryFn: () => searchHelp(debounced),
    enabled: debounced.length > 0,
  });

  const searching = query.trim().length > 0;
  const results = search.data;

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/me');
  };
  const openFaq = (id: string) => router.push({ pathname: '/help/faq/[id]', params: { id } });
  const openPage = (slug: string) =>
    router.push({ pathname: '/policies/[slug]', params: { slug } });

  return (
    <View className="flex-1 bg-white">
      <ScreenBar title="Trợ giúp & chính sách" onBack={back} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-5 px-4 pb-6 pt-3.5"
      >
        {isPending ? (
          <View className="items-center py-10">
            <AppText className="text-[14px] text-[#5A6772]">Đang tải…</AppText>
          </View>
        ) : null}
        {error ? (
          <View accessibilityRole="alert" className="rounded-2xl bg-[#FDECEA] px-4 py-3">
            <AppText className="text-[14px] text-[#B42318]">{error.message}</AppText>
            <Pressable onPress={() => refetch()} className="mt-1.5">
              <AppText className="text-[14px] font-vn-semibold text-[#B42318] underline">
                Thử lại
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {data ? (
          <>
            <View className="h-[46px] flex-row items-center gap-2 rounded-[14px] bg-[#F2F5F8] px-3.5">
              <Svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#5A6772"
                strokeWidth={2}
                strokeLinecap="round"
              >
                <Circle cx={11} cy={11} r={7} />
                <Path d="M20 20l-4-4" />
              </Svg>
              <TextInput
                accessibilityLabel="Tìm câu hỏi"
                value={query}
                onChangeText={setQuery}
                maxLength={SEARCH_MAX_LENGTH}
                placeholder="Bạn cần giúp gì?"
                placeholderTextColor="#A3AEB9"
                returnKeyType="search"
                autoCorrect={false}
                className="h-full min-w-0 flex-1 font-vn text-[14px] text-[#0F2440]"
              />
            </View>

            {searching ? (
              <View accessibilityLiveRegion="polite">
                {search.isFetching && !results ? (
                  <AppText className="py-4 text-[14px] text-[#5A6772]">Đang tìm…</AppText>
                ) : null}
                {results && results.faqs.length + results.pages.length === 0 ? (
                  <AppText className="py-4 text-[14px] leading-[21px] text-[#5A6772]">
                    Không tìm thấy kết quả cho “{debounced}”. Thử từ khoá khác, hoặc nhắn đội Trao
                    qua Góp ý.
                  </AppText>
                ) : null}
                {results?.faqs.map((faq) => (
                  <FaqRow key={faq.id} question={faq.question} onPress={() => openFaq(faq.id)} />
                ))}
                {results?.pages.map((page) => (
                  <PageRow
                    key={page.slug}
                    title={page.title}
                    summary={page.summary}
                    onPress={() => openPage(page.slug)}
                  />
                ))}
              </View>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(session ? '/help/feedback' : '/auth-gate')}
                >
                  <LinearGradient
                    colors={['#1673D9', '#0B4A99']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      padding: 16,
                      borderRadius: 18,
                    }}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-[13px] bg-white/[0.18]">
                      <Svg
                        width={22}
                        height={22}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <Path d="M4 5h16v11H8l-4 4zM9 10h6M9 13h3" />
                      </Svg>
                    </View>
                    <View className="flex-1 gap-[3px]">
                      <AppText className="text-[16px] font-vn-bold text-white">
                        Góp ý cho Trao
                      </AppText>
                      <AppText className="text-[13px] leading-[19px] text-[#D6E8FC]">
                        Trao mới ra mắt. Gặp lỗi hay có ý tưởng, nhắn đội Trao — mọi góp ý đều được
                        đọc.
                      </AppText>
                    </View>
                    <Chevron color="#FFFFFF" size={18} width={2.2} />
                  </LinearGradient>
                </Pressable>

                <View className="gap-2.5">
                  <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
                    Chủ đề
                  </AppText>
                  <View className="flex-row flex-wrap gap-2">
                    {data.topics.map((topic) => (
                      <Pressable
                        key={topic.slug}
                        accessibilityRole="button"
                        onPress={() => openPage(topic.slug)}
                        className="items-start gap-1.5 rounded-[14px] border border-[#E6ECF2] bg-white p-3"
                        style={{ width: '48.8%' }}
                      >
                        <Svg
                          width={22}
                          height={22}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#1673D9"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <Path d={TOPIC_ICONS[topic.slug] ?? DEFAULT_TOPIC_ICON} />
                        </Svg>
                        <AppText className="text-[13.5px] font-vn-semibold leading-[18px]">
                          {topic.title}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {data.faqs.length > 0 ? (
                  <View>
                    <AppText accessibilityRole="header" className="mb-1 text-[15px] font-vn-bold">
                      Câu hỏi thường gặp
                    </AppText>
                    {data.faqs.map((faq) => (
                      <FaqRow
                        key={faq.id}
                        question={faq.question}
                        onPress={() => openFaq(faq.id)}
                      />
                    ))}
                  </View>
                ) : null}

                {data.mine ? (
                  <View>
                    <AppText accessibilityRole="header" className="mb-1 text-[15px] font-vn-bold">
                      Của bạn
                    </AppText>
                    {/* Reports and cards are part 8 of the plan; they only show a label until then. */}
                    {['Báo cáo của tôi', 'Thẻ phạt và kiến nghị'].map((label) => (
                      <View
                        key={label}
                        className="min-h-14 flex-row items-center gap-2.5 border-b border-[#F2F5F8] py-2"
                        style={{ opacity: 0.55 }}
                      >
                        <AppText className="flex-1 text-[14.5px] font-vn-medium">{label}</AppText>
                        <AppText className="text-[13px] text-[#5A6772]">Sắp có</AppText>
                      </View>
                    ))}
                    <View className="min-h-14 justify-center gap-0.5 border-b border-[#F2F5F8] py-2">
                      <AppText className="text-[14.5px] font-vn-medium">Góp ý đã gửi</AppText>
                      <AppText className="text-[12.5px] text-[#5A6772]">
                        {data.mine.feedbackCount > 0
                          ? `${data.mine.feedbackCount} góp ý`
                          : 'Chưa có góp ý nào'}
                      </AppText>
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
