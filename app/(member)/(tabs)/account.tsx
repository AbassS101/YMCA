import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { ChatModal } from '@/components/ChatModal';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SupportTicketModal } from '@/components/SupportTicketModal';
import { TextField } from '@/components/TextField';
import { UserAvatar } from '@/components/UserAvatar';
import { YHeader } from '@/components/YHeader';
import {
  useAccessibility,
  type TextScale,
} from '@/context/AccessibilityContext';
import { useSession } from '@/context/SessionContext';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
import { cancelRequestedCopy } from '@/domain/displayDates';
import type { Member, Membership, Message, Staff, TicketType } from '@/domain/types';
import { memberRepo } from '@/repositories/memberRepo';
import { membershipRepo } from '@/repositories/membershipRepo';
import { messageRepo } from '@/repositories/messageRepo';
import { cardStyle } from '@/theme/card';
import { radii, spacing, tapTarget, typography } from '@/theme/typography';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusLabel(status: Member['status']): string {
  return status === 'active' ? 'Active' : 'Cancellation pending';
}

const SCALE_OPTIONS: { key: TextScale; label: string }[] = [
  { key: 'standard', label: 'Standard' },
  { key: 'larger', label: 'Larger' },
  { key: 'largest', label: 'Largest' },
];

const THEME_OPTIONS: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

const DEMO_ACCOUNTS = [
  {
    name: 'Jordan Hale',
    email: 'jordan@silverspring.ymca',
    role: 'YMCA Member (Active)',
    icon: 'person' as const,
    color: '#2563EB',
  },
  {
    name: 'Patricia "Pat" Nguyen',
    email: 'admin@silverspring.ymca',
    role: 'Staff Admin · Executive Director',
    icon: 'shield' as const,
    color: '#D97706',
  },
  {
    name: 'Alex Rivera',
    email: 'alex@silverspring.ymca',
    role: 'Trainer · Personal Wellness',
    icon: 'barbell' as const,
    color: '#15803D',
  },
  {
    name: 'David Chen',
    email: 'itadmin@silverspring.ymca',
    role: 'IT Admin · Chief Systems Administrator',
    icon: 'shield-checkmark' as const,
    color: '#7C3AED',
  },
];

function MenuRow({
  label,
  icon,
  onPress,
  colors,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        { borderBottomColor: colors.border },
        pressed && { backgroundColor: colors.primaryLight },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.menuLeft}>
        <Ionicons name={icon} size={24} color={colors.primary} />
        <AppText style={[styles.menuLabel, { color: colors.text }]}>{label}</AppText>
      </View>
      <AppText style={[styles.menuChevron, { color: colors.muted }]}>›</AppText>
    </Pressable>
  );
}

export default function MemberAccountScreen() {
  const router = useRouter();
  const { session, api, login, logout } = useSession();
  const { textScale, setTextScale } = useAccessibility();
  const { themeMode, setThemeMode, colors, isDark } = useTheme();
  const memberId = session?.userId ?? '';
  const [switchingEmail, setSwitchingEmail] = useState<string | null>(null);

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

  const [member, setMember] = useState<Member | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [error, setError] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [rescinding, setRescinding] = useState(false);

  // Edit Profile / Name state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Support Ticket & IT Chat State
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
    if (!activeThreadId || !memberId) return;
    try {
      const newMsg = await messageRepo.sendMessage(api, {
        threadId: activeThreadId,
        fromId: memberId,
        body,
      });
      setITMessages((prev) => [...prev, newMsg]);
    } catch {
      // ignore
    }
  };

  const load = useCallback(async () => {
    if (memberId === '') {
      return;
    }
    try {
      setError(false);
      const [nextMember, nextMembership] = await Promise.all([
        api.getMember(memberId),
        membershipRepo.getMembership(api, memberId),
      ]);
      setMember(nextMember);
      setMembership(nextMembership);
    } catch {
      setError(true);
    }
  }, [api, memberId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleStartEdit = () => {
    if (member) {
      setEditName(member.name);
      setEditPhone(member.phone);
      setProfileError(null);
      setEditModalVisible(true);
    }
  };

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setProfileError('Please enter your full name.');
      return;
    }
    setSavingProfile(true);
    setProfileError(null);
    try {
      const updated = await memberRepo.updateProfile(api, memberId, {
        name: trimmedName,
        phone: editPhone.trim(),
      });
      setMember(updated);
      setEditModalVisible(false);
      setSuccessBanner('Profile name updated successfully.');
      setTimeout(() => setSuccessBanner(null), 3500);
    } catch {
      setProfileError('Failed to update name. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateAvatar = async (nextUrl: string) => {
    if (!memberId || !api) return;
    try {
      const updated = await memberRepo.updateProfile(api, memberId, { avatarUrl: nextUrl });
      setMember(updated);
      setSuccessBanner('Profile photo & avatar updated successfully.');
      setTimeout(() => setSuccessBanner(null), 3500);
    } catch {
      // ignore
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

  const cancelBanner =
    member?.status === 'cancel_pending' &&
    membership?.lastBillDate != null &&
    membership.cancelEffectiveDate != null
      ? cancelRequestedCopy(membership.lastBillDate, membership.cancelEffectiveDate)
      : null;

  const cardTheme = {
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader subtitle="Account" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}
      <ScrollView contentContainerStyle={styles.scroll}>
        {successBanner ? (
          <View style={[styles.successBannerWrap, { backgroundColor: colors.successBg }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <AppText style={[styles.successBannerText, { color: colors.success }]}>
              {successBanner}
            </AppText>
          </View>
        ) : null}

        {member ? (
          <View style={[styles.card, cardTheme]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <UserAvatar
                uri={member.avatarUrl}
                name={member.name}
                size={62}
                editable
                onSavePhoto={handleUpdateAvatar}
              />
              <View style={{ flex: 1 }}>
                <AppText style={[styles.name, { color: colors.text }]}>{member.name}</AppText>
                <AppText style={[styles.meta, { color: colors.textMuted }]}>{member.email}</AppText>
                <AppText style={[styles.meta, { color: colors.textMuted }]}>{member.phone}</AppText>
                <AppText style={{ fontSize: 11, color: colors.primary, marginTop: 2, fontWeight: '600' }}>
                  Tap photo to change avatar or silhouette ›
                </AppText>
              </View>
              <Pressable
                onPress={handleStartEdit}
                style={[styles.changePlanPill, { backgroundColor: colors.primaryLight }]}
                accessibilityRole="button"
                accessibilityLabel="Edit profile name"
              >
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <AppText style={[styles.changePlanText, { color: colors.primary }]}>
                  Edit Name
                </AppText>
              </Pressable>
            </View>
          </View>
        ) : null}

        {member && membership ? (
          <View style={[styles.card, cardTheme]}>
            <View style={styles.membershipCardHeader}>
              <View>
                <AppText style={[styles.sectionTitle, { color: colors.text }]}>Membership</AppText>
                <AppText style={[styles.row, { color: colors.text }]}>ID {member.membershipId}</AppText>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable
                  onPress={() => router.push('/(member)/manage-membership')}
                  style={[styles.changePlanPill, { backgroundColor: colors.primaryLight }]}
                  accessibilityRole="button"
                  accessibilityLabel="Manage membership hub"
                >
                  <Ionicons name="settings-outline" size={15} color={colors.primary} />
                  <AppText style={[styles.changePlanText, { color: colors.primary }]}>
                    Manage
                  </AppText>
                </Pressable>

                <Pressable
                  onPress={() => router.push('/(member)/change-membership')}
                  style={[styles.changePlanPill, { backgroundColor: colors.primaryLight }]}
                  accessibilityRole="button"
                  accessibilityLabel="Change membership plan"
                >
                  <Ionicons name="swap-horizontal" size={15} color={colors.primary} />
                  <AppText style={[styles.changePlanText, { color: colors.primary }]}>
                    Change
                  </AppText>
                </Pressable>
              </View>
            </View>

            <AppText style={[styles.row, { color: colors.text, fontWeight: '700' }]}>
              {member.type} Plan · {formatCents(membership.monthlyAmountCents)}/mo
            </AppText>
            <AppText style={[styles.row, { color: colors.text }]}>
              Status: {statusLabel(member.status)}
            </AppText>

            {membership.pendingChange ? (
              <View style={{ marginTop: 8, padding: 8, borderRadius: 6, backgroundColor: colors.goldBg }}>
                <AppText style={{ fontSize: 13, color: '#92400E', fontWeight: '700' }}>
                  Scheduled Switch to {membership.pendingChange.planName}
                </AppText>
                <AppText style={{ fontSize: 12, color: '#78350F', marginTop: 2 }}>
                  Takes effect next month on {membership.pendingChange.effectiveDate}.
                </AppText>
              </View>
            ) : null}

            {member.status === 'cancel_pending' ? (
              <View style={{ marginTop: 10 }}>
                {cancelBanner ? (
                  <AppText style={[styles.cancelBanner, { marginBottom: 8 }]}>{cancelBanner}</AppText>
                ) : null}
                <PrimaryButton
                  title={rescinding ? 'Restoring...' : 'Keep My Membership (Rescind Notice)'}
                  onPress={async () => {
                    setRescinding(true);
                    try {
                      await membershipRepo.rescindCancel(api, memberId);
                      await load();
                    } finally {
                      setRescinding(false);
                    }
                  }}
                  loading={rescinding}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {membership ? (
          <View style={[styles.card, cardTheme]}>
            <View style={styles.membershipCardHeader}>
              <AppText style={[styles.sectionTitle, { color: colors.text }]}>Payment method</AppText>
              <Pressable
                onPress={() => router.push('/(member)/update-payment')}
                style={[styles.changePlanPill, { backgroundColor: colors.primaryLight }]}
                accessibilityRole="button"
                accessibilityLabel="Update payment method"
              >
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <AppText style={[styles.changePlanText, { color: colors.primary }]}>
                  Update
                </AppText>
              </Pressable>
            </View>
            <AppText style={[styles.row, { color: colors.text }]}>
              {membership.paymentBrand} •••• {membership.paymentLast4}
            </AppText>
          </View>
        ) : null}

        {/* Appearance & Color Theme */}
        <View style={[styles.card, cardTheme]}>
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>
            Appearance & Theme
          </AppText>
          <AppText style={[styles.meta, { color: colors.textMuted }]}>
            Choose Light mode, Dark mode, or follow your device settings.
          </AppText>
          <View style={styles.scaleRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = themeMode === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setThemeMode(opt.key);
                  }}
                  style={[
                    styles.scaleChip,
                    {
                      backgroundColor: active ? colors.primary : colors.cardBg,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${opt.label} theme`}
                >
                  <View style={styles.chipInner}>
                    <Ionicons
                      name={opt.icon}
                      size={18}
                      color={active ? '#FFFFFF' : colors.text}
                    />
                    <AppText
                      style={[
                        styles.scaleChipText,
                        {
                          color: active ? '#FFFFFF' : colors.text,
                          fontWeight: active ? '700' : '600',
                        },
                      ]}
                    >
                      {opt.label}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Accessibility: Text Size */}
        <View style={[styles.card, cardTheme]}>
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>Text size</AppText>
          <AppText style={[styles.meta, { color: colors.textMuted }]}>
            Larger text makes the app easier to read.
          </AppText>
          <View style={styles.scaleRow}>
            {SCALE_OPTIONS.map((opt) => {
              const active = textScale === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setTextScale(opt.key);
                  }}
                  style={[
                    styles.scaleChip,
                    {
                      backgroundColor: active ? colors.primary : colors.cardBg,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Text size ${opt.label}`}
                >
                  <AppText
                    style={[
                      styles.scaleChipText,
                      {
                        color: active ? '#FFFFFF' : colors.text,
                        fontWeight: active ? '700' : '600',
                      },
                    ]}
                  >
                    {opt.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Help, Feature Requests & IT Support Desk Card */}
        <View style={[styles.card, cardTheme]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="construct-outline" size={22} color={colors.primary} />
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>
              App Feedback & IT Support Desk
            </AppText>
          </View>
          <AppText style={[styles.meta, { color: colors.textMuted }]}>
            Log a problem, suggest a feature, or start a direct live chat with YMCA IT Systems.
          </AppText>

          <View style={styles.supportBtnRow}>
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
              <Ionicons name="bulb-outline" size={18} color="#16A34A" />
              <AppText style={[styles.supportActionBtnText, { color: '#16A34A' }]}>
                Request Feature
              </AppText>
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
              <Ionicons name="warning-outline" size={18} color={colors.scarlet} />
              <AppText style={[styles.supportActionBtnText, { color: colors.scarlet }]}>
                Report Problem
              </AppText>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              setSupportInitialType('problem_report');
              setSupportModalVisible(true);
            }}
            style={[styles.ticketHistoryBtn, { borderColor: colors.border }]}
            accessibilityRole="button"
          >
            <Ionicons name="file-tray-full-outline" size={16} color={colors.primary} />
            <AppText style={[styles.ticketHistoryText, { color: colors.primary }]}>
              View My Support Tickets & Status ›
            </AppText>
          </Pressable>
        </View>

        <View style={[styles.menu, cardTheme]}>
          <MenuRow
            label="Manage Membership & Billing"
            icon="settings-outline"
            onPress={() => router.push('/(member)/manage-membership')}
            colors={colors}
          />
          <MenuRow
            label="Change membership plan"
            icon="swap-horizontal"
            onPress={() => router.push('/(member)/change-membership')}
            colors={colors}
          />
          <MenuRow
            label="Buy / Add Membership Plan"
            icon="add-circle-outline"
            onPress={() => router.push('/(member)/join-membership')}
            colors={colors}
          />
          <MenuRow
            label="Community Events & Noticeboard"
            icon="calendar"
            onPress={() => router.push('/(member)/events')}
            colors={colors}
          />
          <MenuRow
            label="General Community Forum & Staff Q&A"
            icon="chatbubbles"
            onPress={() => router.push('/(member)/community-forum')}
            colors={colors}
          />
          <MenuRow
            label="Announcements & Notifications"
            icon="notifications"
            onPress={() => router.push('/(member)/notifications')}
            colors={colors}
          />
          <MenuRow
            label="Notification Preferences & Alerts"
            icon="settings-outline"
            onPress={() => router.push('/(member)/notification-settings')}
            colors={colors}
          />
          <MenuRow
            label="Give & Community Support (Case for Support 2026)"
            icon="heart"
            onPress={() => router.push('/(member)/donate')}
            colors={colors}
          />
          <MenuRow
            label="Branch amenities & pool hours"
            icon="water"
            onPress={() => router.push('/(member)/branch-amenities')}
            colors={colors}
          />
          <MenuRow
            label="Programs & Community Health"
            icon="fitness"
            onPress={() => router.push('/(member)/programs')}
            colors={colors}
          />
          <MenuRow
            label="Guest passes & reciprocity"
            icon="ticket"
            onPress={() => router.push('/(member)/guest-pass')}
            colors={colors}
          />
          <MenuRow
            label="Update payment method"
            icon="card"
            onPress={() => router.push('/(member)/update-payment')}
            colors={colors}
          />
          <MenuRow
            label="Cancel membership"
            icon="close-circle"
            onPress={() => router.push('/(member)/cancel')}
            colors={colors}
          />
          <MenuRow
            label="About"
            icon="information-circle"
            onPress={() => router.push('/(member)/about')}
            colors={colors}
          />
        </View>

        <View style={[styles.card, cardTheme]}>
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>YMCA Silver Spring</AppText>
          <AppText style={[styles.row, { color: colors.text }]}>9800 Hastings Drive, Silver Spring, MD 20901</AppText>
          <AppText style={[styles.row, { color: colors.text }]}>Phone: (301) 585-2120</AppText>
          <AppText style={[styles.row, { color: colors.text }]}>Email: silverspring@ymcadc.org</AppText>
          <AppText style={[styles.meta, { color: colors.textMuted, marginTop: 4 }]}>
            Questions about classes, heated pool schedules, senior programs, or accessibility accommodations? Our Member Services team is here to assist you anytime.
          </AppText>
          <View style={{ marginTop: 8 }}>
            <PrimaryButton
              title="Explore Amenities & Pool Schedules"
              onPress={() => router.push('/(member)/branch-amenities')}
              accessibilityHint="View facility amenities"
            />
          </View>
        </View>

        {/* Client Demo Persona Switcher */}
        <View style={[styles.card, cardTheme]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="sparkles" size={22} color={colors.primary} />
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>
              Client Presentation: Switch Role
            </AppText>
          </View>
          <AppText style={[styles.meta, { color: colors.textMuted }]}>
            Switch instantly between member, trainer, and director roles without logging out.
          </AppText>

          <View style={{ gap: 8, marginTop: 6 }}>
            {DEMO_ACCOUNTS.map((acc) => {
              const isCurrent = member?.email === acc.email;
              const isSwitching = switchingEmail === acc.email;
              return (
                <Pressable
                  key={acc.email}
                  onPress={() => void handleSwitchAccount(acc.email)}
                  disabled={isCurrent || switchingEmail !== null}
                  style={({ pressed }) => [
                    styles.demoAccountRow,
                    {
                      borderColor: isCurrent ? colors.primary : colors.border,
                      backgroundColor: isCurrent ? colors.primaryLight : colors.cardBg,
                    },
                    pressed && !isCurrent && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${acc.name} (${acc.role})`}
                >
                  <View style={[styles.demoAccountIcon, { backgroundColor: `${acc.color}20` }]}>
                    <Ionicons name={acc.icon as any} size={20} color={acc.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={[styles.demoAccountName, { color: colors.text }]}>
                      {acc.name}
                    </AppText>
                    <AppText style={[styles.demoAccountRole, { color: colors.textMuted }]}>
                      {acc.role}
                    </AppText>
                  </View>
                  {isSwitching ? (
                    <AppText style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>
                      Switching...
                    </AppText>
                  ) : isCurrent ? (
                    <View style={[styles.currentBadge, { backgroundColor: colors.primaryLight }]}>
                      <AppText style={[styles.currentBadgeText, { color: colors.primary }]}>
                        CURRENT
                      </AppText>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <PrimaryButton title="Log out" onPress={() => void handleLogout()} loading={loggingOut} />
      </ScrollView>

      {/* Edit Profile Name Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!savingProfile) setEditModalVisible(false);
        }}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => {
              if (!savingProfile) setEditModalVisible(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss modal background"
          />
          <View
            style={[
              styles.editModalCard,
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleWrap}>
                <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
                <AppText style={[styles.modalTitle, { color: colors.text }]}>
                  Edit Profile Name
                </AppText>
              </View>
              <Pressable
                onPress={() => setEditModalVisible(false)}
                disabled={savingProfile}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <AppText style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              Update how your name appears on your member ID barcode, class rosters, and staff messages.
            </AppText>

            <View style={styles.formWrap}>
              <TextField
                label="Full Name"
                value={editName}
                onChangeText={(val) => {
                  setEditName(val);
                  if (profileError) setProfileError(null);
                }}
                placeholder="e.g. Jane Doe"
                autoCapitalize="words"
                autoCorrect={false}
                error={profileError ?? undefined}
              />
              <TextField
                label="Phone Number"
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="(555) 000-0000"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => setEditModalVisible(false)}
                disabled={savingProfile}
                style={[
                  styles.cancelBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: isDark ? colors.cardBg : colors.white,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Cancel edit"
              >
                <AppText style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</AppText>
              </Pressable>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title="Save Name"
                  onPress={() => void handleSaveProfile()}
                  loading={savingProfile}
                  disabled={!editName.trim()}
                  accessibilityHint="Saves updated name"
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Support Ticket Modal */}
      <SupportTicketModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
        userId={memberId}
        userName={member?.name ?? 'Jordan Hale'}
        userEmail={member?.email ?? 'jordan@silverspring.ymca'}
        userRole="member"
        api={api}
        initialType={supportInitialType}
        onOpenITChat={handleOpenITChat}
      />

      {/* IT Live Chat Modal */}
      <ChatModal
        visible={chatModalVisible}
        onClose={() => setChatModalVisible(false)}
        recipient={activeITStaff}
        messages={itMessages}
        currentUserId={memberId}
        onSend={handleSendITMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    ...cardStyle,
    gap: 6,
  },
  membershipCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  changePlanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.chip,
  },
  changePlanText: {
    ...typography.caption,
    fontWeight: '700',
  },
  name: {
    ...typography.title,
    fontSize: 20,
  },
  meta: {
    ...typography.body,
  },
  sectionTitle: {
    ...typography.bodyStrong,
    marginBottom: 4,
  },
  row: {
    ...typography.body,
  },
  cancelBanner: {
    ...typography.body,
    color: '#EF4444',
    marginTop: 8,
    fontWeight: '600',
  },
  scaleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  scaleChip: {
    minHeight: tapTarget,
    paddingHorizontal: 16,
    borderRadius: radii.chip,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scaleChipText: {
    ...typography.body,
    fontSize: 15,
  },
  supportBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  supportActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: radii.button,
    borderWidth: 1.5,
  },
  supportActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  ticketHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radii.button,
    borderWidth: 1,
    marginTop: 4,
  },
  ticketHistoryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  menu: {
    ...cardStyle,
    padding: 0,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: tapTarget,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuLabel: {
    ...typography.body,
  },
  menuChevron: {
    ...typography.body,
    fontSize: 22,
    lineHeight: 22,
  },
  successBannerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderRadius: radii.card,
    marginBottom: spacing.xs,
  },
  successBannerText: {
    ...typography.bodyStrong,
    fontSize: 14,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalDismissArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  editModalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: radii.card,
    borderWidth: 1.5,
    padding: spacing.xl,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    ...typography.title,
    fontSize: 20,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  formWrap: {
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    minHeight: tapTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.button,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    ...typography.bodyStrong,
    fontSize: 15,
  },
  demoAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  demoAccountIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoAccountName: {
    fontSize: 14,
    fontWeight: '700',
  },
  demoAccountRole: {
    fontSize: 12,
    marginTop: 1,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
