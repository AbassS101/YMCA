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
    name: 'Jordan Hale',
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
    name: 'Jane Smith',
    email: 'admin@silverspring.ymca',
    roleTitle: 'Director · Staff Admin',
    badge: 'DIRECTOR',
    badgeBg: '#FEF3C7',
    badgeColor: '#B45309',
    borderColor: '#F59E0B',
    icon: 'star' as const,
    highlights: 'Facility notices, membership cancel approvals, staff & schedule oversight',
  },
  {
    name: 'Alex Rivera',
    email: 'alex@silverspring.ymca',
    roleTitle: 'Lead Personal Trainer · Wellness',
    badge: 'TRAINER',
    badgeBg: '#DCFCE7',
    badgeColor: '#15803D',
    borderColor: '#22C55E',
    icon: 'barbell' as const,
    highlights: 'Class rosters, 1-on-1 private lesson slots, client messaging',
  },
  {
    name: 'David Miller',
    email: 'itadmin@silverspring.ymca',
    roleTitle: 'IT Systems Administrator · IT',
    badge: 'IT ADMIN',
    badgeBg: '#FAF5FF',
    badgeColor: '#7C3AED',
    borderColor: '#8B5CF6',
    icon: 'shield-checkmark' as const,
    highlights: 'System configuration, staff accounts, IT tickets, tech access',
  },
];

function routeForRole(role: UserRole): '/(member)/home' | '/(staff)/today' {
  return role === 'member' ? '/(member)/home' : '/(staff)/today';
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
      setError('Invalid email or password. You can also use 1-tap demo login below.');
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
      setError('Could not sign in with demo account.');
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
      title: 'Reset Demo Environment',
      message:
        'Restore all schedules, memberships, cancellations, and support tickets to the original presentation seed state?',
      icon: 'alert',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All Data',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              await resetStore();
              setEmail('');
              setPassword('');
              setError(null);
              dialog.alert(
                'Demo Data Restored',
                'The local database has been restored to pristine initial seed state.',
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
          {/* Client Presentation Banner */}
          <View
            style={[
              styles.showcaseBanner,
              {
                backgroundColor: isDark ? '#1E293B' : '#F0FDF4',
                borderColor: isDark ? '#334155' : '#86EFAC',
              },
            ]}
          >
            <View style={styles.showcaseTopRow}>
              <View style={styles.showcaseIconPill}>
                <Ionicons name="sparkles" size={16} color="#16A34A" />
                <Text style={styles.showcasePillText}>CLIENT DEMO SHOWCASE</Text>
              </View>
              <Text style={[styles.showcaseBranch, { color: tc.textMuted }]}>
                Silver Spring Branch
              </Text>
            </View>
            <Text style={[styles.showcaseText, { color: tc.text }]}>
              Pre-loaded with live schedules, class rosters, digital scan pass, and branch governance. Tap any persona below for instant 1-tap sign in.
            </Text>
          </View>

          {/* 1-Tap Demo Persona Launchers */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: tc.text }]}>
              1-Tap Demo Persona Access
            </Text>
            <Text style={[styles.sectionSubtitle, { color: tc.textMuted }]}>
              Instant login without typing credentials
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
                      accessibilityLabel={`1-Tap Sign In as ${p.name}`}
                    >
                      {isCurrent ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.quickLaunchBtnText}>
                            Launch as {p.name.split(' ')[0]}
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
                  Browse Adult, Family, Senior & Community Assistance plans
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
                Support Our Cause: Make a Charitable Donation ›
              </Text>
            </Pressable>
          </View>

          {/* Demo Control Center */}
          <View
            style={[
              styles.demoResetWrap,
              { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
            ]}
          >
            <View style={styles.resetHeaderRow}>
              <Ionicons name="refresh-circle" size={22} color={colors.scarlet} />
              <Text style={[styles.resetTitle, { color: tc.text }]}>
                Demo Data Reset
              </Text>
            </View>
            <Text style={[styles.resetDesc, { color: tc.textMuted }]}>
              Restore mock rosters, schedules, and test accounts to original seed state before or after a client pitch.
            </Text>
            <Pressable
              onPress={() => void handleResetDemoData()}
              disabled={resetting}
              style={[styles.resetBtn, { borderColor: colors.scarlet }]}
              accessibilityRole="button"
              accessibilityLabel="Reset demo data to initial state"
            >
              {resetting ? (
                <ActivityIndicator size="small" color={colors.scarlet} />
              ) : (
                <Text style={styles.resetBtnText}>
                  Reset Demo Data to Initial State
                </Text>
              )}
            </Pressable>
          </View>
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
  showcaseBanner: {
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    gap: 8,
  },
  showcaseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  showcaseIconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  showcasePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  showcaseBranch: {
    fontSize: 12,
    fontWeight: '600',
  },
  showcaseText: {
    fontSize: 13,
    lineHeight: 18,
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
  demoResetWrap: {
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
  },
  resetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resetTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  resetDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  resetBtn: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  resetBtnText: {
    color: colors.scarlet,
    fontSize: 13,
    fontWeight: '700',
  },
});
