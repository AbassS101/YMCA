import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import type { UserRole } from '@/domain/types';
import { resetStore } from '@/storage/demoStore';
import { colors } from '@/theme/colors';
import { radii, spacing, typography } from '@/theme/typography';

const DEMO_PASSWORD = 'ymca-demo';

const DEMO_PERSONAS = [
  {
    name: 'John Doe',
    email: 'jordan@silverspring.ymca',
    roleTitle: 'Active YMCA Member',
    badge: 'MEMBER',
    badgeBg: '#EFF6FF',
    badgeColor: '#1D4ED8',
    borderColor: '#3B82F6',
    icon: 'person' as const,
    highlights: 'Barcode pass, class booking, charitable giving, community forum',
  },
  {
    name: 'David',
    email: 'admin@silverspring.ymca',
    roleTitle: 'Staff Admin',
    badge: 'STAFF ADMIN',
    badgeBg: '#FEF3C7',
    badgeColor: '#B45309',
    borderColor: '#F59E0B',
    icon: 'star' as const,
    highlights: 'Facility notices, membership cancel approvals, staff & schedule oversight',
  },
  {
    name: 'Doc',
    email: 'alex@silverspring.ymca',
    roleTitle: 'Personal Trainer',
    badge: 'TRAINER',
    badgeBg: '#DCFCE7',
    badgeColor: '#15803D',
    borderColor: '#22C55E',
    icon: 'barbell' as const,
    highlights: 'Class rosters, 1-on-1 private lesson slots, client messaging',
  },
  {
    name: 'Jane Doe',
    email: 'sarah@silverspring.ymca',
    roleTitle: 'Swim Instructor · Aquatics',
    badge: 'SWIM INSTRUCTOR',
    badgeBg: '#E0F2FE',
    badgeColor: '#0369A1',
    borderColor: '#0284C7',
    icon: 'water' as const,
    highlights: 'Swim class rosters, private swim lesson slots, swimmer messaging',
  },
  {
    name: 'Abass Shikur',
    email: 'itadmin@silverspring.ymca',
    roleTitle: 'IT Systems Administrator · IT',
    badge: 'IT ADMIN',
    badgeBg: '#FAF5FF',
    badgeColor: '#7C3AED',
    borderColor: '#8B5CF6',
    icon: 'shield-checkmark' as const,
    highlights: 'System configuration, staff accounts, IT tickets, tech access',
  },
  {
    name: 'Celine',
    email: 'celine@silverspring.ymca',
    roleTitle: 'Wellness Director',
    badge: 'WELLNESS DIR',
    badgeBg: '#FCE7F3',
    badgeColor: '#9D174D',
    borderColor: '#EC4899',
    icon: 'fitness' as const,
    highlights: 'Trainer team utilization, client-to-trainer assignments, own 1-on-1 clients',
  },
  {
    name: 'Alek',
    email: 'aquatics@silverspring.ymca',
    roleTitle: 'Aquatics Director',
    badge: 'AQUATICS DIR',
    badgeBg: '#E0F2FE',
    badgeColor: '#0369A1',
    borderColor: '#0EA5E9',
    icon: 'water' as const,
    highlights: 'Swim instructor team, private swim requests (read-only oversight), own swim lessons',
  },
  {
    name: 'Billy Deveaux',
    email: 'membership@silverspring.ymca',
    roleTitle: 'Membership Director · Front Desk Lead',
    badge: 'MEMBERSHIP DIR',
    badgeBg: '#E0E7FF',
    badgeColor: '#4338CA',
    borderColor: '#6366F1',
    icon: 'business' as const,
    highlights: 'Front desk check-in, cancellation approvals, plan changes, new members',
  },
  {
    name: 'Maya Brooks',
    email: 'frontdesk@silverspring.ymca',
    roleTitle: 'Front Desk Membership Representative',
    badge: 'FRONT DESK',
    badgeBg: '#CFFAFE',
    badgeColor: '#0E7490',
    borderColor: '#0891B2',
    icon: 'headset' as const,
    highlights: 'Member sign-in, billing follow-up, leads, campaigns & call scripts',
  },
  {
    name: 'Taylor Smith',
    email: 'guest@silverspring.ymca',
    roleTitle: 'Guest Pass Holder · Visitor',
    badge: 'GUEST PASS',
    badgeBg: '#FEF3C7',
    badgeColor: '#B45309',
    borderColor: '#F59E0B',
    icon: 'ticket' as const,
    highlights: 'Digital 1-day pass barcode, facility preview, join YMCA membership & giving',
  },
];

function routeForRole(role: UserRole): '/(member)/home' | '/(staff)/today' {
  return role === 'member' || role === 'guest' ? '/(member)/home' : '/(staff)/today';
}

export default function LoginScreen() {
  const router = useRouter();
  const { session, ready, login } = useSession();
  const { colors: tc, isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [directSigningIn, setDirectSigningIn] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  if (ready && session != null) {
    return <Redirect href={routeForRole(session.role)} />;
  }

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const trimmed = email.trim();
      const next = await login(trimmed, password);
      router.replace(routeForRole(next.role));
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDirectLaunch(targetEmail: string) {
    setError(null);
    setDirectSigningIn(targetEmail);
    try {
      const next = await login(targetEmail, DEMO_PASSWORD);
      router.replace(routeForRole(next.role));
    } catch {
      setError('Could not sign in. Please try again.');
    } finally {
      setDirectSigningIn(null);
    }
  }

  function fillDemo(nextEmail: string) {
    setEmail(nextEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  async function handleResetDemoData() {
    dialog.show({
      title: 'Reset sample data',
      message:
        'Restore schedules, memberships, messages and all other sample records to their starting state? Anything you added will be removed.',
      icon: 'alert',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              await resetStore();
              setEmail('');
              setPassword('');
              setError(null);
              dialog.alert(
                'Sample data restored',
                'Everything is back to its starting state.',
                [{ text: 'OK' }],
                'checkmark'
              );
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    });
  }

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle="Member & Staff Sign In" showActions={false} />
      {error ? <ErrorBanner message={error} /> : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: tc.text }]}>Sign in as</Text>
            <Text style={[styles.sectionSubtitle, { color: tc.textMuted }]}>
              YMCA Silver Spring members and staff
            </Text>
          </View>

          <View style={styles.personaGrid}>
            {DEMO_PERSONAS.map((p) => {
              const isCurrent = directSigningIn === p.email;
              return (
                <View
                  key={p.email}
                  style={[
                    styles.personaCard,
                    {
                      backgroundColor: tc.cardBg,
                      borderColor: tc.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.personaHeader}>
                    <View style={styles.personaAvatarWrap}>
                      <View
                        style={[
                          styles.personaAvatar,
                          { backgroundColor: isDark ? '#334155' : p.badgeBg },
                        ]}
                      >
                        <Ionicons name={p.icon} size={20} color={p.badgeColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.personaName, { color: tc.text }]}>
                            {p.name}
                          </Text>
                          <View
                            style={[
                              styles.personaBadge,
                              { backgroundColor: p.badgeBg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.personaBadgeText,
                                { color: p.badgeColor },
                              ]}
                            >
                              {p.badge}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.personaRole, { color: tc.textMuted }]}>
                          {p.roleTitle}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.personaHighlights, { color: tc.textMuted }]}>
                    {p.highlights}
                  </Text>

                  <View style={styles.personaActionsRow}>
                    <Pressable
                      onPress={() => void handleDirectLaunch(p.email)}
                      disabled={loading || directSigningIn != null}
                      style={({ pressed }) => [
                        styles.quickLaunchBtn,
                        { backgroundColor: colors.primary },
                        pressed && { opacity: 0.85 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Sign in as ${p.name}`}
                    >
                      {isCurrent ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.quickLaunchBtnText}>
                            Sign in as {p.name.split(' ')[0]}
                          </Text>
                          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      onPress={() => fillDemo(p.email)}
                      style={[
                        styles.fillBtn,
                        { borderColor: tc.border, backgroundColor: tc.background },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Fill credentials for ${p.name}`}
                    >
                      <Text style={[styles.fillBtnText, { color: tc.textMuted }]}>
                        Fill Form
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Manual Credential Sign-In Section */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: tc.border }]} />
            <Text style={[styles.dividerLabel, { color: tc.textMuted }]}>
              OR SIGN IN WITH CREDENTIALS
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: tc.border }]} />
          </View>

          <View style={styles.manualForm}>
            <TextField
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              placeholder="e.g. jordan@silverspring.ymca"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              placeholder="••••••••"
            />
            <PrimaryButton
              title="Sign in with Email"
              onPress={() => void handleSignIn()}
              loading={loading}
            />
          </View>

          {/* Membership and Giving Shortcuts */}
          <View style={styles.publicLinksSection}>
            <Pressable
              onPress={() => void handleDirectLaunch('guest@silverspring.ymca')}
              style={[
                styles.joinCard,
                {
                  backgroundColor: isDark ? '#2E1F0B' : '#FFFBEB',
                  borderColor: '#F59E0B',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Visiting with a Guest Pass? Continue as Guest"
            >
              <Ionicons name="ticket-outline" size={20} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.joinTitle, { color: '#B45309' }]}>
                  Visiting with a Guest Pass?
                </Text>
                <Text style={[styles.joinSub, { color: tc.textMuted }]}>
                  Digital pass barcode, open classes & learn about the Y
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D97706" />
            </Pressable>

            <Pressable
              onPress={() => router.push('/(member)/join-membership')}
              style={[
                styles.joinCard,
                {
                  backgroundColor: isDark ? '#1E293B' : colors.primaryLight,
                  borderColor: colors.primary,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="New to YMCA? Join and Buy Membership"
            >
              <Ionicons name="id-card-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.joinTitle, { color: colors.primary }]}>
                  New to YMCA? Join & Buy Membership
                </Text>
                <Text style={[styles.joinSub, { color: tc.textMuted }]}>
                  Browse Adult, Family, Senior & more membership plans
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </Pressable>

            <Pressable
              onPress={() => router.push('/(member)/donate')}
              style={styles.donateLink}
              accessibilityRole="button"
              accessibilityLabel="Make a charitable donation to YMCA"
            >
              <Ionicons name="heart" size={16} color="#DC2626" />
              <Text style={[styles.donateLinkText, { color: colors.primary }]}>
                Support the Y: make a donation ›
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => void handleResetDemoData()}
            disabled={resetting}
            style={styles.resetLink}
            accessibilityRole="button"
            accessibilityLabel="Reset sample data"
          >
            {resetting ? (
              <ActivityIndicator size="small" color={tc.textMuted} />
            ) : (
              <Text style={[styles.resetLinkText, { color: tc.textMuted }]}>Reset sample data</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    gap: 2,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  personaGrid: {
    gap: spacing.sm + 2,
  },
  personaCard: {
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
      default: {},
    }),
  },
  personaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  personaAvatarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  personaAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaName: {
    fontSize: 15,
    fontWeight: '700',
  },
  personaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  personaBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  personaRole: {
    fontSize: 12,
    marginTop: 1,
  },
  personaHighlights: {
    fontSize: 12,
    lineHeight: 16,
  },
  personaActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  quickLaunchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
  },
  quickLaunchBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  fillBtn: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fillBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  manualForm: {
    gap: spacing.sm + 4,
  },
  publicLinksSection: {
    gap: spacing.sm,
    marginTop: 4,
  },
  joinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
  },
  joinTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  joinSub: {
    fontSize: 12,
    marginTop: 2,
  },
  donateLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  donateLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  resetLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  resetLinkText: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
