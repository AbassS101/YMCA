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
import {
  containsProfanity,
  filterProfanity,
  FORUM_CATEGORIES,
  type ForumTopicCategory,
} from '@/domain/types';
import { colors } from '@/theme/colors';

type StaffTagOption = {
  id: string;
  name: string;
  roleLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const AVAILABLE_STAFF_TAGS: StaffTagOption[] = [
  { id: 'staff-all', name: 'All Staff Desk', roleLabel: 'Operations & Welcome Desk', icon: 'business' },
  { id: 'staff-alex', name: 'Doc', roleLabel: 'Personal Wellness Trainer', icon: 'barbell' },
  { id: 'staff-sarah', name: 'Jane Doe', roleLabel: 'Senior Mobility & Aqua Coach', icon: 'water' },
  { id: 'staff-celine', name: 'Celine', roleLabel: 'Wellness Director (Incharge of PT)', icon: 'fitness' },
  { id: 'staff-desk', name: 'Billy Deveaux', roleLabel: 'Membership Director', icon: 'people' },
  { id: 'staff-admin', name: 'David', roleLabel: 'Staff Admin & Branch Director', icon: 'shield-checkmark' },
];

type TopicTemplate = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: ForumTopicCategory;
  defaultStaffId?: string;
  titleSuggestion: string;
  bodySuggestion: string;
};

const TOPIC_TEMPLATES: TopicTemplate[] = [
  {
    id: 'ask_staff',
    label: 'Ask Staff Desk',
    icon: 'help-circle-outline',
    category: 'general',
    defaultStaffId: 'staff-all',
    titleSuggestion: 'Question for Front Desk: ',
    bodySuggestion: 'Hi YMCA team, I had a question regarding facility hours and policies: ',
  },
  {
    id: 'workout_tip',
    label: 'Workout & Form Advice',
    icon: 'barbell-outline',
    category: 'fitness',
    defaultStaffId: 'staff-alex',
    titleSuggestion: '@Alex Rivera Form advice on ',
    bodySuggestion: 'Hey Alex, looking for suggestions or warm-up routines for ',
  },
  {
    id: 'pool_question',
    label: 'Pool & Lap Swimming',
    icon: 'water-outline',
    category: 'swim',
    defaultStaffId: 'staff-desk',
    titleSuggestion: '@Marcus Taylor Question about lap pool: ',
    bodySuggestion: 'Hi Marcus, checking on the pool temperatures and lane availability for ',
  },
  {
    id: 'find_partner',
    label: 'Find Workout Partner',
    icon: 'people-outline',
    category: 'community',
    titleSuggestion: 'Looking for partner / group for ',
    bodySuggestion: 'Looking for fellow members to join me for morning sessions at Silver Spring! Details: ',
  },
];

export type NewTopicModalProps = {
  visible: boolean;
  onClose: () => void;
  canPin?: boolean;
  initialTemplateId?: string;
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
  initialTemplateId,
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
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);
  const contentInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (initialTemplateId && visible) {
      applyTemplate(initialTemplateId);
    }
  }, [initialTemplateId, visible]);

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

  const applyTemplate = (templateId: string) => {
    const tmpl = TOPIC_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;
    setActiveTemplate(tmpl.id);
    setCategory(tmpl.category);
    setTitle(tmpl.titleSuggestion);
    setContent(tmpl.bodySuggestion);
    if (tmpl.defaultStaffId && !selectedStaffIds.includes(tmpl.defaultStaffId)) {
      setSelectedStaffIds([tmpl.defaultStaffId]);
    }
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
      setErrorMsg('Please enter a discussion title.');
      return;
    }
    if (!trimmedContent) {
      setErrorMsg('Please enter your discussion details or question.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);
    try {
      const mentionedStaffNames = selectedStaffIds.map(
        (id) => AVAILABLE_STAFF_TAGS.find((s) => s.id === id)?.name ?? id
      );

      await onSubmit({
        title: filterProfanity(trimmedTitle),
        content: filterProfanity(trimmedContent),
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
      setActiveTemplate(null);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to publish topic.');
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
              paddingTop: 10,
              paddingBottom: 10,
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

          {/* Keyboard dismiss or Submit pill */}
          <Pressable
            onPress={() => void handlePublish()}
            disabled={submitting || !title.trim() || !content.trim()}
            style={[
              styles.headerPublishBtn,
              {
                backgroundColor: !title.trim() || !content.trim() ? tc.border : colors.primary,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Publish discussion"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.headerPublishBtnText}>Post</Text>
            )}
          </Pressable>
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
                (keyboardVisible ? (keyboardHeight > 0 ? keyboardHeight + 60 : 320) : 60),
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

          {/* Quick Starter Templates */}
          <View style={styles.templateSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="flash-outline" size={15} color={colors.primary} />
              <Text style={[styles.sectionLabel, { color: tc.text }]}>
                Quick Starter Templates (Optional)
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.templateChips}
            >
              {TOPIC_TEMPLATES.map((tmpl) => {
                const isSelected = activeTemplate === tmpl.id;
                return (
                  <Pressable
                    key={tmpl.id}
                    onPress={() => applyTemplate(tmpl.id)}
                    style={[
                      styles.templateChip,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? '#0C2A4A'
                            : '#EFF6FF'
                          : isDark
                            ? tc.cardBg
                            : '#FFFFFF',
                        borderColor: isSelected ? colors.primary : tc.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={tmpl.icon}
                      size={14}
                      color={isSelected ? colors.primary : tc.textMuted}
                    />
                    <Text
                      style={[
                        styles.templateChipText,
                        { color: isSelected ? colors.primary : tc.text },
                      ]}
                    >
                      {tmpl.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Category Picker */}
          <View style={styles.formSection}>
            <Text style={[styles.sectionLabel, { color: tc.text }]}>Select Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryChips}
            >
              {FORUM_CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      setCategory(cat.id);
                      setActiveTemplate(null);
                    }}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : isDark
                            ? tc.cardBg
                            : '#FFFFFF',
                        borderColor: isSelected ? colors.primary : tc.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={14}
                      color={isSelected ? '#FFFFFF' : cat.color}
                    />
                    <Text
                      style={[
                        styles.catChipText,
                        { color: isSelected ? '#FFFFFF' : tc.text },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Title Input */}
          <TextField
            ref={titleInputRef}
            label="Topic Title"
            placeholder="e.g. Question about morning lap swimming schedule..."
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
                <Ionicons name="at-circle" size={17} color={colors.primary} />
                <Text style={[styles.sectionLabel, { color: tc.text, marginBottom: 0 }]}>
                  Tag Staff or Trainers
                </Text>
              </View>
              <Text style={[styles.mentionHelperText, { color: tc.textMuted }]}>
                Tagged staff receive alerts
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.staffChips}
            >
              {AVAILABLE_STAFF_TAGS.map((staff) => {
                const isTagged = selectedStaffIds.includes(staff.id);
                return (
                  <Pressable
                    key={staff.id}
                    onPress={() => toggleStaffTag(staff)}
                    style={[
                      styles.staffChip,
                      {
                        backgroundColor: isTagged
                          ? colors.primary
                          : isDark
                            ? tc.cardBg
                            : '#FFFFFF',
                        borderColor: isTagged ? colors.primary : tc.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isTagged ? 'checkmark-circle' : staff.icon}
                      size={14}
                      color={isTagged ? '#FFFFFF' : colors.primary}
                    />
                    <Text
                      style={[
                        styles.staffChipName,
                        { color: isTagged ? '#FFFFFF' : tc.text },
                      ]}
                    >
                      {staff.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Pin Toggle for Staff/Admin */}
          {canPin ? (
            <View
              style={[
                styles.pinBox,
                {
                  backgroundColor: isDark ? '#2E2211' : '#FEF3C7',
                  borderColor: isDark ? '#78350F' : '#FDE68A',
                },
              ]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="pin" size={16} color="#D97706" />
                  <Text style={[styles.pinTitle, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                    Pin to Top of Feed
                  </Text>
                </View>
                <Text style={[styles.pinSubtitle, { color: isDark ? '#FCD34D' : '#B45309' }]}>
                  Staff priority announcement
                </Text>
              </View>
              <Switch
                value={pinned}
                onValueChange={setPinned}
                trackColor={{ false: '#E2E8F0', true: '#D97706' }}
                thumbColor={pinned ? '#FFFFFF' : '#F4F3F4'}
              />
            </View>
          ) : null}

          {/* Discussion Content */}
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
              label="Discussion Details & Questions"
              placeholder="Share details, ask questions, or coordinate with members (type @ to tag)..."
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

          {containsProfanity(title) || containsProfanity(content) ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: isDark ? '#3B2F0C' : '#FFFBEB',
                borderWidth: 1,
                borderColor: isDark ? '#B45309' : '#FDE68A',
              }}
            >
              <Ionicons name="shield-checkmark" size={15} color="#D97706" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#FDE68A' : '#92400E', flex: 1 }}>
                Family-friendly filter active: profanity will be automatically masked (***) when posted.
              </Text>
            </View>
          ) : null}

          {/* Big Publish Button */}
          <Pressable
            onPress={() => void handlePublish()}
            disabled={submitting || !title.trim() || !content.trim()}
            style={({ pressed }) => [
              styles.publishBtn,
              {
                backgroundColor:
                  !title.trim() || !content.trim() ? tc.border : colors.primary,
              },
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Publish discussion topic"
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={17} color="#FFFFFF" />
                <Text style={styles.publishBtnText}>Publish Discussion</Text>
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
                      : Math.max(insets.bottom, 10),
              },
            ]}
          >
            <View style={styles.keyboardBarLeft}>
              <Text style={[styles.keyboardBarHelper, { color: tc.textMuted }]}>
                {title.length}/100 • {content.length} chars
              </Text>
            </View>
            <Pressable
              onPress={handleDismissKeyboard}
              style={[
                styles.floatingDismissBtn,
                { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Dismiss keyboard"
            >
              <Ionicons name="chevron-down" size={16} color={colors.primary} />
              <Text style={[styles.floatingDismissText, { color: colors.primary }]}>Done</Text>
            </Pressable>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerPublishBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
  },
  headerPublishBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  templateSection: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  templateChips: {
    gap: 8,
    paddingVertical: 4,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  templateChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  formSection: {
    gap: 8,
  },
  categoryChips: {
    gap: 8,
    paddingVertical: 4,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  mentionSection: {
    gap: 8,
  },
  mentionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mentionHelperText: {
    fontSize: 11,
    fontWeight: '500',
  },
  staffChips: {
    gap: 8,
    paddingVertical: 4,
  },
  staffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
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
    borderRadius: 12,
    borderWidth: 1,
  },
  pinTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  pinSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  floatingKeyboardBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    zIndex: 999,
  },
  keyboardBarLeft: {
    flex: 1,
  },
  keyboardBarHelper: {
    fontSize: 12,
    fontWeight: '600',
  },
  floatingDismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  floatingDismissText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
