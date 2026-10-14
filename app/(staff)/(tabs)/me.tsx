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
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { canOpenAdminCenter } from '@/domain/adminCenter';
import { type Staff } from '@/domain/types';
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
    name: 'Abass Shikur',
    email: 'itadmin@silverspring.ymca',
    role: 'IT Admin · Systems Administrator',
    icon: 'shield-checkmark',
    color: '#7C3AED',
  },
  {
    name: 'David',
    email: 'admin@silverspring.ymca',
    role: 'Staff Admin',
    icon: 'shield',
    color: colors.primary,
  },
  {
    name: 'Doc',
    email: 'alex@silverspring.ymca',
    role: 'Trainer · Personal Wellness',
    icon: 'barbell',
    color: '#15803D',
  },
  {
    name: 'Jane Doe',
    email: 'sarah@silverspring.ymca',
    role: 'Swim Instructor · Aquatics',
    icon: 'water',
    color: '#0284C7',
  },
  {
    name: 'Alek',
    email: 'aquatics@silverspring.ymca',
    role: 'Aquatics Director',
    icon: 'water',
    color: '#0EA5E9',
  },
  {
    name: 'Celine',
    email: 'celine@silverspring.ymca',
    role: 'Wellness Director',
    icon: 'fitness',
    color: '#9D174D',
  },
  {
    name: 'Billy Deveaux',
    email: 'membership@silverspring.ymca',
    role: 'Membership Director',
    icon: 'business',
    color: '#4338CA',
  },
  {
    name: 'Liz',
    email: 'frontdesk@silverspring.ymca',
    role: 'Front Desk Membership Representative',
    icon: 'headset',
    color: '#0891B2',
  },
  {
    name: 'John Doe',
    email: 'jordan@silverspring.ymca',
    role: 'YMCA Member',
    icon: 'person',
    color: '#2563EB',
  },
];

export default function StaffMeScreen() {
  const router = useRouter();
  const { session, api, login, logout } = useSession();
  const { themeMode, setThemeMode, colors: tc, isDark } = useTheme();

  const staffId = session?.userId ?? '';
  const { can, canEditSection, theme: persona } = useStaffCapabilities();

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
      if (next.role === 'member' || next.role === 'guest') {
        router.replace('/(member)/home');
      } else {
        router.replace('/(staff)/today');
      }
    } finally {
      setSwitchingEmail(null);
    }
  }

  const roleBadgeLabel = persona.badge;
  const roleBadgeBg = isDark ? persona.darkSoftBg : persona.softBg;
  const roleBadgeColor = isDark ? '#FFFFFF' : persona.color;
  const showAdminCenter = canOpenAdminCenter(session?.role);
  const hasStaffTools =
    can('manageStaff') || can('manageTrainers') || can('manageSurveys') || can('broadcast') || can('manageComplaints') || showAdminCenter;

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle="Staff Account & Switcher" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile Card */}
        {staff ? (
          <View
            style={[
              styles.card,
              { backgroundColor: tc.cardBg, borderColor: tc.cardBorder, borderTopWidth: 4, borderTopColor: persona.color },
            ]}
          >
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

        {hasStaffTools ? (
        <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="briefcase-outline" size={22} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: tc.text }]}>{persona.title} Tools</Text>
          </View>
          <Text style={[styles.meta, { color: tc.textMuted }]}>
            Branch tools available to your role.
          </Text>

          {can('manageStaff') || can('manageTrainers') ? (
            <Pressable
              onPress={() => router.push('/(staff)/staff-management')}
              style={[styles.adminActionBtn, { borderColor: tc.border, marginTop: 10 }]}
              accessibilityRole="button"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Ionicons name="people" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.adminActionTitle, { color: tc.text }]}>
                    {can('manageStaff') ? 'Manage Staff Accounts' : 'Trainer Team Directory'}
                  </Text>
                  <Text style={[styles.adminActionSub, { color: tc.textMuted }]}>
                    {can('manageStaff')
                      ? 'Create, edit, or customize credentials for every staff role'
                      : 'See every trainer on your team and how to reach them'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tc.textMuted} />
            </Pressable>
          ) : null}

          {showAdminCenter ? (
            <Pressable
              onPress={() => router.push('/(staff)/admin-center')}
              style={[styles.adminActionBtn, { borderColor: tc.border, marginTop: 8 }]}
              accessibilityRole="button"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Ionicons name="settings" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.adminActionTitle, { color: tc.text }]}>Admin Control Center</Text>
                  <Text style={[styles.adminActionSub, { color: tc.textMuted }]}>
                    Pricing, deals, and branch settings
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tc.textMuted} />
            </Pressable>
          ) : null}

          {canEditSection('lessonPricing') ? (
            <Pressable
              onPress={() => router.push('/(staff)/lesson-pricing')}
              style={[styles.adminActionBtn, { borderColor: tc.border, marginTop: 8 }]}
              accessibilityRole="button"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Ionicons name="pricetags" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.adminActionTitle, { color: tc.text }]}>Lesson & Swim Pricing</Text>
                  <Text style={[styles.adminActionSub, { color: tc.textMuted }]}>
                    Edit private lesson and swim class prices
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tc.textMuted} />
            </Pressable>
          ) : null}

          {can('manageSurveys') ? (
          <Pressable
            onPress={() => router.push('/(staff)/surveys')}
            style={[styles.adminActionBtn, { borderColor: tc.border, marginTop: 8 }]}
            accessibilityRole="button"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Ionicons name="stats-chart" size={20} color="#16A34A" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.adminActionTitle, { color: tc.text }]}>Member Surveys & Polls</Text>
                <Text style={[styles.adminActionSub, { color: tc.textMuted }]}>
                  Create branch polls, review member responses, and inspect live analytics
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tc.textMuted} />
          </Pressable>
          ) : null}

          {can('broadcast') ? (
          <Pressable
            onPress={() => router.push('/(staff)/announcements')}
            style={[styles.adminActionBtn, { borderColor: tc.border, marginTop: 8 }]}
            accessibilityRole="button"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Ionicons name="megaphone" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.adminActionTitle, { color: tc.text }]}>Announcements & Pop-up Notices</Text>
                <Text style={[styles.adminActionSub, { color: tc.textMuted }]}>
                  Broadcast bulletins, pin alerts, and configure app-opening member pop-ups
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tc.textMuted} />
          </Pressable>
          ) : null}

          {can('manageComplaints') ? (
          <Pressable
            onPress={() => router.push('/(staff)/complaints-suggestions')}
            style={[styles.adminActionBtn, { borderColor: tc.border, marginTop: 8 }]}
            accessibilityRole="button"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Ionicons name="chatbubbles" size={20} color="#0284C7" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.adminActionTitle, { color: tc.text }]}>Complaints & Suggestions</Text>
                <Text style={[styles.adminActionSub, { color: tc.textMuted }]}>
                  Review, filter, and respond to member feedback & ideas
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tc.textMuted} />
          </Pressable>
          ) : null}
        </View>
        ) : null}

        {/* Quick Demo Switcher */}
        <View style={[styles.switcherCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
          <Text style={[styles.switcherTitle, { color: tc.text }]}>Quick Switch Role (Testing)</Text>
          <Text style={[styles.switcherSubtitle, { color: tc.textMuted }]}>
            Switch instantly between IT Admin, Staff Admin, trainers, swim staff, directors, front desk reps, and members without signing out.
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
    gap: 8,
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
