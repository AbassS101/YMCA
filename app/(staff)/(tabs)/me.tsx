import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { UserAvatar } from '@/components/UserAvatar';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
import { isAdminRole, type Staff } from '@/domain/types';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii, typography } from '@/theme/typography';

function branchLabel(branchId: string): string {
  if (branchId === 'silver-spring') {
    return 'YMCA Silver Spring';
  }
  return branchId;
}

const THEME_OPTIONS: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

const DEMO_ACCOUNTS = [
  {
    name: 'David Miller',
    email: 'itadmin@silverspring.ymca',
    role: 'IT Admin · Systems Administrator',
    icon: 'shield-checkmark',
    color: '#7C3AED',
  },
  {
    name: 'Jane Smith',
    email: 'admin@silverspring.ymca',
    role: 'Staff Admin · Director',
    icon: 'shield',
    color: colors.primary,
  },
  {
    name: 'Alex Rivera',
    email: 'alex@silverspring.ymca',
    role: 'Trainer · Personal Wellness',
    icon: 'barbell',
    color: '#15803D',
  },
  {
    name: 'Sarah Davis',
    email: 'sarah@silverspring.ymca',
    role: 'Trainer · Senior Mobility',
    icon: 'heart',
    color: '#0284C7',
  },
  {
    name: 'Marcus Taylor',
    email: 'wellness@silverspring.ymca',
    role: 'Staff · Front Desk & Member Services',
    icon: 'business',
    color: '#D97706',
  },
  {
    name: 'Jordan Hale',
    email: 'jordan@silverspring.ymca',
    role: 'YMCA Member',
    icon: 'person',
    color: '#7C3AED',
  },
];

export default function StaffMeScreen() {
  const router = useRouter();
  const { session, api, login, logout } = useSession();
  const { themeMode, setThemeMode, colors: tc, isDark } = useTheme();

  const staffId = session?.userId ?? '';
  const isITAdmin = session?.role === 'it_admin';
  const isStaffAdmin = session?.role === 'staff_admin';
  const isAdmin = isAdminRole(session?.role);

  const [staff, setStaff] = useState<Staff | null>(null);
  const [error, setError] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [switchingEmail, setSwitchingEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (staffId === '') {
      return;
    }
    try {
      setError(false);
      setStaff(await api.getStaff(staffId));
    } catch {
      setError(true);
    }
  }, [api, staffId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleSwitchAccount(email: string) {
    setSwitchingEmail(email);
    try {
      const next = await login(email, 'ymca-demo');
      if (next.role === 'member') {
        router.replace('/(member)/home');
      } else {
        router.replace('/(staff)/today');
      }
    } finally {
      setSwitchingEmail(null);
    }
  }

  const roleBadgeLabel = isITAdmin
    ? 'IT ADMIN'
    : isStaffAdmin
      ? 'STAFF ADMIN'
      : isAdmin
        ? 'ADMIN'
        : session?.role === 'trainer'
          ? 'TRAINER'
          : 'STAFF';

  const roleBadgeBg = isITAdmin
    ? '#F5F3FF'
    : isStaffAdmin || isAdmin
      ? '#EFF6FF'
      : '#F0FDF4';

  const roleBadgeColor = isITAdmin
    ? '#7C3AED'
    : isStaffAdmin || isAdmin
      ? colors.primary
      : '#15803D';

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle="Staff Account & Switcher" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile Card */}
        {staff ? (
          <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <UserAvatar
                uri={staff.avatarUrl}
                name={staff.name}
                size={62}
                editable
                onSavePhoto={handleUpdateAvatar}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={[styles.name, { color: tc.text }]}>{staff.name}</Text>
                  <View style={[styles.badge, { backgroundColor: roleBadgeBg }]}>
                    <Text style={[styles.badgeText, { color: roleBadgeColor }]}>
                      {roleBadgeLabel}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.row, { color: tc.primary, fontWeight: '600' }]}>{staff.roleLabel}</Text>
                <Text style={[styles.row, { color: tc.textMuted }]}>{branchLabel(staff.homeBranchId)}</Text>
                <Text style={[styles.meta, { color: tc.textMuted }]}>{staff.email}</Text>
              </View>
            </View>
            <Text style={[styles.avatarHint, { color: colors.primary }]}>
              Tap photo icon to upload custom picture or select clean silhouette ›
            </Text>
          </View>
        ) : null}

        {/* Theme Control & Settings Card */}
        <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="color-palette" size={22} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: tc.text }]}>Appearance & Theme</Text>
            </View>
            <Pressable
              onPress={() => router.push('/(staff)/settings')}
              style={styles.settingsLinkBtn}
              accessibilityRole="button"
              accessibilityLabel="Open staff settings"
            >
              <Ionicons name="settings-outline" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Settings ›</Text>
            </Pressable>
          </View>
          <Text style={[styles.meta, { color: tc.textMuted }]}>
            Live theme mode across all staff views and administrative tools.
          </Text>

          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = themeMode === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setThemeMode(opt.key)}
                  style={[
                    styles.themeChip,
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
                    size={16}
                    color={active ? '#FFFFFF' : tc.text}
                  />
                  <Text
                    style={[
                      styles.themeChipText,
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

        {/* Staff Administration & Feedback */}
        <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="briefcase-outline" size={22} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: tc.text }]}>Staff Operations & Feedback</Text>
          </View>
          <Text style={[styles.meta, { color: tc.textMuted }]}>
            Branch tools for staff accounts, role management, and member complaints & suggestions.
          </Text>

          {isAdmin ? (
            <Pressable
              onPress={() => router.push('/(staff)/staff-management')}
              style={[styles.adminActionBtn, { borderColor: tc.border, marginTop: 10 }]}
              accessibilityRole="button"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Ionicons name="people" size={20} color={colors.primary} />
                <View>
                  <Text style={[styles.adminActionTitle, { color: tc.text }]}>Manage Staff Accounts</Text>
                  <Text style={[styles.adminActionSub, { color: tc.textMuted }]}>
                    Create, edit, or customize credentials for both Staff Admin & IT Admin
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tc.textMuted} />
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => router.push('/(staff)/complaints-suggestions')}
            style={[styles.adminActionBtn, { borderColor: tc.border, marginTop: 8 }]}
            accessibilityRole="button"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Ionicons name="chatbubbles" size={20} color="#0284C7" />
              <View>
                <Text style={[styles.adminActionTitle, { color: tc.text }]}>Complaints & Suggestions</Text>
                <Text style={[styles.adminActionSub, { color: tc.textMuted }]}>
                  Review, filter, and respond to member feedback & ideas
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tc.textMuted} />
          </Pressable>
        </View>

        {/* Quick Demo Switcher */}
        <View style={[styles.switcherCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
          <Text style={[styles.switcherTitle, { color: tc.text }]}>Quick Switch Role (Testing)</Text>
          <Text style={[styles.switcherSubtitle, { color: tc.textMuted }]}>
            Switch instantly between IT Admin, Staff Admin, Trainers, Desk Staff, and Members without signing out.
          </Text>

          <View style={{ gap: 8, marginTop: 10 }}>
            {DEMO_ACCOUNTS.map((acc) => {
              const isCurrent = staff?.email === acc.email;
              const isSwitching = switchingEmail === acc.email;
              return (
                <Pressable
                  key={acc.email}
                  onPress={() => void handleSwitchAccount(acc.email)}
                  disabled={isCurrent || isSwitching}
                  style={[
                    styles.accRow,
                    {
                      backgroundColor: isCurrent
                        ? isDark
                          ? '#1E293B'
                          : '#EFF6FF'
                        : isDark
                          ? '#0F172A'
                          : '#F8FAFC',
                      borderColor: isCurrent ? colors.primary : tc.border,
                      borderWidth: isCurrent ? 1.5 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                >
                  <View style={[styles.accIconWrap, { backgroundColor: `${acc.color}18` }]}>
                    <Ionicons name={acc.icon as any} size={20} color={acc.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.accName, { color: isCurrent ? colors.primary : tc.text, fontWeight: isCurrent ? '800' : '700' }]}>
                      {acc.name} {isCurrent ? '(Active)' : ''}
                    </Text>
                    <Text style={[styles.accRole, { color: tc.textMuted }]}>{acc.role}</Text>
                  </View>
                  {isCurrent ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  ) : (
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
                      {isSwitching ? '...' : 'Switch ›'}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <PrimaryButton title="Log out" onPress={() => void handleLogout()} loading={loggingOut} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    ...cardStyle,
  },
  name: {
    ...typography.body,
    fontWeight: '800',
    fontSize: 17,
  },
  row: {
    ...typography.body,
    fontSize: 13,
  },
  meta: {
    fontSize: 12,
    marginTop: 1,
  },
  avatarHint: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
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
    fontSize: 15,
    fontWeight: '800',
  },
  settingsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  themeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  themeChipText: {
    fontSize: 12,
  },
  switcherCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 16,
    ...cardStyle,
  },
  switcherTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  switcherSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  accRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.sm,
  },
  accIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accName: {
    fontSize: 14,
  },
  accRole: {
    fontSize: 12,
    marginTop: 1,
  },
  adminActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  adminActionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  adminActionSub: {
    fontSize: 11,
    marginTop: 2,
  },
});
