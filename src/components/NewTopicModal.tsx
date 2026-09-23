import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MentionAutocomplete } from '@/components/MentionAutocomplete';
import { TextField } from '@/components/TextField';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import { FORUM_CATEGORIES, type ForumTopicCategory } from '@/domain/types';
import { colors } from '@/theme/colors';

type StaffTagOption = {
  id: string;
  name: string;
  roleLabel: string;
};

const AVAILABLE_STAFF_TAGS: StaffTagOption[] = [
  { id: 'staff-all', name: 'All Staff Desk', roleLabel: 'Front Desk & Operations' },
  { id: 'staff-alex', name: 'Alex Rivera', roleLabel: 'Personal Wellness Trainer' },
  { id: 'staff-sarah', name: 'Sarah Davis', roleLabel: 'Senior Mobility & Aqua' },
  { id: 'staff-desk', name: 'Marcus Taylor', roleLabel: 'Aquatics & Operations Desk' },
  { id: 'staff-admin', name: 'Jane Smith', roleLabel: 'Director' },
];

export type NewTopicModalProps = {
  visible: boolean;
  onClose: () => void;
  canPin?: boolean;
  onSubmit: (data: {
    title: string;
    content: string;
    category: ForumTopicCategory;
    pinned: boolean;
    mentionedStaffIds: string[];
    mentionedStaffNames: string[];
  }) => Promise<void>;
};

export function NewTopicModal({
  visible,
  onClose,
  canPin = false,
  onSubmit,
}: NewTopicModalProps) {
  const insets = useSafeAreaInsets();
  const { colors: tc, isDark } = useTheme();
  const { multiplier } = useAccessibility();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<ForumTopicCategory>('general');
  const [pinned, setPinned] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);
  const contentInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
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
    titleInputRef.current?.blur();
    contentInputRef.current?.blur();
    Keyboard.dismiss();
    setIsFocused(false);
    setKeyboardVisible(false);
    setKeyboardHeight(0);
  };

  const toggleStaffTag = (staff: StaffTagOption) => {
    setSelectedStaffIds((prev) => {
      if (prev.includes(staff.id)) {
        return prev.filter((id) => id !== staff.id);
      }
      return [...prev, staff.id];
    });
  };

  const handlePublish = async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setErrorMsg('Please enter a topic title');
      return;
    }
    if (!trimmedContent) {
      setErrorMsg('Please enter your topic content');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);
    try {
      const mentionedStaffNames = selectedStaffIds.map(
        (id) => AVAILABLE_STAFF_TAGS.find((s) => s.id === id)?.name ?? id
      );

      await onSubmit({
        title: trimmedTitle,
        content: trimmedContent,
        category,
        pinned,
        mentionedStaffIds: selectedStaffIds,
        mentionedStaffNames,
      });

      // Reset form
      setTitle('');
      setContent('');
      setCategory('general');
      setPinned(false);
      setSelectedStaffIds([]);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create topic');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: tc.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: tc.cardBg,
              borderColor: tc.border,
              paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 20) + 4,
              paddingLeft: Math.max(16, insets.left),
              paddingRight: Math.max(16, insets.right),
            },
          ]}
        >
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Cancel new discussion"
          >
            <Text style={[styles.cancelText, { color: tc.textMuted }]}>Cancel</Text>
          </Pressable>

          <Text style={[styles.headerTitle, { color: tc.text }]}>New Discussion</Text>

          {/* Keyboard dismiss or empty placeholder */}
          {keyboardVisible || isFocused ? (
            <Pressable
              onPress={handleDismissKeyboard}
              style={[styles.dismissKeyHeaderBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              accessibilityRole="button"
              accessibilityLabel="Put keyboard down"
            >
              <Ionicons name="chevron-down" size={18} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        {/* Scrollable Form Body */}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                Math.max(insets.bottom, 24) +
                (keyboardVisible ? (keyboardHeight > 0 ? keyboardHeight + 60 : 320) : 40),
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Category Picker */}
          <Text style={[styles.sectionLabel, { color: tc.text }]}>Choose Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips}>
            {FORUM_CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: isSelected ? colors.primary : isDark ? tc.cardBg : '#F1F5F9',
                      borderColor: isSelected ? colors.primary : tc.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={14}
                    color={isSelected ? '#FFFFFF' : cat.color}
                  />
                  <Text style={[styles.catChipText, { color: isSelected ? '#FFFFFF' : tc.text }]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Title Input */}
          <TextField
            ref={titleInputRef}
            label="Topic Title"
            placeholder="e.g. Question about morning lap swimming..."
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />

          {/* @ Staff Mentions Section */}
          <View style={styles.mentionSection}>
            <View style={styles.mentionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="at-circle" size={18} color="#4F46E5" />
                <Text style={[styles.sectionLabel, { color: tc.text, marginBottom: 0 }]}>
                  @ Mention Staff (Optional)
                </Text>
              </View>
              <Text style={styles.mentionHelperText}>Staff will be notified</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.staffChips}>
              {AVAILABLE_STAFF_TAGS.map((staff) => {
                const isTagged = selectedStaffIds.includes(staff.id);
                return (
                  <Pressable
                    key={staff.id}
                    onPress={() => toggleStaffTag(staff)}
                    style={[
                      styles.staffChip,
                      {
                        backgroundColor: isTagged ? '#4F46E5' : isDark ? tc.cardBg : '#EEF2FF',
                        borderColor: isTagged ? '#4338CA' : isDark ? '#3730A3' : '#C7D2FE',
                      },
                    ]}
                  >
                    <Text style={[styles.staffChipAt, { color: isTagged ? '#FFFFFF' : '#4F46E5' }]}>@</Text>
                    <Text style={[styles.staffChipName, { color: isTagged ? '#FFFFFF' : '#312E81' }]}>
                      {staff.name}
                    </Text>
                    {isTagged ? (
                      <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Pin Toggle for Staff/Admin */}
          {canPin ? (
            <View style={[styles.pinBox, { backgroundColor: isDark ? tc.cardBg : '#FEF3C7', borderColor: '#F59E0B' }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="pin" size={16} color="#D97706" />
                  <Text style={[styles.pinTitle, { color: isDark ? tc.text : '#92400E' }]}>
                    Pin to Top of Forum
                  </Text>
                </View>
                <Text style={[styles.pinSubtitle, { color: isDark ? tc.textMuted : '#B45309' }]}>
                  Keep visible at top of community feed
                </Text>
              </View>
              <Switch
                value={pinned}
                onValueChange={setPinned}
                trackColor={{ false: '#E2E8F0', true: '#F59E0B' }}
                thumbColor={pinned ? '#FFFFFF' : '#F4F3F4'}
              />
            </View>
          ) : null}

          {/* Body Content Input */}
          <View style={{ gap: 8 }}>
            <MentionAutocomplete
              text={content}
              onSelect={(cand, newText) => {
                setContent(newText);
                if (!selectedStaffIds.includes(cand.id)) {
                  setSelectedStaffIds((prev) => [...prev, cand.id]);
                }
              }}
            />

            <TextField
              ref={contentInputRef}
              label="Discussion Content"
              placeholder="Share details, ask your question, or start the conversation (type @ to mention)..."
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={{ minHeight: 130 }}
              onFocus={() => {
                setIsFocused(true);
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
              }}
              onBlur={() => setIsFocused(false)}
            />
          </View>

          {/* Publish Action Button */}
          <Pressable
            onPress={() => void handlePublish()}
            disabled={submitting || !title.trim() || !content.trim()}
            style={({ pressed }) => [
              styles.publishBtn,
              {
                backgroundColor: !title.trim() || !content.trim() ? tc.border : colors.primary,
              },
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Publish topic"
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                <Text style={styles.publishBtnText}>Publish Topic</Text>
              </>
            )}
          </Pressable>
        </ScrollView>

        {/* Floating Keyboard Toolbar right above keyboard */}
        {keyboardVisible || isFocused ? (
          <View
            style={[
              styles.floatingKeyboardBar,
              {
                backgroundColor: tc.cardBg,
                borderTopColor: tc.border,
                bottom:
                  keyboardVisible && keyboardHeight > 0
                    ? keyboardHeight
                    : keyboardVisible && Platform.OS === 'android'
                      ? 280
                      : 0,
              },
            ]}
          >
            <Pressable
              onPress={handleDismissKeyboard}
              style={[styles.dismissBarBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              accessibilityRole="button"
              accessibilityLabel="Put keyboard down"
            >
              <Ionicons name="chevron-down" size={18} color={colors.primary} />
              <Text style={[styles.dismissBarBtnText, { color: colors.primary }]}>
                Put Keyboard Down
              </Text>
            </Pressable>
            <Text style={[styles.toolbarCharCount, { color: tc.textMuted }]}>
              {content.length} characters
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  dismissKeyHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '600',
    flex: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  categoryChips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  mentionSection: {
    gap: 8,
    marginTop: 4,
  },
  mentionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mentionHelperText: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '600',
  },
  staffChips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  staffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  staffChipAt: {
    fontSize: 13,
    fontWeight: '800',
  },
  staffChipName: {
    fontSize: 12,
    fontWeight: '700',
  },
  pinBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  pinTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  pinSubtitle: {
    fontSize: 11,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 120,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  floatingKeyboardBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 6,
  },
  dismissBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dismissBarBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  toolbarCharCount: {
    fontSize: 12,
    fontWeight: '500',
  },
});
