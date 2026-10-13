import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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
import { TrainerClientWorkoutModal } from '@/components/TrainerClientWorkoutModal';
import { UserAvatar } from '@/components/UserAvatar';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { formatShortDate } from '@/domain/displayDates';
import {
  YMCA_MEMBERSHIP_PLANS,
  type ClientFitnessGoal,
  type Member,
  type Membership,
} from '@/domain/types';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { PersonaBanner } from '@/components/staff/PersonaBanner';
import { membershipRepo } from '@/repositories/membershipRepo';
import { trainerRepo } from '@/repositories/trainerRepo';
import { cardStyle } from '@/theme/card';
import { type ThemeColors } from '@/theme/colors';
import { typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

type MemberRow = { member: Member; membership: Membership };

function statusLabel(status: Member['status']): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'paused':
      return 'Paused';
    case 'cancel_pending':
      return 'Cancellation Pending';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export default function StaffMembersScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const staffId = session?.userId ?? '';
  const { colors: tc } = useTheme();
  const colors = tc;
  const styles = useMemo(() => makeStyles(tc), [tc]);
  const { can, coachesClients, isAdmin, isITAdmin, isMembershipDirector, isWellnessDirector, theme } =
    useStaffCapabilities();
  const canCreateMembers = can('createMembers');
  const canLogWorkouts = can('logWorkouts');

  const [rows, setRows] = useState<MemberRow[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'assigned' | 'team' | 'unassigned'>(
    isWellnessDirector ? 'team' : coachesClients ? 'assigned' : 'all'
  );
  const [trainerNames, setTrainerNames] = useState<Record<string, string | null>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancel_pending'>('all');
  const [clientGoals, setClientGoals] = useState<Record<string, ClientFitnessGoal | null>>({});
  const [query, setQuery] = useState('');
  const [error, setError] = useState(false);

  // Trainer Workout Logging Modal
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [selectedWorkoutMember, setSelectedWorkoutMember] = useState<Member | null>(null);

  // Admin: Create Member State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPassword, setNewPassword] = useState('ymca-demo');
  const [newPlanId, setNewPlanId] = useState('adult');
  const [submittingMember, setSubmittingMember] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (staffId === '') {
      return;
    }
    try {
      setError(false);
      const allMembers = await api.listAllMembers(BRANCH_ID);
      const allMemberships = await Promise.all(
        allMembers.map(async (m) => {
          try {
            const mem = await api.getMembership(m.id);
            return { member: m, membership: mem };
          } catch {
            return null;
          }
        })
      );
      const validRows = allMemberships.filter((r): r is MemberRow => r != null);

      if (isWellnessDirector) {
        const names: Record<string, string | null> = {};
        await Promise.all(
          validRows.map(async (r) => {
            const trainer = await api.getAssignedTrainer(r.member.id).catch(() => null);
            names[r.member.id] = trainer?.name ?? null;
          })
        );
        setTrainerNames(names);
        if (filterMode === 'unassigned') {
          setRows(validRows.filter((r) => names[r.member.id] == null && r.member.status !== 'cancelled'));
          return;
        }
        if (filterMode === 'team') {
          setRows(validRows.filter((r) => names[r.member.id] != null));
          return;
        }
      }

      if (!coachesClients || filterMode === 'all') {
        setRows(validRows);
      } else {
        const assigned = await api.listAssignedMembers(staffId);
        const assignedIds = new Set(assigned.map((a) => a.id));
        setRows(validRows.filter((r) => assignedIds.has(r.member.id)));
      }

      // Load fitness goals for members
      const goalsMap: Record<string, ClientFitnessGoal | null> = {};
      await Promise.all(
        validRows.map(async (r) => {
          try {
            const g = await trainerRepo.getClientFitnessGoal(api, r.member.id);
            goalsMap[r.member.id] = g;
          } catch {
            goalsMap[r.member.id] = null;
          }
        })
      );
      setClientGoals(goalsMap);
    } catch {
      setError(true);
    }
  }, [api, staffId, coachesClients, isWellnessDirector, filterMode]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.member.status === statusFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.member.name.toLowerCase().includes(q) ||
          r.member.email.toLowerCase().includes(q) ||
          r.member.phone.toLowerCase().includes(q) ||
          r.member.membershipId.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, statusFilter, query]);

  function openCreateModal() {
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewAddress('');
    setNewPassword('ymca-demo');
    setNewPlanId('adult');
    setCreateError(null);
    setCreateModalVisible(true);
  }

  async function handleCreateMember() {
    if (!newName.trim() || !newEmail.trim() || !newPhone.trim()) {
      setCreateError('Please enter member name, email, and phone number.');
      return;
    }
    setSubmittingMember(true);
    setCreateError(null);
    try {
      await api.createMemberAdmin({
        name: newName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim(),
        address: newAddress.trim(),
        password: newPassword.trim() || 'ymca-demo',
        planId: newPlanId,
        homeBranchId: BRANCH_ID,
      });
      setCreateModalVisible(false);
      dialog.alert(
        'Member Created!',
        `${newName} has been enrolled. They can now sign in with their email.`,
        [{ text: 'OK' }],
        'checkmark'
      );
      await load();
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create member account.');
    } finally {
      setSubmittingMember(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader
        subtitle={
          isAdmin
            ? isITAdmin
              ? 'IT Admin · Member Accounts'
              : 'Staff Admin · Member Accounts'
            : isMembershipDirector
              ? 'Membership Director · Member Accounts'
              : coachesClients
                ? 'Clients & Members'
                : 'Members Directory'
        }
      />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      <View style={styles.bannerWrap}>
        <PersonaBanner
          theme={theme}
          text={
            isAdmin
              ? 'Full account, plan and delete access (override)'
              : isMembershipDirector
                ? 'You own enrollments, plan changes and cancellation decisions'
                : isWellnessDirector
                  ? 'See every client, spot unassigned members and pair them with trainers'
                  : coachesClients
                    ? 'Your assigned clients, goals and workout logs'
                    : 'Look up members for check-in and front desk help'
          }
        />
      </View>

      {canCreateMembers ? (
        <View style={styles.adminBadgeWrap}>
          <Pressable
            onPress={openCreateModal}
            style={styles.createBtn}
            accessibilityRole="button"
            accessibilityLabel="Create New Member Account"
          >
            <Ionicons name="person-add" size={18} color="#FFFFFF" />
            <Text style={styles.createBtnText}>+ New Member</Text>
          </Pressable>
        </View>
      ) : null}

      {coachesClients ? (
        <View style={[styles.tabRow, { backgroundColor: tc.cardBorder }]}>
          <Pressable
            onPress={() => setFilterMode('all')}
            style={[styles.tabBtn, filterMode === 'all' && [styles.tabBtnActive, { backgroundColor: tc.cardBg }]]}
          >
            <Text style={[styles.tabText, { color: tc.textMuted }, filterMode === 'all' && [styles.tabTextActive, { color: theme.color }]]}>
              All Members
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilterMode('assigned')}
            style={[styles.tabBtn, filterMode === 'assigned' && [styles.tabBtnActive, { backgroundColor: tc.cardBg }]]}
          >
            <Text style={[styles.tabText, { color: tc.textMuted }, filterMode === 'assigned' && [styles.tabTextActive, { color: theme.color }]]}>
              My Clients
            </Text>
          </Pressable>
          {isWellnessDirector ? (
            <Pressable
              onPress={() => setFilterMode('team')}
              style={[styles.tabBtn, filterMode === 'team' && [styles.tabBtnActive, { backgroundColor: tc.cardBg }]]}
            >
              <Text style={[styles.tabText, { color: tc.textMuted }, filterMode === 'team' && [styles.tabTextActive, { color: theme.color }]]}>
                Team Clients
              </Text>
            </Pressable>
          ) : null}
          {isWellnessDirector ? (
            <Pressable
              onPress={() => setFilterMode('unassigned')}
              style={[styles.tabBtn, filterMode === 'unassigned' && [styles.tabBtnActive, { backgroundColor: tc.cardBg }]]}
            >
              <Text style={[styles.tabText, { color: tc.textMuted }, filterMode === 'unassigned' && [styles.tabTextActive, { color: theme.color }]]}>
                Unassigned
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Status Filter Chips */}
      <View style={styles.statusChipRow}>
        {(['all', 'active', 'cancel_pending'] as const).map((st) => (
          <Pressable
            key={st}
            onPress={() => setStatusFilter(st)}
            style={[styles.statusChip, statusFilter === st && styles.statusChipActive]}
          >
            <Text style={[styles.statusChipText, statusFilter === st && styles.statusChipTextActive]}>
              {st === 'all' ? 'All Members' : st === 'active' ? 'Active' : 'Cancellation Pending'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.searchWrap}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, email, phone, or membership ID"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {filtered.length === 0 ? (
          <Text style={[styles.empty, { color: tc.textMuted }]}>
            {rows.length === 0 ? 'No members found.' : 'No matches for your search.'}
          </Text>
        ) : (
          filtered.map(({ member, membership }) => {
            const goal = clientGoals[member.id];
            return (
              <View
                key={member.id}
                style={[styles.row, { gap: 10, backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}
              >
                <Pressable
                  onPress={() => router.push(`/(staff)/members/${member.id}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  accessibilityRole="button"
                >
                  <UserAvatar uri={member.avatarUrl} name={member.name} size={46} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.name, { color: tc.text }]}>{member.name}</Text>
                      {filterMode === 'assigned' || goal ? (
                        <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: '#15803D' }}>CLIENT</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.meta, { color: tc.textMuted }]}>
                      {member.email} · {member.phone}
                    </Text>
                    <Text style={[styles.meta, { color: tc.textMuted }]}>
                      Plan: <Text style={{ fontWeight: '700', color: tc.text }}>{member.type}</Text> · ${(membership.monthlyAmountCents / 100).toFixed(2)}/mo
                    </Text>
                    {isWellnessDirector ? (
                      <Text style={[styles.meta, { color: tc.textMuted, fontWeight: '700' }]}>
                        Trainer: {trainerNames[member.id] ?? 'Unassigned'}
                      </Text>
                    ) : (
                      <Text style={[styles.meta, { color: tc.textMuted }]}>Next bill {formatShortDate(membership.nextBillingDate)}</Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          member.status === 'active'
                            ? '#F0FDF4'
                            : member.status === 'cancel_pending'
                            ? '#FEF2F2'
                            : '#F3F4F6',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color:
                            member.status === 'active'
                              ? '#15803D'
                              : member.status === 'cancel_pending'
                              ? colors.scarlet
                              : colors.muted,
                        },
                      ]}
                    >
                      {statusLabel(member.status)}
                    </Text>
                  </View>
                </Pressable>

                {/* Client Goal Preview if assigned */}
                {goal ? (
                  <View style={{ backgroundColor: '#F9FAFB', padding: 8, borderRadius: 6, marginTop: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                      🎯 Goal: {goal.primaryGoal}
                    </Text>
                    {goal.currentWeightLbs && goal.targetWeightLbs ? (
                      <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                        Weight Target: {goal.currentWeightLbs} lbs → {goal.targetWeightLbs} lbs
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {canLogWorkouts ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 8 }}>
                    <Pressable
                      onPress={() => {
                        setSelectedWorkoutMember(member);
                        setWorkoutModalVisible(true);
                      }}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        paddingVertical: 7,
                        backgroundColor: colors.primary,
                        borderRadius: 6,
                      }}
                      accessibilityRole="button"
                    >
                      <Ionicons name="barbell" size={13} color="#FFFFFF" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>+ Log Workout</Text>
                    </Pressable>

                    <Pressable
                      onPress={async () => {
                        try {
                          const thread = await api.getOrCreateThread(member.id, staffId);
                          router.push(`/(staff)/messages/${thread.id}`);
                        } catch {
                          dialog.alert('Error', 'Could not open messages.');
                        }
                      }}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        paddingVertical: 7,
                        backgroundColor: '#EFF6FF',
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: '#BFDBFE',
                      }}
                      accessibilityRole="button"
                    >
                      <Ionicons name="chatbubbles" size={13} color={colors.primary} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>Message</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => router.push(`/(staff)/members/${member.id}`)}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        paddingVertical: 7,
                        backgroundColor: '#F3F4F6',
                        borderRadius: 6,
                      }}
                      accessibilityRole="button"
                    >
                      <Ionicons name="fitness" size={13} color={colors.nearBlack} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.nearBlack }}>Goals & Logs</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Trainer Workout Logging Modal */}
      <TrainerClientWorkoutModal
        visible={workoutModalVisible}
        onClose={() => setWorkoutModalVisible(false)}
        member={selectedWorkoutMember}
        onSaved={() => void load()}
      />

      {/* ========================================== */}
      {/* MODAL: REGISTER NEW MEMBER (ADMIN) */}
      {/* ========================================== */}
      <Modal visible={createModalVisible} animationType="slide" transparent onRequestClose={() => setCreateModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New YMCA Member</Text>
              <Pressable onPress={() => setCreateModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.nearBlack} />
              </Pressable>
            </View>

            {createError ? <ErrorBanner message={createError} /> : null}

            <ScrollView style={{ maxHeight: 440 }} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
              <TextField label="Full Name *" value={newName} onChangeText={setNewName} placeholder="e.g. Taylor Brooks" />
              <TextField label="Email Address *" value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" keyboardType="email-address" placeholder="taylor@example.com" />
              <TextField label="Phone Number *" value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" placeholder="(301) 555-0199" />
              <TextField label="Home Address" value={newAddress} onChangeText={setNewAddress} placeholder="Street, City, State ZIP" />
              <TextField label="Initial Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Default: ymca-demo" />

              <Text style={styles.fieldLabel}>Select Membership Plan</Text>
              <View style={{ gap: 8 }}>
                {YMCA_MEMBERSHIP_PLANS.map((plan) => {
                  const isSelected = newPlanId === plan.id;
                  return (
                    <Pressable
                      key={plan.id}
                      onPress={() => setNewPlanId(plan.id)}
                      style={[styles.planCard, isSelected && styles.planCardActive]}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={[styles.planTitle, isSelected && { color: colors.primary }]}>{plan.name}</Text>
                          <Text style={styles.planSub}>{plan.subtitle}</Text>
                        </View>
                        <Text style={styles.planRate}>${(plan.monthlyAmountCents / 100).toFixed(2)}/mo</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ marginTop: 12 }}>
                <PrimaryButton
                  title="Create & Activate Member Account"
                  onPress={() => void handleCreateMember()}
                  loading={submittingMember}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  list: {
    padding: 16,
    paddingTop: 8,
    gap: 10,
    paddingBottom: 32,
  },
  empty: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  row: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 4,
  },
  rowPressed: {
    backgroundColor: colors.offWhite,
  },
  name: {
    ...typography.body,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  meta: {
    ...typography.body,
    color: colors.muted,
  },
  bannerWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  adminBadgeWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: '#15803D',
    paddingVertical: 10,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.border,
    borderRadius: 8,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: colors.white,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  segmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.border,
    borderRadius: 8,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: colors.white,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  statusChipRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  statusChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nearBlack,
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  createMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#15803D',
    paddingVertical: 12,
    borderRadius: 8,
  },
  createMemberBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    ...cardStyle,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.nearBlack,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.nearBlack,
    marginBottom: 4,
  },
  planCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  planCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  planSub: {
    fontSize: 12,
    color: colors.muted,
  },
  planRate: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
}
