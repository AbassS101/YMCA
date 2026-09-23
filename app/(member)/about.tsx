import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { resetStore } from '@/storage/demoStore';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii, spacing, typography } from '@/theme/typography';

const BRANCH_NAME = 'YMCA Silver Spring';
const ASSOCIATION = 'YMCA of Metropolitan Washington';
const ADDRESS = '9800 Hastings Drive, Silver Spring, MD 20901';
const PHONE = '(301) 585-2120';
const EMAIL = 'silverspring@ymcadc.org';

const PILLARS = [
  {
    title: 'Youth Development',
    subtitle: 'Nurturing the potential of every child & teen',
    description:
      'Empowering children through safe, high-quality afterschool programs, summer day camps, youth swim academy, and complimentary Child Watch while parents exercise.',
    icon: 'school' as const,
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    title: 'Healthy Living',
    subtitle: 'Improving the nation’s health and well-being',
    description:
      'Over 85 weekly group fitness classes, warm water joint mobility therapy, state-of-the-art cardio and strength equipment, certified personal coaching, and active older adult vitality.',
    icon: 'heart' as const,
    color: '#DC2626',
    bg: '#FEF2F2',
  },
  {
    title: 'Social Responsibility',
    subtitle: 'Giving back and providing support to neighbors',
    description:
      'Ensuring nobody is turned away due to inability to pay through our Open Doors sliding-scale financial assistance, community outreach, and philanthropic donor partnerships.',
    icon: 'people' as const,
    color: '#15803D',
    bg: '#F0FDF4',
  },
];

const METRICS = [
  { label: 'Active Members', value: '4,200+' },
  { label: 'Weekly Classes', value: '85+' },
  { label: 'Heated Pools', value: '2' },
  { label: 'Certified Staff', value: '50+' },
];

const AMENITIES = [
  { name: '25m Heated Lap Pool', icon: 'water-outline' as const },
  { name: 'Warm Water Therapy Pool', icon: 'sunny-outline' as const },
  { name: 'Cardio & Free Weight Floor', icon: 'barbell-outline' as const },
  { name: 'Dry Saunas & Steam Rooms', icon: 'flame-outline' as const },
  { name: 'Free Child Watch (w/ Membership)', icon: 'happy-outline' as const },
  { name: 'Pickleball & Basketball Gym', icon: 'tennisball-outline' as const },
  { name: 'Mind & Body Yoga Studio', icon: 'flower-outline' as const },
  { name: 'Cycling & Spin Theater', icon: 'bicycle-outline' as const },
];

const DEMO_ROLES = [
  {
    name: 'Jordan Hale',
    email: 'jordan@silverspring.ymca',
    role: 'Member',
    color: '#2563EB',
    icon: 'person' as const,
  },
  {
    name: 'Jane Smith',
    email: 'admin@silverspring.ymca',
    role: 'Staff Admin · Director',
    color: '#D97706',
    icon: 'star' as const,
  },
  {
    name: 'Alex Rivera',
    email: 'alex@silverspring.ymca',
    role: 'Trainer · Wellness',
    color: '#15803D',
    icon: 'barbell' as const,
  },
  {
    name: 'David Miller',
    email: 'itadmin@silverspring.ymca',
    role: 'IT Admin · Chief Systems',
    color: '#7C3AED',
    icon: 'shield-checkmark' as const,
  },
];

export default function AboutScreen() {
  const router = useRouter();
  const { session, login, logout } = useSession();
  const { colors: tc, isDark } = useTheme();

  const [resetting, setResetting] = useState(false);
  const [switchingRole, setSwitchingRole] = useState<string | null>(null);

  async function handleResetData() {
    dialog.show({
      title: 'Reset Demo Data',
      message:
        'This will restore all seed rosters, bookings, cancellation records, and tickets to pristine baseline state. Continue?',
      icon: 'alert',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset & Sign Out',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              await resetStore();
              await logout();
              router.replace('/login');
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    });
  }

  async function handleSwitchRole(email: string) {
    setSwitchingRole(email);
    try {
      const next = await login(email, 'ymca-demo');
      if (next.role === 'member') {
        router.replace('/(member)/home');
      } else {
        router.replace('/(staff)/today');
      }
    } finally {
      setSwitchingRole(null);
    }
  }

  const handleCall = () => {
    Linking.openURL('tel:3015852120').catch(() => {});
  };

  const handleEmail = () => {
    Linking.openURL('mailto:silverspring@ymcadc.org').catch(() => {});
  };

  const handleDirections = () => {
    const url = Platform.select({
      ios: 'maps:0,0?q=YMCA+Silver+Spring+MD',
      android: 'geo:0,0?q=9800+Hastings+Drive+Silver+Spring+MD+20901',
      default: 'https://maps.google.com/?q=9800+Hastings+Drive+Silver+Spring+MD+20901',
    });
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle="About & Platform Showcase" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Navigation Back */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to previous screen"
        >
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
          <AppText style={[styles.backText, { color: colors.primary }]}>Back</AppText>
        </Pressable>

        {/* Hero Card */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadgeWrap}>
              <Ionicons name="ribbon" size={16} color={colors.primary} />
              <AppText style={[styles.heroBadgeText, { color: colors.primary }]}>
                CAUSE-DRIVEN NONPROFIT
              </AppText>
            </View>
            <View style={[styles.statusPill, { backgroundColor: colors.successBg }]}>
              <AppText style={[styles.statusPillText, { color: colors.success }]}>
                OPEN TODAY
              </AppText>
            </View>
          </View>

          <AppText style={[styles.branchTitle, { color: tc.text }]}>{BRANCH_NAME}</AppText>
          <AppText style={[styles.branchSub, { color: tc.textMuted }]}>{ASSOCIATION}</AppText>
          <AppText style={[styles.missionQuote, { color: tc.text }]}>
            “The Y is a cause-driven nonprofit strengthening community through youth development, healthy living, and social responsibility.”
          </AppText>

          {/* Quick Metrics */}
          <View style={styles.metricsRow}>
            {METRICS.map((m, idx) => (
              <View key={idx} style={[styles.metricBox, { borderColor: tc.border }]}>
                <AppText style={[styles.metricVal, { color: colors.primary }]}>
                  {m.value}
                </AppText>
                <AppText style={[styles.metricLbl, { color: tc.textMuted }]}>
                  {m.label}
                </AppText>
              </View>
            ))}
          </View>
        </View>

        {/* The Three Pillars Section */}
        <View style={styles.sectionWrap}>
          <AppText style={[styles.sectionTitle, { color: tc.text }]}>
            Our Three Cause Pillars
          </AppText>
          <AppText style={[styles.sectionSubtitle, { color: tc.textMuted }]}>
            How YMCA Silver Spring empowers individuals, families, and community
          </AppText>

          <View style={{ gap: spacing.sm }}>
            {PILLARS.map((p, idx) => (
              <View
                key={idx}
                style={[
                  styles.pillarCard,
                  { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
                ]}
              >
                <View style={styles.pillarHeader}>
                  <View
                    style={[
                      styles.pillarIconCircle,
                      { backgroundColor: isDark ? '#1E293B' : p.bg },
                    ]}
                  >
                    <Ionicons name={p.icon} size={20} color={p.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={[styles.pillarTitle, { color: tc.text }]}>
                      {p.title}
                    </AppText>
                    <AppText style={[styles.pillarSub, { color: p.color }]}>
                      {p.subtitle}
                    </AppText>
                  </View>
                </View>
                <AppText style={[styles.pillarDesc, { color: tc.textMuted }]}>
                  {p.description}
                </AppText>
              </View>
            ))}
          </View>
        </View>

        {/* Branch Amenities Grid */}
        <View style={styles.sectionWrap}>
          <AppText style={[styles.sectionTitle, { color: tc.text }]}>
            Facility Amenities & Aquatics
          </AppText>
          <AppText style={[styles.sectionSubtitle, { color: tc.textMuted }]}>
            Modern fitness, heated pools, and family support spaces
          </AppText>

          <View style={styles.amenitiesGrid}>
            {AMENITIES.map((a, idx) => (
              <View
                key={idx}
                style={[
                  styles.amenityItem,
                  { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
                ]}
              >
                <Ionicons name={a.icon} size={18} color={colors.primary} />
                <AppText style={[styles.amenityName, { color: tc.text }]}>{a.name}</AppText>
              </View>
            ))}
          </View>
        </View>

        {/* Operating Hours & Contact */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
          ]}
        >
          <AppText style={[styles.infoTitle, { color: tc.text }]}>
            Operating Hours & Location
          </AppText>

          <View style={styles.hoursBlock}>
            <View style={styles.hourRow}>
              <AppText style={[styles.hourDay, { color: tc.text }]}>Monday – Friday:</AppText>
              <AppText style={[styles.hourTime, { color: tc.textMuted }]}>
                5:30 AM – 10:00 PM
              </AppText>
            </View>
            <View style={styles.hourRow}>
              <AppText style={[styles.hourDay, { color: tc.text }]}>Saturday:</AppText>
              <AppText style={[styles.hourTime, { color: tc.textMuted }]}>
                7:00 AM – 8:00 PM
              </AppText>
            </View>
            <View style={styles.hourRow}>
              <AppText style={[styles.hourDay, { color: tc.text }]}>Sunday:</AppText>
              <AppText style={[styles.hourTime, { color: tc.textMuted }]}>
                8:00 AM – 8:00 PM
              </AppText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: tc.border }]} />

          <View style={styles.contactBlock}>
            <AppText style={[styles.contactAddress, { color: tc.text }]}>{ADDRESS}</AppText>
            <AppText style={[styles.contactDetail, { color: tc.textMuted }]}>
              Phone: {PHONE} · {EMAIL}
            </AppText>
          </View>

          <View style={styles.actionBtnRow}>
            <Pressable
              onPress={handleCall}
              style={[styles.contactBtn, { backgroundColor: colors.primaryLight }]}
              accessibilityRole="button"
              accessibilityLabel="Call Front Desk"
            >
              <Ionicons name="call-outline" size={16} color={colors.primary} />
              <AppText style={[styles.contactBtnText, { color: colors.primary }]}>Call</AppText>
            </Pressable>

            <Pressable
              onPress={handleDirections}
              style={[styles.contactBtn, { backgroundColor: colors.primaryLight }]}
              accessibilityRole="button"
              accessibilityLabel="Get Directions"
            >
              <Ionicons name="navigate-outline" size={16} color={colors.primary} />
              <AppText style={[styles.contactBtnText, { color: colors.primary }]}>
                Directions
              </AppText>
            </Pressable>

            <Pressable
              onPress={handleEmail}
              style={[styles.contactBtn, { backgroundColor: colors.primaryLight }]}
              accessibilityRole="button"
              accessibilityLabel="Send Email"
            >
              <Ionicons name="mail-outline" size={16} color={colors.primary} />
              <AppText style={[styles.contactBtnText, { color: colors.primary }]}>Email</AppText>
            </Pressable>
          </View>
        </View>

        {/* Client Demo Toolkit & Role Switcher */}
        <View
          style={[
            styles.demoBox,
            { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
          ]}
        >
          <View style={styles.demoTitleRow}>
            <Ionicons name="sparkles" size={20} color={colors.primary} />
            <AppText style={[styles.demoTitle, { color: tc.text }]}>
              Client Presentation Showcase
            </AppText>
          </View>

          <AppText style={[styles.demoDesc, { color: tc.textMuted }]}>
            Demonstrate the mobile experience across key stakeholders. Switch personas on the fly or reset test data back to clean baseline state.
          </AppText>

          {/* Persona Switcher Chips */}
          <AppText style={[styles.demoSubhead, { color: tc.text }]}>
            Switch Demo Role Instantly:
          </AppText>
          <View style={styles.rolesGrid}>
            {DEMO_ROLES.map((r) => {
              const active = session?.userId?.includes(r.name.toLowerCase().split(' ')[0]);
              const isSwitching = switchingRole === r.email;
              return (
                <Pressable
                  key={r.email}
                  onPress={() => void handleSwitchRole(r.email)}
                  disabled={switchingRole != null}
                  style={[
                    styles.roleChip,
                    {
                      borderColor: active ? colors.primary : tc.border,
                      backgroundColor: active ? colors.primaryLight : tc.background,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${r.name}`}
                >
                  <Ionicons name={r.icon} size={16} color={r.color} />
                  <View style={{ flex: 1 }}>
                    <AppText style={[styles.roleChipName, { color: tc.text }]}>
                      {r.name}
                    </AppText>
                    <AppText style={[styles.roleChipSub, { color: tc.textMuted }]}>
                      {r.role}
                    </AppText>
                  </View>
                  {isSwitching ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : active ? (
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={14} color={tc.muted} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Technical Specs Pill */}
          <View
            style={[
              styles.techSpecsPill,
              { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' },
            ]}
          >
            <AppText style={[styles.techSpecsTitle, { color: tc.text }]}>
              Platform Capabilities
            </AppText>
            <AppText style={[styles.techSpecsList, { color: tc.textMuted }]}>
              • Protivity Port/Adapter Architecture{'\n'}
              • Offline-Resilient Seed Storage{'\n'}
              • Live Rosters & Private Lesson Booking Engine{'\n'}
              • Dynamic WCAG AA Text Scaling & Theme Engine{'\n'}
              • Multi-Tier Membership Change & Retention Flow
            </AppText>
          </View>

          <PrimaryButton
            title="Reset Demo Data to Initial State"
            onPress={() => void handleResetData()}
            loading={resetting}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.md + 4,
    paddingBottom: 48,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  backText: {
    ...typography.body,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: radii.card,
    padding: spacing.md + 2,
    borderWidth: 1,
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  branchTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  branchSub: {
    fontSize: 13,
    marginTop: -4,
  },
  missionQuote: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  metricBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricLbl: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionWrap: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  pillarCard: {
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    gap: 8,
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pillarIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  pillarSub: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  pillarDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    width: '48%',
    flexGrow: 1,
  },
  amenityName: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  infoCard: {
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1,
    gap: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  hoursBlock: {
    gap: 6,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hourDay: {
    fontSize: 13,
    fontWeight: '600',
  },
  hourTime: {
    fontSize: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  contactBlock: {
    gap: 2,
  },
  contactAddress: {
    fontSize: 13,
    fontWeight: '700',
  },
  contactDetail: {
    fontSize: 12,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.sm,
  },
  contactBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  demoBox: {
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1,
    gap: 12,
  },
  demoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  demoDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  demoSubhead: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  rolesGrid: {
    gap: 8,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  roleChipName: {
    fontSize: 13,
    fontWeight: '700',
  },
  roleChipSub: {
    fontSize: 11,
  },
  techSpecsPill: {
    padding: 10,
    borderRadius: radii.sm,
    gap: 4,
  },
  techSpecsTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  techSpecsList: {
    fontSize: 11,
    lineHeight: 16,
  },
});
