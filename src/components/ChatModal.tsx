import { Ionicons } from '@expo/vector-icons';
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

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/context/ThemeContext';
import type { Message, Staff } from '@/domain/types';
import { radii, spacing, typography } from '@/theme/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ChatModalProps = {
  visible: boolean;
  onClose: () => void;
  recipient: Staff | null;
  messages: Message[];
  currentUserId: string;
  onSend: (body: string) => void;
  isAssignedTrainer?: boolean;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

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
  const [draft, setDraft] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const isStaffDesk = recipient?.id === 'staff-desk';
  const firstName = recipient?.name.split(' ')[0] ?? 'YMCA';

  // Listen to keyboard show/hide and track exact mobile keyboard height
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      if (Platform.OS === 'ios') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      if (Platform.OS === 'ios') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  if (!recipient) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Modal Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
            },
          ]}
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
            >
              <Ionicons
                name={isStaffDesk ? 'business' : 'fitness'}
                size={22}
                color={isStaffDesk ? colors.primary : colors.success}
              />
            </View>
            <View style={styles.headerTextWrap}>
              <View style={styles.nameRow}>
                <AppText style={[styles.recipientName, { color: colors.nearBlack }]}>
                  {recipient.name}
                </AppText>
                {isAssignedTrainer ? (
                  <View style={[styles.badgePill, { backgroundColor: colors.primaryLight }]}>
                    <AppText style={[styles.badgeText, { color: colors.primary }]}>
                      PRIMARY
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText style={[styles.recipientRole, { color: colors.muted }]}>
                {recipient.roleLabel}
              </AppText>
            </View>
          </View>

          {/* Header Action Buttons */}
          <View style={styles.headerRight}>
            {/* Close button */}
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
              accessibilityLabel="Close chat"
            >
              <Ionicons name="close" size={20} color={colors.nearBlack} />
            </Pressable>
          </View>
        </View>

        {/* Messaging Body */}
        <View
          style={[
            styles.flex,
            {
              paddingBottom: keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, 16),
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
              </View>
            }
            renderItem={({ item }) => {
              const isMine = item.fromId === currentUserId;
              return (
                <View
                  style={[
                    styles.bubbleRow,
                    isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
                  ]}
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
                    >
                      {formatTime(item.createdAt)}
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
            <View style={styles.inputFlex}>
              <TextField
                value={draft}
                onChangeText={setDraft}
                placeholder={`Message ${firstName}...`}
                style={styles.inputStyle}
                multiline
              />
            </View>
            <View style={styles.sendBtnWrap}>
              <PrimaryButton
                title="Send"
                onPress={handleSend}
                disabled={!draft.trim()}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '700',
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
    gap: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    padding: spacing.xl,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 320,
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
  },
  inputStyle: {
    minHeight: 44,
    maxHeight: 110,
    paddingVertical: 10,
  },
  sendBtnWrap: {
    alignSelf: 'flex-end',
    minWidth: 72,
    marginBottom: 2,
  },
});
