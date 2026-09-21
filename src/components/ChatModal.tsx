import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import type { Message, Staff } from '@/domain/types';
import { radii, spacing, typography } from '@/theme/typography';

type ChatModalProps = {
  visible: boolean;
  onClose: () => void;
  recipient: Staff | null;
  messages: Message[];
  currentUserId: string;
  onSend: (body: string) => void;
  isAssignedTrainer?: boolean;
};

export function formatChatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function calculateModalTopInset(insetsTop: number, platform: string = Platform.OS): number {
  // On iOS devices with Dynamic Island (iPhone 14 Pro, 15, 16 series), insetsTop is typically 54-59px.
  // Standard notch devices are 44-47px. If insetsTop is missing or 0 in a modal, provide a safe iOS fallback.
  return Math.max(insetsTop, platform === 'ios' ? 48 : 20);
}

const STAFF_SUGGESTIONS = [
  'What are the current pool & gym hours?',
  'How do I claim or send a guest pass?',
  'I would like help updating my membership plan.',
  'Are locker rentals available today?',
];

const TRAINER_SUGGESTIONS = [
  'Can we schedule a 1-on-1 personal training session?',
  'What workout routine do you recommend for core strength?',
  'How often should I rest between heavy lifting days?',
];

export function ChatModal({
  visible,
  onClose,
  recipient,
  messages,
  currentUserId,
  onSend,
  isAssignedTrainer = false,
}: ChatModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { multiplier } = useAccessibility();
  const [draft, setDraft] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<any>(null);

  const isStaffDesk = recipient?.id === 'staff-desk';
  const firstName = recipient?.name.split(' ')[0] ?? 'YMCA';
  const topInset = calculateModalTopInset(insets.top);
  const suggestions = isStaffDesk ? STAFF_SUGGESTIONS : TRAINER_SUGGESTIONS;

  // Listen to keyboard show/hide and track exact mobile keyboard state
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [visible, messages.length]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };

  const handleApplySuggestion = (prompt: string) => {
    setDraft(prompt);
    inputRef.current?.focus();
  };

  if (!recipient) return null;

  const bottomInset =
    keyboardVisible && keyboardHeight > 0
      ? keyboardHeight
      : keyboardVisible && Platform.OS === 'android'
        ? 280
        : Math.max(insets.bottom, 12);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        {/* Modal Header with Dynamic Island safe area padding */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
              paddingTop: topInset + 6,
              paddingBottom: 12,
              paddingHorizontal: Math.max(spacing.md, insets.left, insets.right),
            },
          ]}
          accessibilityRole="header"
        >
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: isStaffDesk
                    ? isDark
                      ? '#1E3A8A'
                      : '#DBEAFE'
                    : isDark
                      ? '#064E3B'
                      : '#DCFCE7',
                },
              ]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              <Ionicons
                name={isStaffDesk ? 'business' : 'fitness'}
                size={22}
                color={isStaffDesk ? colors.primary : colors.success}
              />
            </View>
            <View style={styles.headerTextWrap}>
              <View style={styles.nameRow}>
                <AppText
                  style={[styles.recipientName, { color: colors.nearBlack }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {recipient.name}
                </AppText>
                {isAssignedTrainer ? (
                  <View
                    style={[styles.badgePill, { backgroundColor: colors.primaryLight }]}
                    accessibilityLabel="Primary Assigned Trainer"
                  >
                    <AppText style={[styles.badgeText, { color: colors.primary }]}>
                      PRIMARY
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText
                style={[styles.recipientRole, { color: colors.muted }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {recipient.roleLabel}
              </AppText>
            </View>
          </View>

          {/* Header Action Buttons */}
          <View style={styles.headerRight}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: pressed
                    ? colors.primaryLight
                    : isDark
                      ? colors.background
                      : '#F1F5F9',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Close chat with ${recipient.name}`}
              accessibilityHint="Closes chat and returns to previous screen"
              hitSlop={8}
            >
              <Ionicons name="close" size={22} color={colors.nearBlack} />
            </Pressable>
          </View>
        </View>

        {/* Messaging Body */}
        <View
          style={[
            styles.flex,
            styles.responsiveConstraint,
            {
              paddingBottom: bottomInset,
            },
          ]}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={messages.length === 0 ? styles.emptyContainer : styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    {
                      backgroundColor: isDark ? colors.card : colors.primaryLight,
                    },
                  ]}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  <Ionicons
                    name="chatbubbles-outline"
                    size={36}
                    color={colors.primary}
                  />
                </View>
                <AppText style={[styles.emptyTitle, { color: colors.nearBlack }]}>
                  {isStaffDesk ? 'YMCA Staff Support' : `Chat with ${firstName}`}
                </AppText>
                <AppText style={[styles.emptySub, { color: colors.muted }]}>
                  {isStaffDesk
                    ? 'Ask questions about membership, facility hours, program registrations, or YMCA services.'
                    : `Direct line for personal fitness advice, private lesson scheduling, and workout guidance.`}
                </AppText>

                {/* Interactive Quick Prompts */}
                <View style={styles.suggestionsContainer}>
                  <AppText style={[styles.suggestionsHeader, { color: colors.muted }]}>
                    Suggested questions:
                  </AppText>
                  <View style={styles.suggestionsGrid}>
                    {suggestions.map((prompt, idx) => (
                      <Pressable
                        key={idx}
                        onPress={() => handleApplySuggestion(prompt)}
                        style={({ pressed }) => [
                          styles.suggestionChip,
                          {
                            backgroundColor: isDark ? colors.card : '#FFFFFF',
                            borderColor: pressed ? colors.primary : colors.border,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Ask: ${prompt}`}
                        accessibilityHint="Inserts this question into your message box"
                      >
                        <Ionicons
                          name="chatbubble-ellipses-outline"
                          size={14}
                          color={colors.primary}
                        />
                        <AppText
                          style={[styles.suggestionText, { color: colors.nearBlack }]}
                          numberOfLines={2}
                        >
                          {prompt}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            }
            renderItem={({ item }) => {
              const isMine = item.fromId === currentUserId;
              const formattedTime = formatChatTime(item.createdAt);
              const senderLabel = isMine ? 'You' : recipient.name;

              return (
                <View
                  style={[
                    styles.bubbleRow,
                    isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
                  ]}
                  accessible={true}
                  accessibilityRole="text"
                  accessibilityLabel={`${senderLabel} said: ${item.body}. Sent at ${formattedTime}`}
                >
                  <View
                    style={[
                      styles.bubble,
                      isMine
                        ? [styles.bubbleMine, { backgroundColor: colors.primary }]
                        : [
                            styles.bubbleTheirs,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ],
                    ]}
                  >
                    <AppText
                      style={[
                        styles.bubbleText,
                        isMine
                          ? styles.bubbleTextMine
                          : [styles.bubbleTextTheirs, { color: colors.nearBlack }],
                      ]}
                    >
                      {item.body}
                    </AppText>
                    <Text
                      style={[
                        styles.timeText,
                        isMine
                          ? styles.timeMine
                          : [styles.timeTheirs, { color: colors.muted }],
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

          {/* Composer Input Bar */}
          <View
            style={[
              styles.composerBar,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
              },
            ]}
          >
            {keyboardVisible || isFocused ? (
              <Pressable
                onPress={handleDismissKeyboard}
                style={({ pressed }) => [
                  styles.dismissKeyboardBtn,
                  {
                    backgroundColor: pressed
                      ? colors.primaryLight
                      : isDark
                        ? colors.background
                        : '#F1F5F9',
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Put keyboard down"
                accessibilityHint="Dismisses the on-screen keyboard"
                hitSlop={8}
              >
                <Ionicons name="chevron-down" size={20} color={colors.primary} />
              </Pressable>
            ) : null}
            <View style={styles.inputFlex}>
              <TextField
                ref={inputRef}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                value={draft}
                onChangeText={setDraft}
                placeholder={`Message ${firstName}...`}
                style={styles.inputStyle}
                multiline
                accessibilityLabel={`Message draft for ${firstName}`}
                accessibilityHint="Type your message here"
              />
            </View>
            <View style={styles.sendBtnWrap}>
              <PrimaryButton
                title="Send"
                onPress={handleSend}
                disabled={!draft.trim()}
                accessibilityHint="Sends your typed message"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  responsiveConstraint: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  recipientRole: {
    fontSize: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    maxWidth: 420,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySub: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  suggestionsContainer: {
    width: '100%',
    marginTop: spacing.md,
    gap: 8,
  },
  suggestionsHeader: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  suggestionsGrid: {
    gap: 8,
    width: '100%',
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  bubbleRow: {
    marginBottom: 10,
  },
  bubbleRowMine: {
    alignItems: 'flex-end',
  },
  bubbleRowTheirs: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 4,
  },
  bubbleMine: {
    borderBottomRightRadius: 2,
  },
  bubbleTheirs: {
    borderBottomLeftRadius: 2,
    borderWidth: 1,
  },
  bubbleText: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextMine: {
    color: '#FFFFFF',
  },
  bubbleTextTheirs: {},
  timeText: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  timeMine: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  timeTheirs: {},
  composerBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputFlex: {
    flex: 1,
    minWidth: 0,
  },
  inputStyle: {
    minHeight: 44,
    maxHeight: 110,
    paddingVertical: 10,
  },
  sendBtnWrap: {
    alignSelf: 'flex-end',
    minWidth: 68,
    marginBottom: 2,
    flexShrink: 0,
  },
  dismissKeyboardBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    marginRight: 2,
    flexShrink: 0,
  },
});
