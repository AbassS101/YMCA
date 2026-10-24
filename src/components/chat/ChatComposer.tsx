import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { MentionAutocomplete } from '@/components/MentionAutocomplete';
import { useAccessibility } from '@/context/AccessibilityContext';
import { containsProfanity } from '@/domain/types';
import type { ChatTheme } from './chatTheme';
import type { ChatMessage } from './chatTypes';

const QUICK_REPLIES = ['Thanks for the info!', 'Great tip, I will try it tomorrow.', 'See you there!', 'Count me in!'];
const TAGS = ['@All Staff Desk', '@Doc', '@Billy Deveaux', '@Jane Doe'];

type Props = {
  theme: ChatTheme;
  placeholder: string;
  maxLength?: number;
  replyTarget: ChatMessage | null;
  editTarget: ChatMessage | null;
  canPin?: boolean;
  onCancelBanner: () => void;
  onSend: (text: string, opts?: { pinned?: boolean }) => void;
  onFocus?: () => void;
};

export function ChatComposer({
  theme,
  placeholder,
  maxLength = 1000,
  replyTarget,
  editTarget,
  canPin,
  onCancelBanner,
  onSend,
  onFocus,
}: Props) {
  const { multiplier } = useAccessibility();
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [pinNext, setPinNext] = useState(false);
  const [height, setHeight] = useState(0);
  const inputRef = useRef<import('react').ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (editTarget) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(editTarget.content);
      inputRef.current?.focus();
    }
  }, [editTarget]);

  useEffect(() => {
    if (replyTarget) inputRef.current?.focus();
  }, [replyTarget]);

  const canSend = text.trim().length > 0;

  const submit = () => {
    if (!canSend) return;
    onSend(text, { pinned: canPin && pinNext });
    setText('');
    setPinNext(false);
    setMenuOpen(false);
  };

  const cancelBanner = () => {
    if (editTarget) setText('');
    onCancelBanner();
  };

  const fontSize = Math.round(15 * multiplier);
  const lineHeight = Math.round(20 * multiplier);

  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      {replyTarget || editTarget ? (
        <View style={[styles.banner, { backgroundColor: theme.input }]}>
          <Ionicons
            name={editTarget ? 'create-outline' : 'arrow-undo'}
            size={14}
            color={theme.accent}
          />
          <Text style={[styles.bannerText, { color: theme.muted }]} numberOfLines={1}>
            {editTarget ? 'Editing message' : 'Replying to '}
            {replyTarget ? (
              <Text style={{ fontWeight: '800', color: theme.text }}>{replyTarget.authorName}</Text>
            ) : null}
          </Text>
          <Pressable onPress={cancelBanner} hitSlop={10} accessibilityLabel="Cancel">
            <Ionicons name="close-circle" size={18} color={theme.muted} />
          </Pressable>
        </View>
      ) : null}

      <MentionAutocomplete text={text} onSelect={(_c, next) => setText(next)} />

      {menuOpen ? (
        <View style={styles.menu}>
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="always"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {QUICK_REPLIES.map((q) => (
              <Pressable
                key={q}
                onPress={() => {
                  onSend(q);
                  setMenuOpen(false);
                }}
                style={[styles.chip, { backgroundColor: theme.reactionBg }]}
              >
                <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>{q}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="always"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {TAGS.map((t) => (
              <Pressable
                key={t}
                onPress={() => setText((p) => (p ? `${p} ${t} ` : `${t} `))}
                style={[styles.chip, { backgroundColor: theme.mentionBg }]}
              >
                <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700' }}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {canPin ? (
            <View style={styles.pinRow}>
              <Ionicons name="pin-outline" size={16} color={theme.accent} />
              <Text style={{ flex: 1, color: theme.text, fontSize: 13, fontWeight: '600' }}>
                Pin next message as announcement
              </Text>
              <Switch value={pinNext} onValueChange={setPinNext} />
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <Pressable
          onPress={() => setMenuOpen((o) => !o)}
          style={[styles.plus, { backgroundColor: theme.input }]}
          accessibilityRole="button"
          accessibilityLabel="More options"
        >
          <Ionicons name={menuOpen ? 'close' : 'add'} size={22} color={theme.muted} />
        </Pressable>

        <View style={[styles.inputBox, { backgroundColor: theme.input }]}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            onFocus={onFocus}
            placeholder={placeholder}
            placeholderTextColor={theme.muted}
            multiline
            maxLength={maxLength}
            onContentSizeChange={(e) => setHeight(e.nativeEvent.contentSize.height)}
            onKeyPress={(e) => {
              const ev = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
              if (Platform.OS === 'web' && ev.key === 'Enter' && !ev.shiftKey) {
                (e as any).preventDefault?.();
                submit();
              }
            }}
            style={[
              styles.input,
              {
                color: theme.text,
                fontSize,
                lineHeight,
                height: Math.min(Math.max(height, lineHeight) + 4, lineHeight * 6 + 4),
              },
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
            ]}
          />
          {containsProfanity(text) ? (
            <Text style={styles.filter}>Family-friendly filter: profanity will be censored (****).</Text>
          ) : null}
        </View>

        <Pressable
          onPress={submit}
          disabled={!canSend}
          style={[styles.send, { backgroundColor: canSend ? theme.accent : theme.border }]}
          accessibilityRole="button"
          accessibilityLabel={editTarget ? 'Save edit' : 'Send message'}
        >
          <Ionicons name={editTarget ? 'checkmark' : 'arrow-up'} size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 8, gap: 6 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  bannerText: { flex: 1, fontSize: 12 },
  menu: { gap: 6 },
  chips: { gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  plus: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  inputBox: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, minHeight: 38, justifyContent: 'center' },
  input: { padding: 0, margin: 0, textAlignVertical: 'center' },
  filter: { color: '#D97706', fontSize: 10, fontWeight: '700', marginTop: 2 },
  send: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
