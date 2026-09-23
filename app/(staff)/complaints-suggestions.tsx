import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  type Staff,
} from '@/domain/types';
import { complaintSuggestionRepo } from '@/repositories/complaintSuggestionRepo';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii, typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

function statusBadge(status: FeedbackStatus) {
  switch (status) {
    case 'under_review':
      return { label: 'UNDER REVIEW', bg: '#EDE9FE', color: '#6D28D9' };
    case 'resolved':
      return { label: 'RESOLVED', bg: '#DCFCE7', color: '#15803D' };
    default:
      return { label: 'SUBMITTED', bg: '#FEF3C7', color: '#B45309' };
  }
}

export default function StaffComplaintsSuggestionsScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors: tc, isDark } = useTheme();

  const staffId = session?.userId ?? '';

  const [staff, setStaff] = useState<Staff | null>(null);
  const [items, setItems] = useState<ComplaintSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | FeedbackType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all');
  const [query, setQuery] = useState('');

  // Response Modal
  const [respondingItem, setRespondingItem] = useState<ComplaintSuggestion | null>(null);
  const [responseText, setResponseText] = useState('');
  const [nextStatus, setNextStatus] = useState<FeedbackStatus>('under_review');
  const [savingResponse, setSavingResponse] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!api) return;
    try {
      setError(false);
      setLoading(true);
      const [list, staffProfile] = await Promise.all([
        complaintSuggestionRepo.list(api, BRANCH_ID),
        staffId ? api.getStaff(staffId).catch(() => null) : null,
      ]);
      setItems(list);
      if (staffProfile) setStaff(staffProfile);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api, staffId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (typeFilter !== 'all') {
      result = result.filter((item) => item.type === typeFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter((item) => item.status === statusFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.details.toLowerCase().includes(q) ||
          (item.memberName && item.memberName.toLowerCase().includes(q)) ||
          item.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, typeFilter, statusFilter, query]);

  const stats = useMemo(() => {
    const total = items.length;
    const complaints = items.filter((i) => i.type === 'complaint').length;
    const suggestions = items.filter((i) => i.type === 'suggestion').length;
    const open = items.filter((i) => i.status !== 'resolved').length;
    return { total, complaints, suggestions, open };
  }, [items]);

  const openResponseModal = (item: ComplaintSuggestion) => {
    setRespondingItem(item);
    setResponseText(item.staffResponse || '');
    setNextStatus(item.status === 'submitted' ? 'under_review' : item.status);
    setResponseError(null);
  };

  const handleSaveResponse = async () => {
    if (!respondingItem || !api) return;
    if (!responseText.trim()) {
      setResponseError('Please enter a response message for the member.');
      return;
    }

    setSavingResponse(true);
    setResponseError(null);

    try {
      const responderName = staff
        ? `${staff.name} (${staff.roleLabel || 'Staff'})`
        : 'YMCA Staff Team';

      await complaintSuggestionRepo.updateStatus(
        api,
        respondingItem.id,
        nextStatus,
        responseText.trim(),
        staffId,
        responderName
      );

      dialog.alert(
        'Response Recorded',
        'Your official response has been saved and is now visible to the member.',
        [{ text: 'OK' }],
        'checkmark'
      );

      setRespondingItem(null);
      await loadData();
    } catch (err: any) {
      setResponseError(err?.message || 'Could not save response.');
    } finally {
      setSavingResponse(false);
    }
  };

  const handleQuickStatusChange = async (item: ComplaintSuggestion, status: FeedbackStatus) => {
    if (!api) return;
    try {
      const responderName = staff
        ? `${staff.name} (${staff.roleLabel || 'Staff'})`
        : 'YMCA Staff Team';

      await complaintSuggestionRepo.updateStatus(
        api,
        item.id,
        status,
        item.staffResponse,
        staffId,
        responderName
      );

      dialog.alert(
        'Status Updated',
        `Item marked as ${status.replace('_', ' ').toUpperCase()}.`,
        [{ text: 'OK' }],
        'checkmark'
      );

      await loadData();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not update status.');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle="Staff Portal · Complaints & Suggestions" />

      {error ? <ErrorBanner onRetry={() => void loadData()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back Link */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Back to Staff Dashboard</Text>
        </Pressable>

        {/* Overview Stats Card */}
        <View style={[styles.overviewCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Ionicons name="chatbubbles" size={24} color={colors.primary} />
            <View>
              <Text style={[styles.overviewTitle, { color: tc.text }]}>
                Member Voice & Feedback Hub
              </Text>
              <Text style={[styles.overviewSub, { color: tc.textMuted }]}>
                Review member suggestions, investigate facility complaints, and post official responses.
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{stats.total}</Text>
              <Text style={[styles.statLabel, { color: tc.textMuted }]}>Total Submissions</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <Text style={[styles.statNum, { color: '#B45309' }]}>{stats.open}</Text>
              <Text style={[styles.statLabel, { color: tc.textMuted }]}>Pending Action</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <Text style={[styles.statNum, { color: colors.scarlet }]}>{stats.complaints}</Text>
              <Text style={[styles.statLabel, { color: tc.textMuted }]}>Complaints ⚠️</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <Text style={[styles.statNum, { color: '#15803D' }]}>{stats.suggestions}</Text>
              <Text style={[styles.statLabel, { color: tc.textMuted }]}>Suggestions 💡</Text>
            </View>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterSection}>
          {/* Type Filter */}
          <View style={styles.filterRow}>
            {[
              { key: 'all', label: 'All Types' },
              { key: 'complaint', label: 'Complaints ⚠️' },
              { key: 'suggestion', label: 'Suggestions 💡' },
            ].map((f) => {
              const active = typeFilter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setTypeFilter(f.key as any)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? colors.primary : tc.cardBg,
                      borderColor: active ? colors.primary : tc.border,
                    },
                  ]}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: active ? '#FFFFFF' : tc.text, fontWeight: active ? '700' : '500' },
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Status Filter */}
          <View style={styles.filterRow}>
            {[
              { key: 'all', label: 'All Statuses' },
              { key: 'submitted', label: 'Open' },
              { key: 'under_review', label: 'Under Review' },
              { key: 'resolved', label: 'Resolved' },
            ].map((f) => {
              const active = statusFilter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setStatusFilter(f.key as any)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? (isDark ? '#334155' : '#0F172A') : tc.cardBg,
                      borderColor: active ? (isDark ? '#334155' : '#0F172A') : tc.border,
                    },
                  ]}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: active ? '#FFFFFF' : tc.text, fontWeight: active ? '700' : '500' },
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Search */}
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Search by title, details, member, category..."
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Submissions List */}
        <Text style={[styles.sectionTitle, { color: tc.text }]}>
          Feedback Submissions ({filteredItems.length})
        </Text>

        {filteredItems.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <Ionicons name="folder-open-outline" size={36} color={colors.muted} />
            <Text style={[styles.emptyText, { color: tc.textMuted }]}>
              No complaints or suggestions match the selected criteria.
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => {
            const isComplaint = item.type === 'complaint';
            const badge = statusBadge(item.status);
            const catObj = FEEDBACK_CATEGORIES.find((c) => c.id === item.category);

            return (
              <View
                key={item.id}
                style={[styles.itemCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}
              >
                {/* Header Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: isComplaint ? '#FEE2E2' : '#DCFCE7' },
                      ]}
                    >
                      <Ionicons
                        name={isComplaint ? 'warning' : 'bulb'}
                        size={12}
                        color={isComplaint ? colors.scarlet : '#15803D'}
                      />
                      <Text
                        style={[
                          styles.typeBadgeText,
                          { color: isComplaint ? colors.scarlet : '#15803D' },
                        ]}
                      >
                        {isComplaint ? 'COMPLAINT' : 'SUGGESTION'}
                      </Text>
                    </View>

                    {catObj ? (
                      <View style={[styles.catBadge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <Text style={[styles.catBadgeText, { color: tc.textMuted }]}>
                          {catObj.label}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={[styles.statusBadgeBox, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                {/* Submitter Info */}
                <View style={styles.submitterRow}>
                  {item.isAnonymous ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="eye-off" size={14} color={tc.textMuted} />
                      <Text style={[styles.submitterName, { color: tc.textMuted }]}>
                        Anonymous Member
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="person-circle" size={16} color={colors.primary} />
                      <Text style={[styles.submitterName, { color: tc.text }]}>
                        {item.memberName || 'YMCA Member'}
                      </Text>
                      {item.memberEmail ? (
                        <Text style={[styles.submitterEmail, { color: tc.textMuted }]}>
                          ({item.memberEmail})
                        </Text>
                      ) : null}
                    </View>
                  )}
                  <Text style={[styles.timestamp, { color: tc.textMuted }]}>
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                {/* Title & Body */}
                <Text style={[styles.itemTitle, { color: tc.text }]}>{item.title}</Text>
                <Text style={[styles.itemDetails, { color: tc.text }]}>{item.details}</Text>

                {/* Existing Response Display */}
                {item.staffResponse ? (
                  <View
                    style={[
                      styles.responsePreview,
                      {
                        backgroundColor: isDark ? '#064E3B' : '#F0FDF4',
                        borderColor: '#10B981',
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#047857' }}>
                        Staff Response
                      </Text>
                      {item.respondedByStaffName ? (
                        <Text style={{ fontSize: 11, color: '#065F46' }}>
                          by {item.respondedByStaffName}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 13, color: isDark ? '#D1FAE5' : '#064E3B', lineHeight: 18 }}>
                      "{item.staffResponse}"
                    </Text>
                  </View>
                ) : null}

                {/* Staff Actions Bar */}
                <View style={styles.actionRow}>
                  {item.status === 'submitted' ? (
                    <Pressable
                      onPress={() => void handleQuickStatusChange(item, 'under_review')}
                      style={[styles.actionBtnSecondary, { borderColor: tc.border }]}
                      accessibilityRole="button"
                    >
                      <Ionicons name="time-outline" size={14} color="#6D28D9" />
                      <Text style={[styles.actionBtnText, { color: '#6D28D9' }]}>
                        Under Review
                      </Text>
                    </Pressable>
                  ) : null}

                  {item.status !== 'resolved' ? (
                    <Pressable
                      onPress={() => void handleQuickStatusChange(item, 'resolved')}
                      style={[styles.actionBtnSecondary, { borderColor: tc.border }]}
                      accessibilityRole="button"
                    >
                      <Ionicons name="checkmark" size={14} color="#15803D" />
                      <Text style={[styles.actionBtnText, { color: '#15803D' }]}>
                        Mark Resolved
                      </Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    onPress={() => openResponseModal(item)}
                    style={[styles.actionBtnPrimary, { backgroundColor: colors.primary }]}
                    accessibilityRole="button"
                  >
                    <Ionicons name="chatbubble-ellipses" size={14} color="#FFFFFF" />
                    <Text style={styles.actionBtnPrimaryText}>
                      {item.staffResponse ? 'Edit Response' : 'Reply to Member'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ========================================== */}
      {/* MODAL: STAFF RESPONSE & RESOLUTION */}
      {/* ========================================== */}
      <Modal
        visible={respondingItem != null}
        animationType="slide"
        transparent
        onRequestClose={() => setRespondingItem(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalBox, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.modalTitle, { color: tc.text }]}>
                  Respond to {respondingItem?.type === 'complaint' ? 'Complaint' : 'Suggestion'}
                </Text>
                <Text style={[styles.modalSub, { color: tc.textMuted }]} numberOfLines={1}>
                  "{respondingItem?.title}"
                </Text>
              </View>
              <Pressable onPress={() => setRespondingItem(null)} hitSlop={10}>
                <Ionicons name="close" size={24} color={tc.text} />
              </Pressable>
            </View>

            {responseError ? <ErrorBanner message={responseError} /> : null}

            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 12 }}>
              {/* Member context */}
              <View style={[styles.contextBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                <Text style={[styles.contextLabel, { color: tc.textMuted }]}>
                  Submitted by:{' '}
                  <Text style={{ fontWeight: '700', color: tc.text }}>
                    {respondingItem?.isAnonymous
                      ? 'Anonymous Member'
                      : `${respondingItem?.memberName || 'Member'} (${respondingItem?.memberEmail || 'N/A'})`}
                  </Text>
                </Text>
                <Text style={[styles.contextDetails, { color: tc.text }]}>
                  "{respondingItem?.details}"
                </Text>
              </View>

              {/* Status Picker */}
              <Text style={[styles.fieldLabel, { color: tc.text }]}>Updated Status</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { key: 'under_review', label: 'Under Review' },
                  { key: 'resolved', label: 'Resolved / Addressed' },
                ].map((s) => {
                  const isSelected = nextStatus === s.key;
                  return (
                    <Pressable
                      key={s.key}
                      onPress={() => setNextStatus(s.key as FeedbackStatus)}
                      style={[
                        styles.statusPickChip,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : isDark
                              ? '#1E293B'
                              : '#F1F5F9',
                          borderColor: isSelected ? colors.primary : tc.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPickText,
                          {
                            color: isSelected ? '#FFFFFF' : tc.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Staff Response Text */}
              <View style={{ marginTop: 10 }}>
                <TextField
                  label="Official Staff Response *"
                  placeholder="Write an official message informing the member about steps taken, resolution, or next actions..."
                  value={responseText}
                  onChangeText={setResponseText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{ minHeight: 110 }}
                />
              </View>

              <View style={{ marginTop: 8 }}>
                <PrimaryButton
                  title="Save & Publish Response"
                  onPress={() => void handleSaveResponse()}
                  loading={savingResponse}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  overviewCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 14,
    ...cardStyle,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  overviewSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radii.sm,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  filterSection: {
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  emptyCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardStyle,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  itemCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    ...cardStyle,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  catBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadgeBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  submitterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  submitterName: {
    fontSize: 12,
    fontWeight: '700',
  },
  submitterEmail: {
    fontSize: 11,
  },
  timestamp: {
    fontSize: 11,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  itemDetails: {
    fontSize: 13,
    lineHeight: 18,
  },
  responsePreview: {
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 10,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    padding: 18,
    ...cardStyle,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  contextBox: {
    padding: 10,
    borderRadius: radii.sm,
  },
  contextLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  contextDetails: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusPickChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  statusPickText: {
    fontSize: 12,
  },
  responseInput: {
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 90,
  },
});
