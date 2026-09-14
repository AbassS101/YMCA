import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Message } from '@/domain/types';
import { useTheme } from '@/context/ThemeContext';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';

type MessageThreadProps = {
  messages: Message[];
  currentUserId: string;
  onSend: (body: string) => void;
  emptyHint?: string;
  /** Optional content rendered above the message list (avoids nested ScrollView) */
  listHeader?: React.ReactElement;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function MessageThread({
  messages,
  currentUserId,
  onSend,
  emptyHint = 'Say hello.',
  listHeader,
}: MessageThreadProps) {
  const { colors: themeColors, isDark } = useTheme();
  const [draft, setDraft] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = () => {
    const body = draft.trim();
    if (!body) return;
    onSend(body);
    setDraft('');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.list}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<Text style={[styles.empty, { color: themeColors.muted }]}>{emptyHint}</Text>}
        renderItem={({ item }) => {
          const mine = item.fromId === currentUserId;
          return (
            <View style={[styles.bubbleWrap, mine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs]}>
              <View
                style={[
                  styles.bubble,
                  mine
                    ? [styles.bubbleMine, { backgroundColor: themeColors.primary }]
                    : [
                        styles.bubbleTheirs,
                        {
                          backgroundColor: themeColors.card,
                          borderColor: themeColors.border,
                        },
                      ],
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    mine ? styles.bubbleTextMine : [styles.bubbleTextTheirs, { color: themeColors.nearBlack }],
                  ]}
                >
                  {item.body}
                </Text>
                <Text
                  style={[
                    styles.time,
                    mine ? styles.timeMine : [styles.timeTheirs, { color: themeColors.muted }],
                  ]}
                >
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            </View>
          );
        }}
      />
      {/* Quick Dismiss Keyboard Bar */}
      {isKeyboardVisible && (
        <Pressable
          onPress={() => Keyboard.dismiss()}
          style={[
            styles.dismissKeyboardBar,
            {
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              borderTopColor: themeColors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Hide keyboard"
        >
          <Ionicons name="chevron-down-circle" size={16} color={themeColors.primary} />
          <Text style={[styles.dismissKeyboardText, { color: themeColors.primary }]}>
            Hide Keyboard
          </Text>
        </Pressable>
      )}
      <View
        style={[
          styles.composer,
          {
            backgroundColor: themeColors.card,
            borderTopColor: themeColors.border,
          },
        ]}
      >
        <View style={styles.composerInputRow}>
          <View style={styles.inputFlex}>
            <TextField
              value={draft}
              onChangeText={setDraft}
              placeholder="Message"
              style={styles.composerInput}
              multiline
            />
          </View>
          {isKeyboardVisible && (
            <Pressable
              onPress={() => Keyboard.dismiss()}
              style={({ pressed }) => [
                styles.composerHideKeyBtn,
                {
                  backgroundColor: pressed
                    ? themeColors.primaryLight
                    : isDark
                      ? '#334155'
                      : '#E2E8F0',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Hide keyboard"
            >
              <Ionicons name="chevron-down" size={20} color={themeColors.primary} />
            </Pressable>
          )}
        </View>
        <PrimaryButton title="Send" onPress={handleSend} disabled={!draft.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  list: {
    padding: 16,
    gap: 8,
    flexGrow: 1,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  empty: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  bubbleWrap: {
    marginBottom: 8,
  },
  bubbleWrapMine: {
    alignItems: 'flex-end',
  },
  bubbleWrapTheirs: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
  },
  bubbleTheirs: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    ...typography.body,
  },
  bubbleTextMine: {
    color: colors.white,
  },
  bubbleTextTheirs: {
    color: colors.nearBlack,
  },
  time: {
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  timeMine: {
    color: 'rgba(255,255,255,0.75)',
  },
  timeTheirs: {
    color: colors.muted,
  },
  dismissKeyboardBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dismissKeyboardText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
  },
  composer: {
    padding: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  composerInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputFlex: {
    flex: 1,
  },
  composerInput: {
    maxHeight: 100,
  },
  composerHideKeyBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
});
