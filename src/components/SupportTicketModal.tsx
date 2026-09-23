import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useAccessibility } from '@/context/AccessibilityContext';
import { dialog } from '@/context/DialogContext';
import { useTheme } from '@/context/ThemeContext';
import type {
  Staff,
  SupportTicket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketType,
  UserRole,
} from '@/domain/types';
import { supportTicketRepo } from '@/repositories/supportTicketRepo';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii, typography } from '@/theme/typography';

const PROBLEM_CATEGORIES: { id: TicketCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'app_bug', label: 'App Bug / Crash', icon: 'bug-outline' },
  { id: 'account_access', label: 'Login & Access', icon: 'key-outline' },
  { id: 'schedule_booking', label: 'Class Booking / Sync', icon: 'calendar-outline' },
  { id: 'facility_tech', label: 'Facility WiFi / Tech', icon: 'wifi-outline' },
  { id: 'billing_membership', label: 'Billing & Plan Issue', icon: 'card-outline' },
  { id: 'other', label: 'Other Issue', icon: 'help-circle-outline' },
];

const FEATURE_CATEGORIES: { id: TicketCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'feature_idea', label: 'New Feature Idea', icon: 'bulb-outline' },
  { id: 'schedule_booking', label: 'Class & Schedule Features', icon: 'calendar-outline' },
  { id: 'other', label: 'UI & Accessibility Idea', icon: 'color-palette-outline' },
  { id: 'facility_tech', label: 'Facility Kiosk / Check-in', icon: 'barcode-outline' },
];

const PRIORITY_OPTIONS: { id: TicketPriority; label: string; color: string; bg: string }[] = [
  { id: 'normal', label: 'Normal', color: '#0284C7', bg: '#E0F2FE' },
  { id: 'high', label: 'High', color: '#D97706', bg: '#FEF3C7' },
  { id: 'urgent', label: 'Urgent', color: '#DC2626', bg: '#FEE2E2' },
];

export type SupportTicketModalProps = {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole | string;
  api: any;
  initialType?: TicketType;
  onOpenITChat: (itStaff: Staff, threadId: string) => void;
};

function statusBadge(status: TicketStatus) {
  switch (status) {
    case 'in_progress':
      return { label: 'IN REVIEW', bg: '#EDE9FE', text: '#6D28D9' };
    case 'resolved':
      return { label: 'RESOLVED', bg: '#DCFCE7', text: '#15803D' };
    default:
      return { label: 'OPEN', bg: '#FEF3C7', text: '#B45309' };
  }
}

export function SupportTicketModal({
  visible,
  onClose,
  userId,
  userName,
  userEmail,
  userRole,
  api,
  initialType = 'problem_report',
  onOpenITChat,
}: SupportTicketModalProps) {
  const insets = useSafeAreaInsets();
  const { colors: tc, isDark, themeMode } = useTheme();
  const { textScale, multiplier } = useAccessibility();

  const [tab, setTab] = useState<'create' | 'history'>('create');
  const [type, setType] = useState<TicketType>(initialType);
  const [category, setCategory] = useState<TicketCategory>('app_bug');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);

  // Sync initial type if passed
  useEffect(() => {
    if (visible) {
      setType(initialType);
      setCategory(initialType === 'feature_request' ? 'feature_idea' : 'app_bug');
      void loadHistory();
    }
  }, [visible, initialType]);

  const loadHistory = async () => {
    if (!api || !userId) return;
    setLoadingHistory(true);
    try {
      const list = await supportTicketRepo.listUserTickets(api, userId);
      setUserTickets(list);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  const activeCategories = type === 'feature_request' ? FEATURE_CATEGORIES : PROBLEM_CATEGORIES;

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (!trimmedTitle) {
      dialog.alert('Required Field', 'Please enter a title for your ticket.');
      return;
    }
    if (!trimmedDesc) {
      dialog.alert('Required Field', 'Please provide details or description.');
      return;
    }

    setSubmitting(true);
    try {
      const deviceInfo = `${Platform.OS.toUpperCase()} · Theme: ${themeMode} · Text Size: ${textScale}`;

      const { ticket, thread } = await supportTicketRepo.createTicket(api, {
        userId,
        userName,
        userEmail,
        userRole,
        type,
        title: trimmedTitle,
        description: trimmedDesc,
        category,
        priority,
        deviceInfo,
      });

      // Clear inputs
      setTitle('');
      setDescription('');
      onClose();

      // Fetch IT Staff object to open chat
      const itStaff = await api.getStaff('staff-itadmin');

      dialog.alert(
        'Ticket Created & Chat Opened!',
        `Your ticket #${ticket.ticketNumber} has been logged. We've opened a direct support thread with David Miller from YMCA IT Systems.`,
        [
          {
            text: 'Open IT Chat',
            onPress: () => {
              onOpenITChat(itStaff, thread.id);
            },
          },
        ],
        'checkmark'
      );
    } catch {
      dialog.alert('Error', 'Could not create support ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenExistingChat = async (ticket: SupportTicket) => {
    onClose();
    try {
      const itStaff = await api.getStaff('staff-itadmin');
      onOpenITChat(itStaff, ticket.threadId);
    } catch {
      dialog.alert('Error', 'Could not open IT chat for this ticket.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: tc.cardBg,
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Top Bar */}
          <View style={[styles.header, { borderBottomColor: tc.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="construct" size={20} color={colors.primary} />
              </View>
              <View>
                <AppText style={[styles.headerTitle, { color: tc.text }]}>
                  YMCA Help & IT Support
                </AppText>
                <AppText style={[styles.headerSubtitle, { color: tc.textMuted }]}>
                  Feature requests, app problem reports & live IT chat
                </AppText>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              accessibilityRole="button"
              accessibilityLabel="Close support modal"
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color={tc.text} />
            </Pressable>
          </View>

          {/* Navigation Tabs (New Ticket vs Ticket History) */}
          <View style={[styles.tabBar, { borderBottomColor: tc.border }]}>
            <Pressable
              onPress={() => setTab('create')}
              style={[
                styles.tabBtn,
                tab === 'create' && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
              ]}
              accessibilityRole="button"
            >
              <Ionicons
                name="add-circle-outline"
                size={16}
                color={tab === 'create' ? colors.primary : tc.textMuted}
              />
              <AppText
                style={[
                  styles.tabBtnText,
                  {
                    color: tab === 'create' ? colors.primary : tc.textMuted,
                    fontWeight: tab === 'create' ? '700' : '600',
                  },
                ]}
              >
                Log New Ticket
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => setTab('history')}
              style={[
                styles.tabBtn,
                tab === 'history' && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
              ]}
              accessibilityRole="button"
            >
              <Ionicons
                name="file-tray-full-outline"
                size={16}
                color={tab === 'history' ? colors.primary : tc.textMuted}
              />
              <AppText
                style={[
                  styles.tabBtnText,
                  {
                    color: tab === 'history' ? colors.primary : tc.textMuted,
                    fontWeight: tab === 'history' ? '700' : '600',
                  },
                ]}
              >
                My Tickets ({userTickets.length})
              </AppText>
            </Pressable>
          </View>

          {tab === 'create' ? (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Type Switcher: Feature Request vs Problem Report */}
              <View style={styles.section}>
                <AppText style={[styles.sectionLabel, { color: tc.text }]}>
                  What would you like to submit?
                </AppText>
                <View style={styles.typeSelectorRow}>
                  <Pressable
                    onPress={() => {
                      setType('problem_report');
                      setCategory('app_bug');
                    }}
                    style={[
                      styles.typeCard,
                      {
                        backgroundColor:
                          type === 'problem_report'
                            ? isDark
                              ? '#311014'
                              : '#FEF2F2'
                            : isDark
                              ? '#1E293B'
                              : '#F8FAFC',
                        borderColor: type === 'problem_report' ? colors.scarlet : tc.border,
                      },
                    ]}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="warning-outline"
                      size={20}
                      color={type === 'problem_report' ? colors.scarlet : tc.textMuted}
                    />
                    <View style={{ flex: 1 }}>
                      <AppText
                        style={[
                          styles.typeCardTitle,
                          { color: type === 'problem_report' ? colors.scarlet : tc.text },
                        ]}
                      >
                        Report a Problem
                      </AppText>
                      <AppText style={[styles.typeCardDesc, { color: tc.textMuted }]}>
                        Bug, crash, login error, or facility tech issue
                      </AppText>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setType('feature_request');
                      setCategory('feature_idea');
                    }}
                    style={[
                      styles.typeCard,
                      {
                        backgroundColor:
                          type === 'feature_request'
                            ? isDark
                              ? '#132A1C'
                              : '#F0FDF4'
                            : isDark
                              ? '#1E293B'
                              : '#F8FAFC',
                        borderColor: type === 'feature_request' ? '#16A34A' : tc.border,
                      },
                    ]}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="bulb-outline"
                      size={20}
                      color={type === 'feature_request' ? '#16A34A' : tc.textMuted}
                    />
                    <View style={{ flex: 1 }}>
                      <AppText
                        style={[
                          styles.typeCardTitle,
                          { color: type === 'feature_request' ? '#16A34A' : tc.text },
                        ]}
                      >
                        Request a Feature
                      </AppText>
                      <AppText style={[styles.typeCardDesc, { color: tc.textMuted }]}>
                        Suggest an enhancement or new app capability
                      </AppText>
                    </View>
                  </Pressable>
                </View>
              </View>

              {/* Category Pills */}
              <View style={styles.section}>
                <AppText style={[styles.sectionLabel, { color: tc.text }]}>
                  Topic Category
                </AppText>
                <View style={styles.categoryWrap}>
                  {activeCategories.map((c) => {
                    const active = category === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setCategory(c.id)}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: active ? colors.primary : isDark ? '#1E293B' : '#F1F5F9',
                            borderColor: active ? colors.primary : tc.border,
                          },
                        ]}
                        accessibilityRole="button"
                      >
                        <Ionicons
                          name={c.icon}
                          size={14}
                          color={active ? '#FFFFFF' : tc.textMuted}
                        />
                        <AppText
                          style={[
                            styles.categoryChipText,
                            { color: active ? '#FFFFFF' : tc.text, fontWeight: active ? '700' : '600' },
                          ]}
                        >
                          {c.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Priority Pills */}
              <View style={styles.section}>
                <AppText style={[styles.sectionLabel, { color: tc.text }]}>
                  Urgency / Priority
                </AppText>
                <View style={styles.priorityRow}>
                  {PRIORITY_OPTIONS.map((p) => {
                    const active = priority === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => setPriority(p.id)}
                        style={[
                          styles.priorityChip,
                          {
                            backgroundColor: active ? p.color : isDark ? '#1E293B' : p.bg,
                            borderColor: p.color,
                            borderWidth: active ? 2 : 1,
                          },
                        ]}
                        accessibilityRole="button"
                      >
                        <AppText
                          style={[
                            styles.priorityChipText,
                            { color: active ? '#FFFFFF' : p.color, fontWeight: active ? '800' : '600' },
                          ]}
                        >
                          {p.label.toUpperCase()}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Title Input */}
              <View style={styles.section}>
                <TextField
                  label="Subject / Summary Title *"
                  value={title}
                  onChangeText={setTitle}
                  placeholder={
                    type === 'feature_request'
                      ? 'e.g. Add quick pool lane reservation shortcut'
                      : 'e.g. Barcode brightness does not activate in sauna hallway'
                  }
                  maxLength={100}
                />
              </View>

              {/* Description Input */}
              <View style={styles.section}>
                <TextField
                  label="Detailed Description *"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Explain what happened, steps to reproduce, or why this feature would help YMCA members..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{ minHeight: 110 }}
                  maxLength={500}
                />
              </View>

              {/* Auto Device / Diagnostic Info Box */}
              <View
                style={[
                  styles.deviceInfoBox,
                  { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: tc.border },
                ]}
              >
                <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <AppText style={[styles.deviceInfoTitle, { color: tc.text }]}>
                    System Diagnostics Auto-Attached
                  </AppText>
                  <AppText style={[styles.deviceInfoText, { color: tc.textMuted }]}>
                    Device: {Platform.OS.toUpperCase()} · Text Scale: {textScale} ({Math.round(multiplier * 100)}%) · Theme: {themeMode}
                  </AppText>
                </View>
              </View>

              {/* Submit Button */}
              <View style={{ marginTop: 8 }}>
                <PrimaryButton
                  title={submitting ? 'Submitting & Opening IT Chat...' : 'Submit Ticket & Chat with IT'}
                  onPress={() => void handleSubmit()}
                  loading={submitting}
                />
              </View>
            </ScrollView>
          ) : (
            <View style={{ flex: 1, padding: 16 }}>
              {loadingHistory ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
              ) : userTickets.length === 0 ? (
                <View style={[styles.emptyBox, { borderColor: tc.border }]}>
                  <Ionicons name="ticket-outline" size={44} color={tc.textMuted} />
                  <AppText style={[styles.emptyTitle, { color: tc.text }]}>
                    No Tickets Logged Yet
                  </AppText>
                  <AppText style={[styles.emptyDesc, { color: tc.textMuted }]}>
                    Any problem reports or feature suggestions you submit will appear here with real-time status and live chat.
                  </AppText>
                </View>
              ) : (
                <FlatList
                  data={userTickets}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const badge = statusBadge(item.status);
                    return (
                      <View
                        style={[
                          styles.ticketCard,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                            borderColor: tc.border,
                          },
                        ]}
                      >
                        <View style={styles.ticketCardHeader}>
                          <View style={styles.ticketNumRow}>
                            <AppText style={[styles.ticketNumText, { color: colors.primary }]}>
                              {item.ticketNumber}
                            </AppText>
                            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                              <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                                {badge.label}
                              </Text>
                            </View>
                          </View>
                          <AppText style={{ fontSize: 11, color: tc.textMuted }}>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </AppText>
                        </View>

                        <AppText style={[styles.ticketTitle, { color: tc.text }]}>
                          {item.title}
                        </AppText>
                        <AppText
                          style={[styles.ticketDesc, { color: tc.textMuted }]}
                          numberOfLines={2}
                        >
                          {item.description}
                        </AppText>

                        <View style={styles.ticketFooter}>
                          <AppText style={{ fontSize: 11, color: tc.textMuted }}>
                            Category: {item.category.replace(/_/g, ' ').toUpperCase()}
                          </AppText>
                          <Pressable
                            onPress={() => void handleOpenExistingChat(item)}
                            style={[styles.chatLinkBtn, { backgroundColor: colors.primaryLight }]}
                            accessibilityRole="button"
                          >
                            <Ionicons name="chatbubbles" size={13} color={colors.primary} />
                            <AppText style={[styles.chatLinkText, { color: colors.primary }]}>
                              Open IT Chat ›
                            </AppText>
                          </Pressable>
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabBtnText: {
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  typeSelectorRow: {
    gap: 10,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1.5,
  },
  typeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  typeCardDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  priorityChipText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  inputField: {
    borderRadius: radii.button,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  textAreaField: {
    borderRadius: radii.button,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 90,
  },
  deviceInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  deviceInfoTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  deviceInfoText: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: 30,
    ...cardStyle,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  ticketCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 8,
    ...cardStyle,
  },
  ticketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketNumText: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  ticketTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  ticketDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  chatLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  chatLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
