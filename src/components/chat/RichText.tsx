import React, { useMemo } from 'react';
import { Linking, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { filterProfanity } from '@/domain/types';
import type { ChatTheme } from './chatTheme';

type Token =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'italic'; v: string }
  | { t: 'code'; v: string }
  | { t: 'mention'; v: string }
  | { t: 'link'; v: string };

const PATTERN =
  /(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(`[^`\n]+`)|(https?:\/\/[^\s]+)|(@[A-Za-z][A-Za-z0-9_]*(?: [A-Z][A-Za-z0-9_]*)?)/g;

export function tokenize(input: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  PATTERN.lastIndex = 0;
  while ((m = PATTERN.exec(input))) {
    if (m.index > last) out.push({ t: 'text', v: input.slice(last, m.index) });
    const s = m[0];
    if (m[1]) out.push({ t: 'bold', v: s.slice(2, -2) });
    else if (m[2]) out.push({ t: 'italic', v: s.slice(1, -1) });
    else if (m[3]) out.push({ t: 'code', v: s.slice(1, -1) });
    else if (m[4]) out.push({ t: 'link', v: s });
    else out.push({ t: 'mention', v: s });
    last = m.index + s.length;
  }
  if (last < input.length) out.push({ t: 'text', v: input.slice(last) });
  return out;
}

type Props = {
  text: string;
  theme: ChatTheme;
  style?: StyleProp<TextStyle>;
};

export function RichText({ text, theme, style }: Props) {
  const tokens = useMemo(() => tokenize(filterProfanity(text)), [text]);
  return (
    <Text style={[styles.base, { color: theme.text }, style]}>
      {tokens.map((tk, i) => {
        switch (tk.t) {
          case 'bold':
            return (
              <Text key={i} style={styles.bold}>
                {tk.v}
              </Text>
            );
          case 'italic':
            return (
              <Text key={i} style={styles.italic}>
                {tk.v}
              </Text>
            );
          case 'code':
            return (
              <Text
                key={i}
                style={[
                  styles.code,
                  { backgroundColor: theme.reactionBg, color: theme.isDark ? '#FCA5A5' : '#B91C1C' },
                ]}
              >
                {` ${tk.v} `}
              </Text>
            );
          case 'mention':
            return (
              <Text
                key={i}
                style={[styles.mention, { backgroundColor: theme.mentionBg, color: theme.accent }]}
              >
                {tk.v}
              </Text>
            );
          case 'link':
            return (
              <Text
                key={i}
                style={[styles.link, { color: theme.accent }]}
                onPress={() => void Linking.openURL(tk.v).catch(() => {})}
              >
                {tk.v}
              </Text>
            );
          default:
            return <Text key={i}>{tk.v}</Text>;
        }
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { fontSize: 15, lineHeight: 21 },
  bold: { fontWeight: '800' },
  italic: { fontStyle: 'italic' },
  code: { fontFamily: 'monospace', fontSize: 13 },
  mention: { fontWeight: '700' },
  link: { textDecorationLine: 'underline' },
});
