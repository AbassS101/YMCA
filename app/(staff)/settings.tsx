import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ChatModal } from '@/components/ChatModal';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SupportTicketModal } from '@/components/SupportTicketModal';
import { TextField } from '@/components/TextField';
import { UserAvatar } from '@/components/UserAvatar';
import { useAccessibility, type TextScale } from '@/context/AccessibilityContext';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
import { isAdminRole, type Message, type NotificationPreferences, type Staff, type TicketType } from '@/domain/types';
import { messageRepo } from '@/repositories/messageRepo';
import { notificationRepo } from '@/repositories/notificationRepo';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii, typography } from '@/theme/typography';

const THEME_OPTIONS: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

const SCALE_OPTIONS: { key: TextScale; label: string; sub: string }[] = [
  { key: 'standard', label: 'Default', sub: '100%' },
  { key: 'larger', label: 'Medium / Large', sub: '115%' },
  { key: 'largest', label: 'Extra Large', sub: '130%' },
];

export default function StaffSettingsScreen() {
  const router = useRouter();
  const { session, api, logout } = useSession();
  const { themeMode, setThemeMode, colors: tc, isDark } = useTheme();
  const { textScale, setTextScale } = useAccessibility();

  const staffId = session?.userId ?? '';
  const isITAdmin = session?.role === 'it_admin';
  const isStaffAdmin = session?.role === 'staff_admin';
  const isAdmin = isAdminRole(session?.role);

  const [staff, setStaff] = useState<Staff | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // IT Support Ticket & Chat State
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [supportInitialType, setSupportInitialType] = useState<TicketType>('problem_report');
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [activeITStaff, setActiveITStaff] = useState<Staff | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [itMessages, setITMessages] = useState<Message[]>([]);

  const handleOpenITChat = async (itStaff: Staff, threadId: string) => {
    setActiveITStaff(itStaff);
    setActiveThreadId(threadId);
    try {
      const msgs = await messageRepo.listMessages(api, threadId);
      setITMessages(msgs);
    } catch {
      setITMessages([]);
    }
    setChatModalVisible(true);
  };

  const handleSendITMessage = async (body: string) => {
    if (!activeThreadId || !staffId) return;
    try {
      const newMsg = await messageRepo.sendMessage(api, {
        threadId: activeThreadId,
        fromId: staffId,
        body,
      });
      setITMessages((prev) => [...prev, newMsg]);
    } catch {
      // ignore
    }
  };

  const loadStaffData = useCallback(async () => {
    if (!staffId || !api) return;
    try {
      const [s, prefs] = await Promise.all([
        api.getStaff(staffId),
        notificationRepo.getPreferences(api, staffId).catch(() => null),
      ]);
      setStaff(s);
      if (prefs) setPreferences(prefs);
    } catch {
      // ignore
    }
  }, [api, staffId]);

  useEffect(() => {
    void loadStaffData();
  }, [loadStaffData]);

  const handleTogglePref = async (key: keyof NotificationPreferences) => {
    if (!preferences || !staffId || !api) return;
    const nextVal = !preferences[key];
    const updated = { ...preferences, [key]: nextVal };
    setPreferences(updated);
    try {
      await notificationRepo.updatePreferences(api, staffId, { [key]: nextVal });
    } catch {
      setPreferences(preferences);
      dialog.alert('Error', 'Could not update notification preference.');
    }
  };

  const handleUpdateAvatar = async (nextUrl: string) => {
    if (!staffId || !api) return;
    try {
      const updated = await api.updateStaff(staffId, { avatarUrl: nextUrl });
      setStaff(updated);
      dialog.alert('Avatar Updated', 'Your profile picture and silhouette have been updated.', [{ text: 'OK' }], 'checkmark');
    } catch {
      dialog.alert('Error', 'Could not update profile avatar.');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim() || newPassword.length < 4) {
      setPasswordError('Password must be at least 4 characters.');
      return;
    }
    if (!staff?.email || !api) return;

    setSavingPassword(true);
    setPasswordError(null);
    try {
      await api.changeUserPassword(staff.email, newPassword.trim());
      setChangePasswordVisible(false);
      setNewPassword('');
      dialog.alert('Password Updated', 'Your staff password has been saved securely.', [{ text: 'OK' }], 'checkmark');
    } catch (err: any) {
      setPasswordError(err?.message || 'Could not update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  const roleLabel = isITAdmin
    ? 'IT Administrator'
    : isStaffAdmin
      ? 'Staff Administrator'
      : isAdmin
        ? 'Administrator'
        : session?.role === 'trainer'
          ? 'Personal Trainer / Coach'
          : 'Front Desk / Member Services';

  const roleBadgeColor = isITAdmin ? '#7C3AED' : isAdmin ? colors.primary : '#15803D';
  const roleBadgeBg = isITAdmin ? '#F5F3FF' : isAdmin ? '#EFF6FF' : '#F0FDF4';

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: tc.cardBg, borderColor: tc.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to staff portal"
        >
          <Ionicons name="arrow-back" size={24} color={tc.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: tc.text }]}>Staff Settings</Text>
          <Text style={[styles.headerSubtitle, { color: tc.textMuted }]}>
            Appearance, theme control, profile picture, and access credentials
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* PROFILE & AVATAR CARD */}
        {staff ? (
          <View
            style={[
              styles.card,
              { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
            ]}
          >
            <View style={styles.profileRow}>
              <UserAvatar
                uri={staff.avatarUrl}
                name={staff.name}
                size={70}
                editable
                onSavePhoto={handleUpdateAvatar}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={[styles.staffName, { color: tc.text }]}>{staff.name}</Text>
                  <View style={[styles.badge, { backgroundColor: roleBadgeBg }]}>
                    <Text style={[styles.badgeText, { color: roleBadgeColor }]}>
                      {isITAdmin ? 'IT ADMIN' : isStaffAdmin ? 'STAFF ADMIN' : isAdmin ? 'ADMIN' : 'STAFF'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.staffRole, { color: tc.primary }]}>{staff.roleLabel}</Text>
                <Text style={[styles.staffEmail, { color: tc.textMuted }]}>{staff.email}</Text>
                <Text style={[styles.tapHint, { color: colors.primary }]}>
                  Tap avatar icon to change photo or silhouette ›
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* APPEARANCE & THEME CONTROL */}
        <View
          style={[
            styles.card,
            { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="color-palette" size={22} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: tc.text }]}>Appearance & Theme</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: tc.textMuted }]}>
            Choose Light mode, Dark mode, or follow your device system settings.
          </Text>

          <View style={styles.chipRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = themeMode === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setThemeMode(opt.key)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: active ? colors.primary : tc.border,
                      borderWidth: active ? 2 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${opt.label} theme`}
                >
                  <Ionicons
                    name={opt.icon}
                    size={18}
                    color={active ? '#FFFFFF' : tc.text}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? '#FFFFFF' : tc.text, fontWeight: active ? '700' : '600' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ACCESSIBILITY & TEXT SIZE */}
        <View
          style={[
            styles.card,
            { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="text" size={22} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: tc.text }]}>Text Size & Accessibility</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: tc.textMuted }]}>
            Scale text size throughout the staff portal for improved legibility.
          </Text>

          <View style={styles.scaleGrid}>
            {SCALE_OPTIONS.map((opt) => {
              const active = textScale === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setTextScale(opt.key)}
                  style={[
                    styles.scaleChip,
                    {
                      backgroundColor: active ? colors.primary : isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: active ? colors.primary : tc.border,
                      borderWidth: active ? 2 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? '#FFFFFF' : tc.text, fontWeight: active ? '700' : '600' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={[
                      styles.scaleSub,
                      { color: active ? '#E0F2FE' : tc.textMuted },
                    ]}
                  >
                    {opt.sub}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* STAFF NOTIFICATION PREFERENCES */}
        <View
          style={[
            styles.card,
            { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: tc.text }]}>Staff Notification Alerts</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: tc.textMuted }]}>
            Control when and how you are alerted for desk inquiries, forum tags, and branch activity.
          </Text>

          <View style={[styles.prefItem, { borderBottomColor: tc.border, borderBottomWidth: 1 }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.prefTitle, { color: tc.text }]}>@All Staff Desk Inquiries</Text>
              <Text style={[styles.prefSub, { color: tc.textMuted }]}>
                Receive alerts when members post inquiries tagging the staff front desk.
              </Text>
            </View>
            <Switch
              value={preferences?.staffInquiries ?? true}
              onValueChange={() => void handleTogglePref('staffInquiries')}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.prefItem, { borderBottomColor: tc.border, borderBottomWidth: 1 }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.prefTitle, { color: tc.text }]}>Direct @Mentions</Text>
              <Text style={[styles.prefSub, { color: tc.textMuted }]}>
                Alerts when you are tagged directly in forum topics or discussion comments.
              </Text>
            </View>
            <Switch
              value={preferences?.mentions ?? true}
              onValueChange={() => void handleTogglePref('mentions')}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.prefItem, { borderBottomColor: tc.border, borderBottomWidth: 1 }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.prefTitle, { color: tc.text }]}>Topic Replies</Text>
              <Text style={[styles.prefSub, { color: tc.textMuted }]}>
                Notify when members or colleagues respond to discussions you started.
              </Text>
            </View>
            <Switch
              value={preferences?.topicReplies ?? true}
              onValueChange={() => void handleTogglePref('topicReplies')}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.prefItem, { borderBottomColor: tc.border, borderBottomWidth: 1 }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.prefTitle, { color: tc.text }]}>Class Forum Discussions</Text>
              <Text style={[styles.prefSub, { color: tc.textMuted }]}>
                Updates and questions in fitness and activity class forum threads.
              </Text>
            </View>
            <Switch
              value={preferences?.classForumAlerts ?? true}
              onValueChange={() => void handleTogglePref('classForumAlerts')}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.prefItem}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.prefTitle, { color: tc.text }]}>Push Notifications</Text>
              <Text style={[styles.prefSub, { color: tc.textMuted }]}>
                Deliver device notifications immediately for assigned duties and inquiries.
              </Text>
            </View>
            <Switch
              value={preferences?.pushEnabled ?? true}
              onValueChange={() => void handleTogglePref('pushEnabled')}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* IT SUPPORT & FEATURE REQUESTS */}
        <View
          style={[
            styles.card,
            { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="construct-outline" size={22} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: tc.text }]}>IT Support & Feature Requests</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: tc.textMuted }]}>
            Report internal bugs, request staff management features, or chat directly with David Miller (IT Systems Administrator).
          </Text>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <Pressable
              onPress={() => {
                setSupportInitialType('feature_request');
                setSupportModalVisible(true);
              }}
              style={[
                styles.supportActionBtn,
                { backgroundColor: isDark ? '#132A1C' : '#F0FDF4', borderColor: '#16A34A' },
              ]}
              accessibilityRole="button"
            >
              <Ionicons name="bulb-outline" size={16} color="#16A34A" />
              <Text style={[styles.supportActionBtnText, { color: '#16A34A' }]}>
                Request Feature
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setSupportInitialType('problem_report');
                setSupportModalVisible(true);
              }}
              style={[
                styles.supportActionBtn,
                { backgroundColor: isDark ? '#311014' : '#FEF2F2', borderColor: colors.scarlet },
              ]}
              accessibilityRole="button"
            >
              <Ionicons name="warning-outline" size={16} color={colors.scarlet} />
              <Text style={[styles.supportActionBtnText, { color: colors.scarlet }]}>
                Report Issue
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              setSupportInitialType('problem_report');
              setSupportModalVisible(true);
            }}
            style={[styles.securityActionBtn, { borderColor: tc.border, marginTop: 6 }]}
            accessibilityRole="button"
          >
            <Ionicons name="file-tray-full-outline" size={18} color={colors.primary} />
            <Text style={[styles.securityActionText, { color: colors.primary }]}>
              View Ticket Status & IT History
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </View>

        {/* ADMIN CONTROLS: STAFF ROSTER & FEEDBACK */}
        {isAdmin ? (
          <View
            style={[
              styles.card,
              { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="people-circle-outline" size={22} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: tc.text }]}>Branch Administration</Text>
            </View>
            <Text style={[styles.sectionDesc, { color: tc.textMuted }]}>
              Administrative tools for both Staff Admin and IT Admin to configure staff accounts and review member feedback.
            </Text>

            <Pressable
              onPress={() => router.push('/(staff)/staff-management')}
              style={[styles.securityActionBtn, { borderColor: tc.border, marginTop: 4 }]}
              accessibilityRole="button"
            >
              <Ionicons name="person-add-outline" size={18} color={colors.primary} />
              <Text style={[styles.securityActionText, { color: tc.text }]}>
                Manage Staff Accounts & Permissions
              </Text>
              <Ionicons name="chevron-forward" size={16} color={tc.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => router.push('/(staff)/complaints-suggestions')}
              style={[styles.securityActionBtn, { borderColor: tc.border, marginTop: 6 }]}
              accessibilityRole="button"
            >
              <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
              <Text style={[styles.securityActionText, { color: tc.text }]}>
                Member Complaints & Suggestions
              </Text>
              <Ionicons name="chevron-forward" size={16} color={tc.textMuted} />
            </Pressable>
          </View>
        ) : null}

        {/* SECURITY & ACCOUNT ACTIONS */}
        <View
          style={[
            styles.card,
            { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="shield-checkmark" size={22} color={roleBadgeColor} />
            <Text style={[styles.sectionTitle, { color: tc.text }]}>Account & Security</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: tc.textMuted }]}>
            Role level: <Text style={{ fontWeight: '700', color: tc.text }}>{roleLabel}</Text>
          </Text>

          <Pressable
            onPress={() => setChangePasswordVisible(true)}
            style={[styles.securityActionBtn, { borderColor: tc.border }]}
            accessibilityRole="button"
          >
            <Ionicons name="key-outline" size={20} color={tc.text} />
            <Text style={[styles.securityActionText, { color: tc.text }]}>Change Staff Password</Text>
            <Ionicons name="chevron-forward" size={18} color={tc.textMuted} />
          </Pressable>
        </View>

        {/* LOGOUT */}
        <PrimaryButton
          title="Sign out of Staff Account"
          onPress={() => void handleLogout()}
          loading={loggingOut}
        />
      </ScrollView>

      {/* CHANGE PASSWORD MODAL */}
      <Modal
        visible={changePasswordVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setChangePasswordVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: tc.text }]}>Change Password</Text>
              <Pressable onPress={() => setChangePasswordVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={tc.text} />
              </Pressable>
            </View>

            {passwordError ? (
              <Text style={{ color: colors.scarlet, fontSize: 13, marginBottom: 8 }}>
                {passwordError}
              </Text>
            ) : null}

            <TextField
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Minimum 4 characters"
            />

            <View style={{ marginTop: 16 }}>
              <PrimaryButton
                title="Save Password"
                onPress={() => void handleChangePassword()}
                loading={savingPassword}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Staff Support Ticket Modal */}
      <SupportTicketModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
        userId={staffId}
        userName={staff?.name ?? 'Staff User'}
        userEmail={staff?.email ?? 'staff@silverspring.ymca'}
        userRole={session?.role ?? 'staff'}
        api={api}
        initialType={supportInitialType}
        onOpenITChat={handleOpenITChat}
      />

      {/* IT Chat Modal */}
      <ChatModal
        visible={chatModalVisible}
        onClose={() => setChatModalVisible(false)}
        recipient={activeITStaff}
        messages={itMessages}
        currentUserId={staffId}
        onSend={handleSendITMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    ...cardStyle,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  staffName: {
    fontSize: 17,
    fontWeight: '800',
  },
  staffRole: {
    fontSize: 13,
    fontWeight: '600',
  },
  staffEmail: {
    fontSize: 12,
  },
  tapHint: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  prefItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  prefTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  prefSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 13,
  },
  scaleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  scaleChip: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 2,
  },
  scaleSub: {
    fontSize: 11,
  },
  supportActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radii.button,
    borderWidth: 1.5,
  },
  supportActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  securityActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  securityActionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
});
