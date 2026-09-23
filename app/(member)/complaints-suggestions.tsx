import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppText } from '@/components/AppText';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import {
  FEEDBACK_CATEGORIES,
  type ComplaintSuggestion,
  type FeedbackCategory,
  type FeedbackStatus,
  type FeedbackType,
} from '@/domain/types';
import { complaintSuggestionRepo } from '@/repositories/complaintSuggestionRepo';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii, typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

function statusBadgeInfo(status: FeedbackStatus) {
  switch (status) {
    case 'under_review':
      return { label: 'UNDER REVIEW', bg: '#EDE9FE', color: '#6D28D9' };
    case 'resolved':
      return { label: 'ADDRESSED', bg: '#DCFCE7', color: '#15803D' };
    default:
      return { label: 'SUBMITTED', bg: '#FEF3C7', color: '#B45309' };
  }
}

export default function MemberComplaintsSuggestionsScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors: tc, isDark } = useTheme();

  const memberId = session?.userId ?? '';

  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
  const [type, setType] = useState<FeedbackType>('suggestion');
  const [category, setCategory] = useState<FeedbackCategory>('facility_cleanliness');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<ComplaintSuggestion[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!memberId || !api) return;
    try {
      setHistoryError(false);
      setLoadingHistory(true);
      const list = await complaintSuggestionRepo.list(api, BRANCH_ID, memberId);
      setSubmissions(list);
    } catch {
      setHistoryError(true);
    } finally {
      setLoadingHistory(false);
    }
  }, [api, memberId]);

  useEffect(() => {
    if (activeTab === 'history') {
      void loadHistory();
    }
  }, [activeTab, loadHistory]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setFormError('Please enter a brief title or summary.');
      return;
    }
    if (!details.trim() || details.trim().length < 10) {
      setFormError('Please provide a bit more detail (at least 10 characters).');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      let memberName: string | undefined;
      let memberEmail: string | undefined;

      if (!isAnonymous && memberId) {
        const mem = await api.getMember(memberId).catch(() => null);
        if (mem) {
          memberName = mem.name;
          memberEmail = mem.email;
        }
      }

      await complaintSuggestionRepo.create(api, {
        type,
        category,
        title: title.trim(),
        details: details.trim(),
        branchId: BRANCH_ID,
        memberId: memberId || undefined,
        memberName,
        memberEmail,
        isAnonymous,
      });

      const kindLabel = type === 'complaint' ? 'Complaint' : 'Suggestion';
      dialog.alert(
        `${kindLabel} Received`,
        `Thank you for helping improve YMCA Silver Spring! Your ${kindLabel.toLowerCase()} has been logged for staff review.${isAnonymous ? ' (Submitted anonymously)' : ''}`,
        [{ text: 'View Submissions', onPress: () => setActiveTab('history') }],
        'checkmark'
      );

      setTitle('');
      setDetails('');
      setIsAnonymous(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle="Member Feedback · Complaints & Suggestions" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Back Navigation */}
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <AppText style={[styles.backText, { color: colors.primary }]}>Back</AppText>
          </Pressable>

          {/* Hero Banner Card */}
          <View style={[styles.heroCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.heroIconBox, { backgroundColor: '#F0F9FF' }]}>
                <Ionicons name="chatbox-ellipses-outline" size={26} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={[styles.heroTitle, { color: tc.text }]}>
                  Your Voice Matters
                </AppText>
                <AppText style={[styles.heroSub, { color: tc.textMuted }]}>
                  Submit facility complaints, class suggestions, or ideas directly to YMCA staff and leadership.
                </AppText>
              </View>
            </View>
          </View>

          {/* Tab Selector */}
          <View style={[styles.tabBar, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <Pressable
              onPress={() => setActiveTab('submit')}
              style={[
                styles.tabBtn,
                activeTab === 'submit' && [
                  styles.tabBtnActive,
                  { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
                ],
              ]}
              accessibilityRole="button"
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={activeTab === 'submit' ? colors.primary : tc.textMuted}
              />
              <AppText
                style={[
                  styles.tabBtnText,
                  {
                    color: activeTab === 'submit' ? colors.primary : tc.textMuted,
                    fontWeight: activeTab === 'submit' ? '800' : '600',
                  },
                ]}
              >
                Submit Feedback
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('history')}
              style={[
                styles.tabBtn,
                activeTab === 'history' && [
                  styles.tabBtnActive,
                  { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
                ],
              ]}
              accessibilityRole="button"
            >
              <Ionicons
                name="file-tray-full-outline"
                size={16}
                color={activeTab === 'history' ? colors.primary : tc.textMuted}
              />
              <AppText
                style={[
                  styles.tabBtnText,
                  {
                    color: activeTab === 'history' ? colors.primary : tc.textMuted,
                    fontWeight: activeTab === 'history' ? '800' : '600',
                  },
                ]}
              >
                My Submissions {submissions.length > 0 ? `(${submissions.length})` : ''}
              </AppText>
            </Pressable>
          </View>

          {/* ========================================== */}
          {/* TAB 1: SUBMIT FEEDBACK */}
          {/* ========================================== */}
          {activeTab === 'submit' ? (
            <View style={[styles.formCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
              {formError ? <ErrorBanner message={formError} /> : null}

              {/* Type Toggle: Suggestion vs Complaint */}
              <AppText style={[styles.sectionLabel, { color: tc.text }]}>Feedback Type</AppText>
              <View style={styles.typeRow}>
                <Pressable
                  onPress={() => setType('suggestion')}
                  style={[
                    styles.typeChip,
                    type === 'suggestion' && styles.typeChipActiveSuggestion,
                  ]}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="bulb"
                    size={18}
                    color={type === 'suggestion' ? '#15803D' : tc.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <AppText
                      style={[
                        styles.typeTitle,
                        { color: type === 'suggestion' ? '#15803D' : tc.text },
                      ]}
                    >
                      Suggestion 💡
                    </AppText>
                    <AppText style={[styles.typeSub, { color: tc.textMuted }]}>
                      An idea or improvement for the branch
                    </AppText>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setType('complaint')}
                  style={[
                    styles.typeChip,
                    type === 'complaint' && styles.typeChipActiveComplaint,
                  ]}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="warning"
                    size={18}
                    color={type === 'complaint' ? colors.scarlet : tc.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <AppText
                      style={[
                        styles.typeTitle,
                        { color: type === 'complaint' ? colors.scarlet : tc.text },
                      ]}
                    >
                      Complaint ⚠️
                    </AppText>
                    <AppText style={[styles.typeSub, { color: tc.textMuted }]}>
                      Report a problem or service concern
                    </AppText>
                  </View>
                </Pressable>
              </View>

              {/* Category Picker */}
              <AppText style={[styles.sectionLabel, { color: tc.text, marginTop: 14 }]}>
                Category
              </AppText>
              <View style={styles.categoryGrid}>
                {FEEDBACK_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setCategory(cat.id)}
                      style={[
                        styles.catChip,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? '#1E293B'
                              : '#EFF6FF'
                            : isDark
                              ? '#0F172A'
                              : '#F8FAFC',
                          borderColor: isSelected ? colors.primary : tc.border,
                        },
                      ]}
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name={cat.icon as any}
                        size={15}
                        color={isSelected ? colors.primary : tc.textMuted}
                      />
                      <AppText
                        style={[
                          styles.catChipText,
                          {
                            color: isSelected ? colors.primary : tc.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {cat.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              {/* Title Field */}
              <View style={{ marginTop: 14 }}>
                <TextField
                  label="Subject / Summary *"
                  placeholder={
                    type === 'suggestion'
                      ? 'e.g. Add weekend evening lap lane times'
                      : 'e.g. Free weight area needs more 20lb dumbbells'
                  }
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Details Field */}
              <View style={{ marginTop: 14 }}>
                <TextField
                  label="Details & Suggestions *"
                  placeholder="Please describe what happened, what could be improved, or where in the facility this applies..."
                  value={details}
                  onChangeText={setDetails}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{ minHeight: 110 }}
                />
              </View>

              {/* Anonymous Toggle */}
              <View style={[styles.anonBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons
                      name={isAnonymous ? 'eye-off' : 'person'}
                      size={16}
                      color={isAnonymous ? colors.muted : colors.primary}
                    />
                    <AppText style={[styles.anonTitle, { color: tc.text }]}>
                      Submit Anonymously
                    </AppText>
                  </View>
                  <AppText style={[styles.anonSub, { color: tc.textMuted }]}>
                    {isAnonymous
                      ? 'Your name and contact details will not be visible to staff.'
                      : 'Staff can see your member name and follow up with a direct response.'}
                  </AppText>
                </View>
                <Switch
                  value={isAnonymous}
                  onValueChange={setIsAnonymous}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Submit Button */}
              <View style={{ marginTop: 16 }}>
                <PrimaryButton
                  title={submitting ? 'Submitting...' : `Submit ${type === 'complaint' ? 'Complaint' : 'Suggestion'}`}
                  onPress={() => void handleSubmit()}
                  loading={submitting}
                />
              </View>
            </View>
          ) : (
            /* ========================================== */
            /* TAB 2: MY SUBMISSIONS */
            /* ========================================== */
            <View style={{ gap: 12 }}>
              {historyError ? <ErrorBanner onRetry={() => void loadHistory()} /> : null}

              {submissions.length === 0 && !loadingHistory ? (
                <View style={[styles.emptyCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
                  <Ionicons name="chatbubbles-outline" size={40} color={colors.muted} />
                  <AppText style={[styles.emptyTitle, { color: tc.text }]}>
                    No Submissions Yet
                  </AppText>
                  <AppText style={[styles.emptySub, { color: tc.textMuted }]}>
                    Any suggestions or complaints you submit will appear here with real-time status and responses from YMCA staff.
                  </AppText>
                  <Pressable
                    onPress={() => setActiveTab('submit')}
                    style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                    accessibilityRole="button"
                  >
                    <AppText style={styles.emptyActionBtnText}>+ Submit Feedback</AppText>
                  </Pressable>
                </View>
              ) : (
                submissions.map((item) => {
                  const badge = statusBadgeInfo(item.status);
                  const isComplaint = item.type === 'complaint';
                  const catObj = FEEDBACK_CATEGORIES.find((c) => c.id === item.category);

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.submissionCard,
                        { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
                      ]}
                    >
                      {/* Top Header */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View
                            style={[
                              styles.typePill,
                              {
                                backgroundColor: isComplaint ? '#FEE2E2' : '#DCFCE7',
                              },
                            ]}
                          >
                            <Ionicons
                              name={isComplaint ? 'warning' : 'bulb'}
                              size={12}
                              color={isComplaint ? colors.scarlet : '#15803D'}
                            />
                            <AppText
                              style={[
                                styles.typePillText,
                                { color: isComplaint ? colors.scarlet : '#15803D' },
                              ]}
                            >
                              {isComplaint ? 'COMPLAINT' : 'SUGGESTION'}
                            </AppText>
                          </View>

                          {catObj ? (
                            <View style={[styles.catPill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                              <AppText style={[styles.catPillText, { color: tc.textMuted }]}>
                                {catObj.label}
                              </AppText>
                            </View>
                          ) : null}
                        </View>

                        {/* Status Badge */}
                        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                          <AppText style={[styles.statusBadgeText, { color: badge.color }]}>
                            {badge.label}
                          </AppText>
                        </View>
                      </View>

                      {/* Title & Details */}
                      <AppText style={[styles.submissionTitle, { color: tc.text }]}>
                        {item.title}
                      </AppText>
                      <AppText style={[styles.submissionDetails, { color: tc.textMuted }]}>
                        {item.details}
                      </AppText>

                      {/* Meta Footer */}
                      <View style={styles.submissionMetaRow}>
                        <AppText style={[styles.submissionDate, { color: tc.textMuted }]}>
                          Submitted {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </AppText>
                        {item.isAnonymous ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="eye-off-outline" size={12} color={tc.textMuted} />
                            <AppText style={[styles.submissionDate, { color: tc.textMuted }]}>
                              Anonymous
                            </AppText>
                          </View>
                        ) : null}
                      </View>

                      {/* Staff Response Box */}
                      {item.staffResponse ? (
                        <View
                          style={[
                            styles.responseBox,
                            {
                              backgroundColor: isDark ? '#064E3B' : '#F0FDF4',
                              borderColor: '#10B981',
                            },
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <AppText style={{ fontSize: 13, fontWeight: '700', color: '#047857' }}>
                              Official YMCA Response
                            </AppText>
                            {item.respondedByStaffName ? (
                              <AppText style={{ fontSize: 11, color: '#065F46' }}>
                                · {item.respondedByStaffName}
                              </AppText>
                            ) : null}
                          </View>
                          <AppText style={{ fontSize: 13, color: isDark ? '#D1FAE5' : '#064E3B', lineHeight: 18 }}>
                            "{item.staffResponse}"
                          </AppText>
                        </View>
                      ) : (
                        <View style={[styles.pendingBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                          <Ionicons name="hourglass-outline" size={14} color={tc.textMuted} />
                          <AppText style={[styles.pendingText, { color: tc.textMuted }]}>
                            Awaiting staff review and response
                          </AppText>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 14,
    ...cardStyle,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  heroSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 6,
  },
  tabBtnActive: {
    ...cardStyle,
  },
  tabBtnText: {
    fontSize: 13,
  },
  formCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 16,
    ...cardStyle,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  typeChipActiveSuggestion: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  typeChipActiveComplaint: {
    borderColor: colors.scarlet,
    backgroundColor: '#FEF2F2',
  },
  typeTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  typeSub: {
    fontSize: 10,
    marginTop: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  textArea: {
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 90,
  },
  anonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: radii.sm,
    marginTop: 12,
  },
  anonTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  anonSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  emptyCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardStyle,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  emptyActionBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.sm,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  submissionCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    ...cardStyle,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  catPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  submissionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  submissionDetails: {
    fontSize: 13,
    lineHeight: 18,
  },
  submissionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  submissionDate: {
    fontSize: 11,
  },
  responseBox: {
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 10,
    marginTop: 4,
  },
  pendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: radii.sm,
    marginTop: 2,
  },
  pendingText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});
