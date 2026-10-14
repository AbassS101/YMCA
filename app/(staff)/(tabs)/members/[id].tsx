import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { TrainerClientWorkoutModal } from '@/components/TrainerClientWorkoutModal';
import { TrainerGoalModal } from '@/components/TrainerGoalModal';
import { UserAvatar } from '@/components/UserAvatar';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { callPhone } from '@/components/desk/BillingIssueCard';
import { DeskAlertPills } from '@/components/desk/DeskAlertPills';
import { LogContactSheet } from '@/components/desk/LogContactSheet';
import { UpdateCardSheet } from '@/components/desk/UpdateCardSheet';
import { addDaysToDate, getDemoToday } from '@/domain/demoClock';
import { deskAlertsFor } from '@/domain/deskAlerts';
import { cancelRequestedCopy, formatShortDate } from '@/domain/displayDates';
import { accessSummary, ageBand, ageOn, bandLabel, facilityAccess } from '@/domain/householdAccess';
import type { HouseholdView } from '@/domain/types';
import { deskRepo } from '@/repositories/deskRepo';
import { householdRepo } from '@/repositories/householdRepo';
import {
  YMCA_MEMBERSHIP_PLANS,
  type ClassRegistration,
  type ClientFitnessGoal,
  type ClientWorkoutLog,
  type Member,
  type Membership,
  type MembershipPlan,
  type MemberContact,
  type PrivateLesson,
  type ScheduleItem,
  type Staff,
  type Thread,
} from '@/domain/types';
import { membershipRepo } from '@/repositories/membershipRepo';
import { messageRepo } from '@/repositories/messageRepo';
import { trainerRepo } from '@/repositories/trainerRepo';
import { makeCardStyle } from '@/theme/card';
import { type ThemeColors } from '@/theme/colors';
import { radii, typography } from '@/theme/typography';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function StaffMemberDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberId = id ?? '';
  const { session, api } = useSession();
  const staffId = session?.userId ?? '';
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { can, isAdmin, isITAdmin, isMembershipDirector, isWellnessDirector } = useStaffCapabilities();
  const canEditProfiles = can('editMemberProfiles');
  const canChangePlans = can('changePlans');
  const canApproveCancellations = can('approveCancellations');
  const canDeleteMembers = can('deleteMembers');
  const canAssignClients = can('assignClients');
  const canCoach = can('logWorkouts');
  const canLogContacts = can('logMemberContacts');
  const canHandleBilling = can('handleBillingIssues');
  const [member, setMember] = useState<Member | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<(ClassRegistration & { scheduleItem?: ScheduleItem })[]>([]);
  const [lessons, setLessons] = useState<PrivateLesson[]>([]);
  const [assignedTrainer, setAssignedTrainer] = useState<Staff | null>(null);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [error, setError] = useState(false);

  // Front desk: contact history, billing
  const [contacts, setContacts] = useState<MemberContact[]>([]);
  const [logContactVisible, setLogContactVisible] = useState(false);
  const [updateCardVisible, setUpdateCardVisible] = useState(false);

  // Client Fitness & Coaching Hub State
  const [fitnessGoal, setFitnessGoal] = useState<ClientFitnessGoal | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<ClientWorkoutLog[]>([]);
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [editingWorkoutLog, setEditingWorkoutLog] = useState<ClientWorkoutLog | null>(null);
  const [goalModalVisible, setGoalModalVisible] = useState(false);

  // Book Lesson Direct State
  const [bookLessonModalVisible, setBookLessonModalVisible] = useState(false);
  const [bookDate, setBookDate] = useState(() => addDaysToDate(getDemoToday(), 3));
  const [bookStart, setBookStart] = useState('14:00');
  const [bookEnd, setBookEnd] = useState('15:00');
  const [bookLocation, setBookLocation] = useState('Wellness Studio B');
  const [bookingLesson, setBookingLesson] = useState(false);

  // Edit Profile Modal (Admin)
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password Modal (Admin)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Reassign Trainer Modal (Admin)
  const [trainerModalVisible, setTrainerModalVisible] = useState(false);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);
  const [savingTrainer, setSavingTrainer] = useState(false);

  // Change Plan Modal (Admin)
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  // Delete Confirm Modal
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [household, setHousehold] = useState<HouseholdView | null>(null);
  const [orientingId, setOrientingId] = useState<string | null>(null);
  const canOrient = canCoach || isAdmin;

  const [instantOn, setInstantOn] = useState(false);
  useEffect(() => {
    if (!canCoach || staffId === '' || memberId === '') return;
    void api
      .getStaff(staffId)
      .then((s) => setInstantOn((s.instantBookMemberIds ?? []).includes(memberId)))
      .catch(() => undefined);
  }, [api, canCoach, staffId, memberId]);

  const toggleInstantBooking = async (enabled: boolean) => {
    setInstantOn(enabled);
    try {
      await api.setInstantBooking(staffId, memberId, enabled, staffId);
    } catch (e) {
      setInstantOn(!enabled);
      dialog.alert('Error', e instanceof Error ? e.message : 'Could not update instant booking.');
    }
  };

  const markOrientation = async (teenId: string) => {
    setOrientingId(teenId);
    try {
      await householdRepo.recordGymOrientation(api, teenId, staffId);
      dialog.alert('Orientation recorded', 'The gym is now unlocked on their card.', [{ text: 'OK' }], 'checkmark');
      await load();
    } catch (err: any) {
      dialog.alert('Could not record orientation', err?.message || 'Please try again.');
    } finally {
      setOrientingId(null);
    }
  };

  const deskAlerts = member ? deskAlertsFor(member, membership, getDemoToday()) : [];
  const billingBroken = membership?.billingStatus === 'declined' || membership?.billingStatus === 'past_due';

  const load = useCallback(async () => {
    if (memberId === '' || staffId === '') {
      return;
    }
    try {
      setError(false);
      const [nextMember, nextMembership, threads, memberRegs, memberLessons, currentTrainer, staffList, logs, goal] =
        await Promise.all([
          api.getMember(memberId),
          membershipRepo.getMembership(api, memberId),
          messageRepo.listThreads(api, staffId).catch(() => []),
          membershipRepo.listRegistrations(api, memberId).catch(() => []),
          membershipRepo.listLessons(api, memberId).catch(() => []),
          api.getAssignedTrainer(memberId).catch(() => null),
          api.listStaff().catch(() => []),
          trainerRepo.listClientWorkoutLogs(api, memberId).catch(() => []),
          trainerRepo.getClientFitnessGoal(api, memberId).catch(() => null),
        ]);
      const thread = threads.find((t: Thread) => t.memberId === memberId && t.staffId === staffId);
      setMember(nextMember);
      setMembership(nextMembership);
      setThreadId(thread?.id ?? null);
      setRegistrations(memberRegs);
      setLessons(memberLessons);
      setAssignedTrainer(currentTrainer);
      setAllStaff(staffList);
      setWorkoutLogs(logs);
      setFitnessGoal(goal);
      setHousehold(await householdRepo.get(api, memberId).catch(() => null));
      setContacts(await deskRepo.listContacts(api, { memberId }).catch(() => []));
      if (currentTrainer) {
        setSelectedTrainerId(currentTrainer.id);
      }
    } catch {
      setError(true);
    }
  }, [api, memberId, staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDeleteWorkoutLog(logId: string) {
    dialog.show({
      title: 'Delete Workout Session?',
      message: 'Remove this session record and its exercises from client history?',
      icon: 'trash',
      buttons: [
        { text: 'Keep It', style: 'cancel' },
        {
          text: 'Delete Session',
          style: 'destructive',
          onPress: async () => {
            try {
              await trainerRepo.deleteClientWorkoutLog(api, logId);
              dialog.alert('Deleted', 'Workout session removed.', [{ text: 'OK' }], 'checkmark');
              await load();
            } catch {
              dialog.alert('Error', 'Could not delete workout log.');
            }
          },
        },
      ],
    });
  }

  async function handleBookLessonDirectly() {
    if (!bookStart || !bookEnd) return;
    setBookingLesson(true);
    try {
      const startIso = `${bookDate}T${bookStart}:00-04:00`;
      const endIso = `${bookDate}T${bookEnd}:00-04:00`;
      await trainerRepo.bookLessonForMember(api, staffId, memberId, {
        start: startIso,
        end: endIso,
        location: bookLocation.trim(),
      });
      setBookLessonModalVisible(false);
      dialog.alert('Lesson Scheduled!', `Private session booked with ${member?.name}. Notification dispatched to member.`, [{ text: 'OK' }], 'checkmark');
      await load();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not schedule lesson.', [{ text: 'OK' }]);
    } finally {
      setBookingLesson(false);
    }
  }

  function openEditProfile() {
    if (!member) return;
    setEditName(member.name);
    setEditEmail(member.email);
    setEditPhone(member.phone);
    setEditAddress(member.address || '');
    setEditProfileVisible(true);
  }

  async function handleSaveProfile() {
    if (!editName.trim() || !editEmail.trim()) {
      dialog.alert('Required Fields', 'Name and email are required.', [{ text: 'OK' }]);
      return;
    }
    setSavingProfile(true);
    try {
      await membershipRepo.updateAdmin(
        api,
        memberId,
        {
          name: editName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim(),
          address: editAddress.trim(),
        },
        staffId
      );
      setEditProfileVisible(false);
      dialog.alert('Updated!', 'Member profile details updated successfully.', [{ text: 'OK' }], 'checkmark');
      await load();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not update member profile.', [{ text: 'OK' }]);
    } finally {
      setSavingProfile(false);
    }
  }

  function openChangePassword() {
    setNewPassword('');
    setConfirmPassword('');
    setPasswordModalVisible(true);
  }

  async function handleSavePassword() {
    if (!newPassword.trim()) {
      dialog.alert('Required', 'Please enter a new password.', [{ text: 'OK' }]);
      return;
    }
    if (newPassword.length < 6) {
      dialog.alert('Short Password', 'Password must be at least 6 characters.', [{ text: 'OK' }]);
      return;
    }
    if (newPassword !== confirmPassword) {
      dialog.alert('Mismatch', 'Passwords do not match.', [{ text: 'OK' }]);
      return;
    }
    if (!member) return;

    setSavingPassword(true);
    try {
      await api.changeUserPassword(member.email, newPassword.trim());
      setPasswordModalVisible(false);
      dialog.alert('Password Updated', `Password for ${member.name} (${member.email}) was successfully changed.`, [{ text: 'OK' }], 'checkmark');
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not update password.', [{ text: 'OK' }]);
    } finally {
      setSavingPassword(false);
    }
  }

  function openReassignTrainer() {
    setSelectedTrainerId(assignedTrainer?.id ?? (assignableTrainers[0]?.id || null));
    setTrainerModalVisible(true);
  }

  async function handleSaveTrainerAssignment() {
    if (!selectedTrainerId) return;
    setSavingTrainer(true);
    try {
      await api.setAssignedTrainer(memberId, selectedTrainerId);
      const chosenStaff = allStaff.find((s) => s.id === selectedTrainerId);
      setAssignedTrainer(chosenStaff ?? null);
      setTrainerModalVisible(false);
      dialog.alert('Trainer Assigned', `${chosenStaff?.name ?? 'Trainer'} has been assigned to ${member?.name}.`, [{ text: 'OK' }], 'checkmark');
      await load();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Failed to assign trainer.', [{ text: 'OK' }]);
    } finally {
      setSavingTrainer(false);
    }
  }

  function openChangePlan() {
    if (!membership) return;
    const current = YMCA_MEMBERSHIP_PLANS.find((p) => p.name === membership.rateName) || null;
    setSelectedPlan(current);
    setPlanModalVisible(true);
  }

  async function handleConfirmPlanChange() {
    if (!selectedPlan) return;
    setSavingPlan(true);
    try {
      await membershipRepo.changeMembership(
        api,
        memberId,
        selectedPlan.name,
        selectedPlan.monthlyAmountCents,
        staffId
      );
      setPlanModalVisible(false);
      dialog.alert(
        'Plan Updated!',
        `Member plan changed to ${selectedPlan.name} ($${(selectedPlan.monthlyAmountCents / 100).toFixed(2)}/mo).`,
        [{ text: 'OK' }],
        'checkmark'
      );
      await load();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not update membership plan.', [{ text: 'OK' }]);
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleUpdateStatus(newStatus: 'active' | 'paused' | 'cancelled') {
    try {
      await membershipRepo.updateMembershipAdmin(api, memberId, { status: newStatus }, staffId);
      dialog.alert('Status Updated', `Membership status set to ${newStatus.toUpperCase()}.`, [{ text: 'OK' }], 'checkmark');
      await load();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Failed to update status.', [{ text: 'OK' }]);
    }
  }

  async function handleRescindCancellation() {
    try {
      await membershipRepo.rescindCancel(api, memberId, staffId);
      dialog.alert('Restored', 'Cancellation request rescinded and membership restored.', [{ text: 'OK' }], 'checkmark');
      await load();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Failed to restore membership.', [{ text: 'OK' }]);
    }
  }

  async function handleApproveCancellation() {
    try {
      const approved = await membershipRepo.approveCancel(api, memberId, staffId);
      dialog.alert(
        'Cancellation Approved',
        `${member?.name ?? 'The member'} keeps access through ${formatShortDate(approved.accessThrough)}.`,
        [{ text: 'OK' }],
        'checkmark'
      );
      await load();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Failed to approve cancellation.', [{ text: 'OK' }]);
    }
  }

  async function handleCancelRegistration(scheduleItemId: string, classTitle: string) {
    try {
      await api.cancelClassRegistration(memberId, scheduleItemId);
      dialog.alert('Cancelled', `Registration for ${classTitle} has been cancelled.`, [{ text: 'OK' }], 'checkmark');
      await load();
    } catch {
      dialog.alert('Error', 'Could not cancel class registration.', [{ text: 'OK' }]);
    }
  }

  async function handleCancelPrivateLesson(lessonId: string) {
    try {
      await api.cancelPrivateLesson(memberId, lessonId);
      dialog.alert('Cancelled', 'Private lesson booking has been cancelled.', [{ text: 'OK' }], 'checkmark');
      await load();
    } catch {
      dialog.alert('Error', 'Could not cancel lesson.', [{ text: 'OK' }]);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await membershipRepo.deleteAccount(api, memberId, staffId);
      setDeleteConfirmVisible(false);
      dialog.alert(
        'Account Deleted',
        'The member profile, membership, registrations, and credentials were permanently deleted.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(staff)/members'),
          },
        ],
        'checkmark'
      );
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not delete member account.', [{ text: 'OK' }]);
      setDeleting(false);
    }
  }

  async function handleOpenOrCreateMessage() {
    try {
      const thread = await api.getOrCreateThread(memberId, staffId);
      router.push(`/(staff)/messages/${thread.id}`);
    } catch {
      dialog.alert('Error', 'Could not open message thread with member.', [{ text: 'OK' }]);
    }
  }

  const cancelBanner =
    member?.status === 'cancel_pending' &&
    membership?.lastBillDate != null &&
    membership.cancelEffectiveDate != null
      ? cancelRequestedCopy(membership.lastBillDate, membership.cancelEffectiveDate)
      : null;

  const assignableTrainers = allStaff.filter(
    (st) => st.staffRole === 'trainer' || st.staffRole === 'swim_instructor' || st.staffRole === 'wellness_director'
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader
        subtitle={
          isAdmin
            ? isITAdmin
              ? 'IT Admin · Member Management'
              : 'Staff Admin · Member Management'
            : isMembershipDirector
              ? 'Membership Director · Member Account'
              : isWellnessDirector
                ? 'Wellness Director · Client Profile'
                : 'Member Details'
        }
      />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={[styles.back, { color: colors.primary }]}>← Back to Members</Text>
        </Pressable>

        {/* Member Profile Card */}
        {member ? (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <UserAvatar uri={member.avatarUrl} name={member.name} size={64} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{member.name}</Text>
                <Text style={styles.meta}>{member.email}</Text>
                <Text style={styles.meta}>{member.phone}</Text>
                {member.address ? <Text style={styles.meta}>{member.address}</Text> : null}
                <Text style={[styles.meta, { marginTop: 4 }]}>
                  Member ID: <Text style={{ fontWeight: '700', color: colors.nearBlack }}>{member.membershipId}</Text>
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
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
                    styles.statusBadgeText,
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
                  {member.status.toUpperCase()}
                </Text>
              </View>
            </View>

            {canEditProfiles ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Pressable
                  onPress={openEditProfile}
                  style={[styles.adminOutlineBtn, { flex: 1 }]}
                  accessibilityRole="button"
                >
                  <Ionicons name="pencil" size={15} color={colors.primary} />
                  <Text style={styles.adminOutlineText}>Edit Contact Info</Text>
                </Pressable>
                <Pressable
                  onPress={openChangePassword}
                  style={[styles.adminOutlineBtn, { flex: 1, backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}
                  accessibilityRole="button"
                >
                  <Ionicons name="key" size={15} color="#B45309" />
                  <Text style={[styles.adminOutlineText, { color: '#B45309' }]}>Reset Password</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Household: everyone on this family plan, access, and gym orientation */}
        {household && household.members.length > 1 ? (
          <View style={styles.card}>
            <Text style={[styles.name, { fontSize: 17 }]}>
              Household · {household.primary.type} · paid by {household.primary.name}
            </Text>
            {household.members.map((p) => {
              const access = facilityAccess(p, getDemoToday());
              const band = p.birthDate ? ageBand(p.birthDate, getDemoToday()) : 'adult';
              const awaiting = access.gym.status === 'needs_orientation';
              return (
                <View key={p.id} style={{ gap: 4, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Pressable
                    onPress={() => (p.id === memberId ? undefined : router.push(`/(staff)/members/${p.id}` as never))}
                    accessibilityRole="link"
                  >
                    <Text style={{ fontWeight: '800', color: p.id === memberId ? colors.nearBlack : colors.primary }}>
                      {p.name}
                      {p.id === memberId ? ' (viewing)' : ''}
                    </Text>
                  </Pressable>
                  <Text style={styles.meta}>
                    {p.birthDate ? `${ageOn(p.birthDate, getDemoToday())} yrs · ` : ''}
                    {bandLabel(band)} · ID {p.membershipId}
                  </Text>
                  <Text style={styles.meta}>{accessSummary(p, getDemoToday())}</Text>
                  {band === 'teen' && canOrient ? (
                    p.gymOrientation ? (
                      <Text style={[styles.meta, { color: '#15803D' }]}>
                        Orientation done {p.gymOrientation.completedAt.slice(0, 10)} by {p.gymOrientation.staffName}
                      </Text>
                    ) : awaiting ? (
                      <PrimaryButton
                        title={orientingId === p.id ? 'Saving...' : 'Mark gym orientation complete'}
                        loading={orientingId === p.id}
                        onPress={() => void markOrientation(p.id)}
                      />
                    ) : null
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Front desk: alerts, billing, contact history */}
        {member && deskAlerts.length > 0 && (canLogContacts || canHandleBilling) ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Desk Alerts</Text>
            <DeskAlertPills alerts={deskAlerts} max={6} />
            {deskAlerts.map((a) => (
              <Text key={a.kind} style={styles.meta}>
                {a.label}: {a.detail}
              </Text>
            ))}
          </View>
        ) : null}

        {billingBroken && membership ? (
          <View style={styles.cancelAlertCard}>
            <Ionicons name="card" size={20} color={colors.scarlet} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelAlertTitle}>
                {membership.billingStatus === 'declined' ? 'Card Declined' : 'Payment Past Due'}
              </Text>
              <Text style={styles.cancelAlertBody}>
                {membership.billingIssue?.reason ?? 'Payment problem'} · $
                {((membership.billingIssue?.amountDueCents ?? 0) / 100).toFixed(2)} due ·{' '}
                {membership.billingIssue?.attempts ?? 0} attempts. Card on file: {membership.paymentBrand} ••••{' '}
                {membership.paymentLast4}
              </Text>
              {canHandleBilling ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <Pressable
                    onPress={() => setUpdateCardVisible(true)}
                    style={[styles.smallActionBtn, { backgroundColor: colors.scarlet }]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.smallActionText}>Update Card</Text>
                  </Pressable>
                  {member?.phone ? (
                    <Pressable
                      onPress={() => callPhone(member.phone)}
                      style={[styles.smallActionBtn, { backgroundColor: '#15803D' }]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.smallActionText}>Call Member</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {canLogContacts ? (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="call" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Contact History ({contacts.length})</Text>
              </View>
              <Pressable onPress={() => setLogContactVisible(true)} style={styles.badgeBtn} accessibilityRole="button">
                <Text style={styles.badgeBtnText}>+ Log Contact ›</Text>
              </Pressable>
            </View>
            {contacts.length === 0 ? (
              <Text style={styles.muted}>No calls or conversations logged yet.</Text>
            ) : (
              contacts.map((c) => (
                <View key={c.id} style={styles.bookingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingTitle}>
                      {c.purpose.replace('_', ' ')} · {c.channel.replace('_', ' ')} · {c.outcome.replace('_', ' ')}
                    </Text>
                    {c.notes ? <Text style={styles.bookingMeta}>{c.notes}</Text> : null}
                    <Text style={styles.bookingMeta}>
                      {c.staffName} · {formatShortDate(c.createdAt)}
                      {c.followUpDate ? ` · follow up ${formatShortDate(c.followUpDate)}` : ''}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {/* Assigned Personal Trainer Card */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="barbell" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Assigned Trainer</Text>
            </View>
            {canAssignClients ? (
              <Pressable onPress={openReassignTrainer} style={styles.badgeBtn} accessibilityRole="button">
                <Text style={styles.badgeBtnText}>{assignedTrainer ? 'Reassign ›' : 'Assign Trainer ›'}</Text>
              </Pressable>
            ) : null}
          </View>

          {assignedTrainer ? (
            <View style={styles.trainerHighlightRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.trainerName}>{assignedTrainer.name}</Text>
                <Text style={styles.trainerRole}>{assignedTrainer.roleLabel} · {assignedTrainer.email}</Text>
              </View>
              <View style={styles.trainerBadge}>
                <Text style={styles.trainerBadgeText}>ACTIVE TRAINER</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.muted}>No dedicated personal trainer assigned yet.</Text>
          )}
        </View>

        {canCoach ? (
        <>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 160 }}>
              <Ionicons name="trophy" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { flexShrink: 1 }]}>Fitness Goals & Safety Profile</Text>
            </View>
            <Pressable onPress={() => setGoalModalVisible(true)} style={styles.badgeBtn} accessibilityRole="button">
              <Text style={styles.badgeBtnText}>{fitnessGoal ? 'Edit Goals ›' : '+ Set Goals ›'}</Text>
            </Pressable>
          </View>

          {fitnessGoal ? (
            <View style={{ gap: 10 }}>
              {/* Primary Goal */}
              <View style={styles.goalHighlightBox}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' }}>
                  Target Objective
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.nearBlack, marginTop: 2 }}>
                  {fitnessGoal.primaryGoal}
                </Text>
                {fitnessGoal.targetDate ? (
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 3 }}>
                    Target Completion Date: <Text style={{ fontWeight: '700', color: colors.nearBlack }}>{fitnessGoal.targetDate}</Text>
                  </Text>
                ) : null}
              </View>

              {/* Weight Target Stats */}
              {fitnessGoal.currentWeightLbs || fitnessGoal.targetWeightLbs ? (
                <View style={styles.weightRow}>
                  <View style={styles.weightBox}>
                    <Text style={styles.weightVal}>{fitnessGoal.currentWeightLbs ?? '--'} lbs</Text>
                    <Text style={styles.weightLabel}>Starting / Current</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                  <View style={styles.weightBox}>
                    <Text style={[styles.weightVal, { color: '#15803D' }]}>{fitnessGoal.targetWeightLbs ?? '--'} lbs</Text>
                    <Text style={styles.weightLabel}>Goal Weight</Text>
                  </View>
                </View>
              ) : null}

              {/* Injury / Safety Limitation Warning */}
              {fitnessGoal.injuriesOrLimitations ? (
                <View style={styles.injuryCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="warning-outline" size={16} color="#D97706" />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309' }}>
                      SAFETY & PHYSICAL LIMITATIONS:
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: '#92400E', marginTop: 2 }}>
                    {fitnessGoal.injuriesOrLimitations}
                  </Text>
                </View>
              ) : null}

              {/* Specific Warnings List */}
              {fitnessGoal.specificWarnings && fitnessGoal.specificWarnings.length > 0 ? (
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                    SPECIFIC SAFETY & MOVEMENT ALERTS ({fitnessGoal.specificWarnings.length}):
                  </Text>
                  {fitnessGoal.specificWarnings.map((w) => {
                    const isHigh = w.severity === 'high';
                    const isMod = w.severity === 'moderate';
                    const badgeColor = isHigh ? '#DC2626' : isMod ? '#D97706' : '#0284C7';
                    const badgeBg = isHigh ? '#FEE2E2' : isMod ? '#FEF3C7' : '#E0F2FE';
                    return (
                      <View
                        key={w.id}
                        style={{
                          backgroundColor: badgeBg,
                          padding: 8,
                          borderRadius: radii.sm,
                          borderWidth: 1,
                          borderColor: badgeColor,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Ionicons name="warning-outline" size={15} color={badgeColor} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: badgeColor }}>
                            {w.severity.toUpperCase()} ALERT {w.authorName ? `· ${w.authorName}` : ''}
                          </Text>
                          <Text style={{ fontSize: 13, color: '#1F2937', fontWeight: '500' }}>{w.text}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {/* Member Motivation / Routine Notes */}
              {fitnessGoal.memberNotes ? (
                <View style={{ backgroundColor: colors.background, padding: 10, borderRadius: radii.sm, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>MEMBER MOTIVATION & PREFERENCES:</Text>
                  <Text style={{ fontSize: 13, color: colors.nearBlack, marginTop: 2, fontStyle: 'italic' }}>
                    "{fitnessGoal.memberNotes}"
                  </Text>
                </View>
              ) : null}

              {/* Coach Program Notes */}
              {fitnessGoal.notes ? (
                <View style={{ backgroundColor: colors.background, padding: 10, borderRadius: radii.sm, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>COACH PROGRAM NOTES:</Text>
                  <Text style={{ fontSize: 13, color: colors.nearBlack, marginTop: 2 }}>
                    {fitnessGoal.notes}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={styles.muted}>No fitness goals or movement limitations logged yet for this member.</Text>
              <Pressable
                onPress={() => setGoalModalVisible(true)}
                style={styles.addGoalBtn}
                accessibilityRole="button"
              >
                <Ionicons name="add-circle" size={16} color={colors.primary} />
                <Text style={styles.addGoalBtnText}>Establish Goals & Safety History</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ========================================================= */}
        {/* WORKOUT LOGS & PROGRESSION TRACKING                      */}
        {/* ========================================================= */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 160 }}>
              <Ionicons name="barbell" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { flexShrink: 1 }]}>
                Workout History ({workoutLogs.length})
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setEditingWorkoutLog(null);
                setWorkoutModalVisible(true);
              }}
              style={styles.logWorkoutHeaderBtn}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={15} color="#FFFFFF" />
              <Text style={styles.logWorkoutHeaderBtnText}>+ Log Workout</Text>
            </Pressable>
          </View>

          {workoutLogs.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 18, gap: 6 }}>
              <Ionicons name="barbell-outline" size={28} color={colors.muted} />
              <Text style={styles.muted}>No workouts logged yet for {member?.name}.</Text>
              <Pressable
                onPress={() => {
                  setEditingWorkoutLog(null);
                  setWorkoutModalVisible(true);
                }}
                style={styles.addGoalBtn}
              >
                <Text style={styles.addGoalBtnText}>Record First Workout Session</Text>
              </Pressable>
            </View>
          ) : (
            workoutLogs.map((log) => (
              <View key={log.id} style={styles.workoutLogItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                      {log.date}
                    </Text>
                    <View style={styles.sessionTypeBadge}>
                      <Text style={styles.sessionTypeBadgeText}>
                        {log.sessionType.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {log.rpe ? (
                      <View style={styles.rpeBadge}>
                        <Text style={styles.rpeBadgeText}>RPE {log.rpe}/10</Text>
                      </View>
                    ) : null}
                    <Pressable
                      onPress={() => {
                        setEditingWorkoutLog(log);
                        setWorkoutModalVisible(true);
                      }}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Edit workout log"
                      style={{ padding: 2 }}
                    >
                      <Ionicons name="create-outline" size={17} color={colors.primary} />
                    </Pressable>
                    <Pressable
                      onPress={() => void handleDeleteWorkoutLog(log.id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Delete workout log"
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.muted} />
                    </Pressable>
                  </View>
                </View>

                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.nearBlack }}>
                  {log.title}
                </Text>

                {/* Exercises list */}
                {log.exercises && log.exercises.length > 0 ? (
                  <View style={styles.exerciseTable}>
                    {log.exercises.map((ex, exIdx) => (
                      <View key={exIdx} style={styles.exerciseRow}>
                        <Text style={styles.exName}>{ex.name}</Text>
                        <Text style={styles.exMeta}>
                          {ex.sets} sets × {ex.reps} {ex.weight ? `@ ${ex.weight}` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Coach notes */}
                {log.notes ? (
                  <Text style={{ fontSize: 12, color: colors.muted, fontStyle: 'italic', marginTop: 2 }}>
                    <Text style={{ fontWeight: '600' }}>Coach:</Text> {log.notes}
                  </Text>
                ) : null}

                {/* Client feedback */}
                {log.clientFeedback ? (
                  <Text style={{ fontSize: 12, color: '#15803D', fontStyle: 'italic' }}>
                    <Text style={{ fontWeight: '600' }}>Client:</Text> {log.clientFeedback}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>

        {/* ========================================================= */}
        {/* DIRECT LESSON BOOKING WITH CLIENT                         */}
        {/* ========================================================= */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 160 }}>
              <Ionicons name="calendar" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { flexShrink: 1 }]}>1-on-1 Lesson Scheduling</Text>
            </View>
            <Pressable
              onPress={() => setBookLessonModalVisible(true)}
              style={[styles.badgeBtn, { backgroundColor: '#EFF6FF' }]}
              accessibilityRole="button"
            >
              <Text style={[styles.badgeBtnText, { color: colors.primary }]}>+ Book Lesson ›</Text>
            </Pressable>
          </View>
          <Text style={styles.muted}>
            Schedule an upcoming private coaching session with {member?.name} and send calendar confirmation.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Allow instant booking with me</Text>
              <Text style={styles.muted}>
                Off by default. When on, {member?.name ?? 'this member'} books your open times without waiting for you to accept.
              </Text>
            </View>
            <Switch
              value={instantOn}
              onValueChange={(v) => void toggleInstantBooking(v)}
              accessibilityLabel="Allow instant booking with me"
            />
          </View>
        </View>
        </>
        ) : null}

        {/* Membership Details & Admin Plan Actions */}
        {member && membership ? (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>Membership Plan</Text>
              {canChangePlans ? (
                <Pressable onPress={openChangePlan} style={styles.badgeBtn} accessibilityRole="button">
                  <Text style={styles.badgeBtnText}>Change Plan ›</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.planHighlightRow}>
              <View>
                <Text style={styles.planName}>{member.type}</Text>
                <Text style={styles.planPrice}>{formatCents(membership.monthlyAmountCents)} / month</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.meta}>Card: {membership.paymentBrand} •••• {membership.paymentLast4}</Text>
                <Text style={styles.meta}>Next bill: {formatShortDate(membership.nextBillingDate)}</Text>
              </View>
            </View>

            {cancelBanner ? (
              <View style={styles.cancelAlertCard}>
                <Ionicons name="alert-circle" size={20} color={colors.scarlet} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cancelAlertTitle}>Cancellation Requested</Text>
                  <Text style={styles.cancelAlertBody}>{cancelBanner}</Text>
                  {canApproveCancellations ? (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                      <Pressable
                        onPress={() => void handleRescindCancellation()}
                        style={[styles.smallActionBtn, { backgroundColor: '#15803D' }]}
                      >
                        <Text style={styles.smallActionText}>Restore / Keep Active</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void handleApproveCancellation()}
                        style={[styles.smallActionBtn, { backgroundColor: colors.scarlet }]}
                      >
                        <Text style={styles.smallActionText}>Approve Cancellation</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {canChangePlans ? (
              <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6 }}>
                  MEMBERSHIP STATUS CONTROL:
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => void handleUpdateStatus('active')}
                    style={[styles.statusChip, member.status === 'active' && styles.statusChipActive]}
                  >
                    <Text style={[styles.statusChipText, member.status === 'active' && styles.statusChipTextActive]}>
                      Active
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void handleUpdateStatus('paused')}
                    style={[styles.statusChip, member.status === 'paused' && styles.statusChipActive]}
                  >
                    <Text style={[styles.statusChipText, member.status === 'paused' && styles.statusChipTextActive]}>
                      Pause Membership
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void handleUpdateStatus('cancelled')}
                    style={[styles.statusChip, member.status === 'cancelled' && styles.statusChipActive]}
                  >
                    <Text style={[styles.statusChipText, member.status === 'cancelled' && styles.statusChipTextActive]}>
                      Cancel Immediately
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Member Class Registrations */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Registered Classes & Events ({registrations.length})</Text>
          {registrations.length === 0 ? (
            <Text style={styles.muted}>Member is not registered for any group classes.</Text>
          ) : (
            registrations.map((reg) => (
              <View key={reg.id} style={styles.bookingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookingTitle}>{reg.scheduleItem?.title ?? 'Class Session'}</Text>
                  <Text style={styles.bookingMeta}>
                    {reg.scheduleItem?.location} · {reg.scheduleItem ? formatShortDate(reg.scheduleItem.start) : ''}
                  </Text>
                </View>
                {canEditProfiles ? (
                  <Pressable
                    onPress={() => void handleCancelRegistration(reg.scheduleItemId, reg.scheduleItem?.title ?? 'class')}
                    style={styles.cancelBookingBtn}
                    accessibilityRole="button"
                  >
                    <Text style={styles.cancelBookingText}>Cancel</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </View>

        {/* Member Private Lessons */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Booked Private Lessons ({lessons.length})</Text>
          {lessons.length === 0 ? (
            <Text style={styles.muted}>No private wellness lessons booked.</Text>
          ) : (
            lessons.map((les) => (
              <View key={les.id} style={styles.bookingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookingTitle}>Private Wellness Lesson</Text>
                  <Text style={styles.bookingMeta}>{les.location} · {formatShortDate(les.start)}</Text>
                  <Text style={[styles.bookingMeta, { color: les.status === 'booked' ? '#15803D' : colors.scarlet }]}>
                    Status: {les.status.toUpperCase()}
                  </Text>
                </View>
                {(canEditProfiles || canCoach) && les.status === 'booked' ? (
                  <Pressable
                    onPress={() => void handleCancelPrivateLesson(les.id)}
                    style={styles.cancelBookingBtn}
                    accessibilityRole="button"
                  >
                    <Text style={styles.cancelBookingText}>Cancel</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </View>

        {/* Communication */}
        <PrimaryButton
          title={threadId ? 'Open Message Thread' : 'Start New Message Thread'}
          onPress={() => void handleOpenOrCreateMessage()}
        />

        {canDeleteMembers ? (
          <View style={styles.dangerZoneCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="warning" size={20} color={colors.scarlet} />
              <Text style={styles.dangerTitle}>Administrative Danger Zone</Text>
            </View>
            <Text style={styles.dangerBody}>
              Deleting this account permanently removes the member, their active membership, all bookings, private lessons, and credentials.
            </Text>
            <Pressable
              onPress={() => setDeleteConfirmVisible(true)}
              style={styles.deleteAccountBtn}
              accessibilityRole="button"
            >
              <Ionicons name="trash" size={16} color="#FFFFFF" />
              <Text style={styles.deleteAccountText}>Delete Member Account Permanently</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <LogContactSheet
        visible={logContactVisible}
        title={`Log contact: ${member?.name ?? ''}`}
        memberId={memberId}
        defaultPurpose={billingBroken ? 'billing' : 'general'}
        onClose={() => setLogContactVisible(false)}
        onSave={async (input) => {
          await deskRepo.logContact(api, input, staffId);
          setLogContactVisible(false);
          await load();
        }}
      />
      <UpdateCardSheet
        visible={updateCardVisible}
        memberName={member?.name ?? ''}
        currentLast4={membership?.paymentLast4}
        onClose={() => setUpdateCardVisible(false)}
        onSubmit={async (payment) => {
          await deskRepo.resolveBillingIssue(api, memberId, payment, staffId);
          setUpdateCardVisible(false);
          dialog.alert('Card Updated', 'The billing issue is cleared.', [{ text: 'OK' }], 'checkmark');
          await load();
        }}
      />

      {/* ========================================== */}
      {/* MODAL: EDIT MEMBER PROFILE (ADMIN) */}
      {/* ========================================== */}
      <Modal visible={editProfileVisible} animationType="fade" transparent onRequestClose={() => setEditProfileVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Member Contact Info</Text>
              <Pressable onPress={() => setEditProfileVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.nearBlack} />
              </Pressable>
            </View>

            <View style={{ gap: 12, marginTop: 10 }}>
              <TextField label="Full Name" value={editName} onChangeText={setEditName} />
              <TextField label="Email Address" value={editEmail} onChangeText={setEditEmail} autoCapitalize="none" keyboardType="email-address" />
              <TextField label="Phone Number" value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
              <TextField label="Home Address" value={editAddress} onChangeText={setEditAddress} />

              <View style={{ marginTop: 8 }}>
                <PrimaryButton title="Save Profile Changes" onPress={() => void handleSaveProfile()} loading={savingProfile} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================== */}
      {/* MODAL: RESET PASSWORD (ADMIN) */}
      {/* ========================================== */}
      <Modal visible={passwordModalVisible} animationType="fade" transparent onRequestClose={() => setPasswordModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="key" size={20} color="#B45309" />
                <Text style={styles.modalTitle}>Change Member Password</Text>
              </View>
              <Pressable onPress={() => setPasswordModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.nearBlack} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 8 }}>
              Directly set a new password for <Text style={{ fontWeight: '700', color: colors.nearBlack }}>{member?.name}</Text> ({member?.email}).
            </Text>

            <View style={{ gap: 12, marginTop: 6 }}>
              <TextField
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="At least 6 characters"
                autoCapitalize="none"
              />
              <TextField
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Re-type new password"
                autoCapitalize="none"
              />

              <View style={{ marginTop: 8 }}>
                <PrimaryButton title="Update Password" onPress={() => void handleSavePassword()} loading={savingPassword} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================== */}
      {/* MODAL: ASSIGN / REASSIGN TRAINER (ADMIN) */}
      {/* ========================================== */}
      <Modal visible={trainerModalVisible} animationType="slide" transparent onRequestClose={() => setTrainerModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="barbell" size={20} color={colors.primary} />
                <Text style={styles.modalTitle}>Assign Trainer</Text>
              </View>
              <Pressable onPress={() => setTrainerModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.nearBlack} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 10 }}>
              Select a certified trainer from the staff directory to assign to {member?.name}:
            </Text>

            <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
              {assignableTrainers.map((st) => {
                const isSelected = selectedTrainerId === st.id;
                return (
                  <Pressable
                    key={st.id}
                    onPress={() => setSelectedTrainerId(st.id)}
                    style={[styles.trainerSelectCard, isSelected && styles.trainerSelectCardSelected]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.trainerSelectName, isSelected && { color: colors.primary }]}>{st.name}</Text>
                        <Text style={styles.trainerSelectRole}>{st.roleLabel} · {st.email}</Text>
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={22} color={colors.border} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ marginTop: 10 }}>
              <PrimaryButton
                title={selectedTrainerId ? 'Confirm Trainer Assignment' : 'Select a Trainer'}
                onPress={() => void handleSaveTrainerAssignment()}
                loading={savingTrainer}
                disabled={!selectedTrainerId}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* MODAL: CHANGE MEMBERSHIP PLAN (ADMIN) */}
      {/* ========================================== */}
      <Modal visible={planModalVisible} animationType="slide" transparent onRequestClose={() => setPlanModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select New Membership Plan</Text>
              <Pressable onPress={() => setPlanModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.nearBlack} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              {YMCA_MEMBERSHIP_PLANS.map((plan) => {
                const isSelected = selectedPlan?.name === plan.name;
                return (
                  <Pressable
                    key={plan.id}
                    onPress={() => setSelectedPlan(plan)}
                    style={[styles.planOptionCard, isSelected && styles.planOptionCardSelected]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.planOptionName, isSelected && { color: colors.primary }]}>{plan.name}</Text>
                        <Text style={styles.planOptionSubtitle}>{plan.subtitle}</Text>
                      </View>
                      <Text style={styles.planOptionPrice}>${(plan.monthlyAmountCents / 100).toFixed(2)}/mo</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ marginTop: 10 }}>
              <PrimaryButton
                title={selectedPlan ? `Change Plan to ${selectedPlan.name}` : 'Select Plan'}
                onPress={() => void handleConfirmPlanChange()}
                loading={savingPlan}
                disabled={!selectedPlan}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* MODAL: DELETE ACCOUNT CONFIRMATION */}
      {/* ========================================== */}
      <Modal visible={deleteConfirmVisible} animationType="fade" transparent onRequestClose={() => setDeleteConfirmVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="trash" size={28} color={colors.scarlet} />
              </View>
              <Text style={[styles.modalTitle, { marginTop: 10, textAlign: 'center' }]}>
                Permanently Delete Account?
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
                Are you sure you want to permanently delete {member?.name} ({member?.email})? All data including membership, class bookings, and sign-in credentials will be completely erased.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable
                onPress={() => setDeleteConfirmVisible(false)}
                style={[styles.smallActionBtn, { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }]}
              >
                <Text style={{ textAlign: 'center', fontWeight: '700', color: colors.muted }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleDeleteAccount()}
                disabled={deleting}
                style={[styles.smallActionBtn, { flex: 1, backgroundColor: colors.scarlet }]}
              >
                <Text style={[styles.smallActionText, { textAlign: 'center' }]}>
                  {deleting ? 'Deleting...' : 'Delete Account'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* MODAL: TRAINER CLIENT WORKOUT MODAL        */}
      {/* ========================================== */}
      <TrainerClientWorkoutModal
        visible={workoutModalVisible}
        onClose={() => {
          setWorkoutModalVisible(false);
          setEditingWorkoutLog(null);
        }}
        member={member}
        initialLog={editingWorkoutLog}
        mode="trainer"
        onSaved={() => void load()}
        onDeleted={() => void load()}
      />

      {/* ========================================== */}
      {/* MODAL: TRAINER CLIENT FITNESS GOAL MODAL   */}
      {/* ========================================== */}
      <TrainerGoalModal
        visible={goalModalVisible}
        onClose={() => setGoalModalVisible(false)}
        member={member}
        existingGoal={fitnessGoal}
        mode="trainer"
        onSaved={() => void load()}
      />

      {/* ========================================== */}
      {/* MODAL: DIRECT LESSON BOOKING               */}
      {/* ========================================== */}
      <Modal visible={bookLessonModalVisible} animationType="slide" transparent onRequestClose={() => setBookLessonModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="calendar" size={20} color={colors.primary} />
                <Text style={styles.modalTitle}>Book Private Lesson</Text>
              </View>
              <Pressable onPress={() => setBookLessonModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.nearBlack} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 10 }}>
              Schedule a private 1-on-1 session for <Text style={{ fontWeight: '700', color: colors.nearBlack }}>{member?.name}</Text>.
            </Text>

            <View style={{ gap: 10 }}>
              <TextField
                label="Session Date (YYYY-MM-DD)"
                value={bookDate}
                onChangeText={setBookDate}
                placeholder="YYYY-MM-DD"
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Start Time (HH:MM)"
                    value={bookStart}
                    onChangeText={setBookStart}
                    placeholder="14:00"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="End Time (HH:MM)"
                    value={bookEnd}
                    onChangeText={setBookEnd}
                    placeholder="15:00"
                  />
                </View>
              </View>

              <TextField
                label="Location / Studio"
                value={bookLocation}
                onChangeText={setBookLocation}
                placeholder="Wellness Studio B"
              />

              <View style={{ marginTop: 8 }}>
                <PrimaryButton
                  title="Confirm & Book Session"
                  onPress={() => void handleBookLessonDirectly()}
                  loading={bookingLesson}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  const cardStyle = makeCardStyle(colors);
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  scroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  back: {
    ...typography.body,
    color: colors.scarlet,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
    ...cardStyle,
  },
  name: {
    ...typography.body,
    fontWeight: '800',
    fontSize: 18,
    color: colors.nearBlack,
  },
  meta: {
    ...typography.body,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '800',
    fontSize: 15,
    color: colors.nearBlack,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  adminOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
    marginTop: 6,
  },
  adminOutlineText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  badgeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  badgeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  planHighlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  planName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.nearBlack,
  },
  planPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  cancelAlertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginTop: 6,
  },
  cancelAlertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.scarlet,
  },
  cancelAlertBody: {
    fontSize: 12,
    color: colors.nearBlack,
    marginTop: 2,
  },
  smallActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  smallActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  statusChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  bookingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bookingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  bookingMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  cancelBookingBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  cancelBookingText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.scarlet,
  },
  muted: {
    ...typography.body,
    fontSize: 13,
    color: colors.muted,
  },
  dangerZoneCard: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: colors.scarlet,
    borderRadius: radii.md,
    padding: 16,
    gap: 8,
    marginTop: 10,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.scarlet,
  },
  dangerBody: {
    fontSize: 12,
    color: colors.nearBlack,
    lineHeight: 16,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.scarlet,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  deleteAccountText: {
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
    maxWidth: 460,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
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
    fontSize: 17,
    fontWeight: '800',
    color: colors.nearBlack,
  },
  planOptionCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  planOptionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  planOptionName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  planOptionSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  planOptionPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  trainerHighlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 4,
  },
  trainerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#166534',
  },
  trainerRole: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 2,
  },
  trainerBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trainerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  trainerSelectCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  trainerSelectCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  trainerSelectName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  trainerSelectRole: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  goalHighlightBox: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  weightBox: {
    alignItems: 'center',
  },
  weightVal: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.nearBlack,
  },
  weightLabel: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  injuryCard: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  addGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  addGoalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  logWorkoutHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#15803D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  logWorkoutHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  workoutLogItem: {
    padding: 12,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    marginBottom: 6,
  },
  sessionTypeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sessionTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  rpeBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rpeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  exerciseTable: {
    backgroundColor: colors.white,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
    marginTop: 2,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  exName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  exMeta: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});
}
