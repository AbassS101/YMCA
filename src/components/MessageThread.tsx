import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  LayoutAnimation,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const { colors: themeColors, isDark } = useTheme();
  const [draft, setDraft] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      setIsFocused(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleDismissKeyboard = () => {
    inputRef.current?.blur();
    Keyboard.dismiss();
    setIsFocused(false);
    setKeyboardVisible(false);
    setKeyboardHeight(0);
  };

  const handleSend = () => {
    const body = draft.trim();
    if (!body) return;
    onSend(body);
    setDraft('');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.background,
          paddingBottom:
            keyboardVisible && keyboardHeight > 0
              ? keyboardHeight
              : keyboardVisible && Platform.OS === 'android'
                ? 280
                : Math.max(insets.bottom, 12),
        },
      ]}
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
          const formattedTime = formatTime(item.createdAt);
          return (
            <View
              style={[styles.bubbleWrap, mine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs]}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={`${mine ? 'You' : 'Member'} said: ${item.body}. Sent at ${formattedTime}`}
            >
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
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  {formattedTime}
                </Text>
              </View>
            </View>
          );
        }}
      />
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
          {keyboardVisible || isFocused ? (
            <Pressable
              onPress={handleDismissKeyboard}
              style={({ pressed }) => [
                styles.dismissKeyboardBtn,
                {
                  backgroundColor: pressed
                    ? '#E0F2FE'
                    : isDark
                      ? themeColors.background
                      : '#F1F5F9',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Put keyboard down"
              hitSlop={8}
            >
              <Ionicons name="chevron-down" size={20} color={themeColors.primary} />
            </Pressable>
          ) : null}
          <View style={styles.inputFlex}>
            <TextField
              ref={inputRef}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              value={draft}
              onChangeText={setDraft}
              placeholder="Message..."
              style={styles.composerInput}
              multiline
            />
          </View>
          <View style={styles.sendBtnWrap}>
            <PrimaryButton title="Send" onPress={handleSend} disabled={!draft.trim()} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
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
  composer: {
    paddingHorizontal: 12,
    paddingTop: 10,
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
  sendBtnWrap: {
    alignSelf: 'flex-end',
    minWidth: 70,
    marginBottom: 4,
  },
  dismissKeyboardBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    marginRight: 2,
  },
});
