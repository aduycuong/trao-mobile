import { useRouter } from 'expo-router';
import React from 'react';
import { Linking } from 'react-native';
import Markdown from 'react-native-markdown-display';

const BODY = {
  fontFamily: 'BeVietnamPro_400Regular',
  fontSize: 14.5,
  lineHeight: 24,
  color: '#33414D',
};
const BOLD = 'BeVietnamPro_700Bold';
const SEMIBOLD = 'BeVietnamPro_600SemiBold';
const HEADING = { ...BODY, fontFamily: BOLD, color: '#0F2440' };

/** Same look as the web `MarkdownContent`. Raw HTML in the text is not rendered. */
const STYLES = {
  body: BODY,
  heading1: { ...HEADING, fontSize: 20, lineHeight: 28, marginTop: 24, marginBottom: 8 },
  heading2: { ...HEADING, fontSize: 17, lineHeight: 25, marginTop: 24, marginBottom: 8 },
  heading3: { ...HEADING, fontSize: 15, lineHeight: 22, marginTop: 16, marginBottom: 6 },
  paragraph: { marginTop: 10, marginBottom: 10 },
  strong: { fontFamily: SEMIBOLD, color: '#0F2440' },
  em: { fontStyle: 'italic' as const },
  hr: { backgroundColor: '#EEF2F6', height: 1, marginVertical: 20 },
  link: { fontFamily: SEMIBOLD, color: '#1673D9', textDecorationLine: 'none' as const },
  bullet_list: { marginVertical: 10 },
  ordered_list: { marginVertical: 10 },
  list_item: { marginVertical: 3 },
  bullet_list_icon: { color: '#A3AEB9', marginRight: 8 },
  ordered_list_icon: { color: '#5A6772', fontFamily: SEMIBOLD, marginRight: 8 },
  blockquote: {
    backgroundColor: '#FFF8E6',
    borderLeftWidth: 0,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 2,
    marginVertical: 12,
  },
  code_inline: {
    backgroundColor: '#F2F5F8',
    color: '#0F2440',
    fontSize: 12.5,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  table: { borderWidth: 1, borderColor: '#E6ECF2', borderRadius: 14, marginVertical: 12 },
  thead: { backgroundColor: '#F4F8FC' },
  th: { padding: 8, fontFamily: SEMIBOLD, fontSize: 13, color: '#0F2440' },
  tr: { borderBottomWidth: 1, borderColor: '#EEF2F6' },
  td: { padding: 8, fontSize: 13, lineHeight: 19.5 },
};

/** Markdown of a policy page or an answer; links to other help pages stay inside the app. */
export function MarkdownContent({ children }: { children: string }) {
  const router = useRouter();

  function openLink(url: string) {
    // The web writes in-app links as /app/policies/{slug}.
    const policy = /^\/app\/policies\/([a-z0-9-]+)\/?$/.exec(url);
    if (policy) {
      router.push({ pathname: '/policies/[slug]', params: { slug: policy[1]! } });
    } else if (/^https?:/i.test(url)) {
      Linking.openURL(url).catch(() => {});
    }
    return false;
  }

  return (
    <Markdown style={STYLES} onLinkPress={openLink}>
      {children}
    </Markdown>
  );
}
