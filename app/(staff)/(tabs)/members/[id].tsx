import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { UserAvatar } from '@/components/UserAvatar';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { cancelRequestedCopy, formatShortDate } from '@/domain/displayDates';
import {
  isAdminRole,
  YMCA_MEMBERSHIP_PLANS,
  type ClassRegistration,
  type Member,
  type Membership,
  type MembershipPlan,
  type PrivateLesson,
  type ScheduleItem,
  type Staff,
  type Thread,
} from '@/domain/types';
import { membershipRepo } from '@/repositories/membershipRepo';
import { messageRepo } from '@/repositories/messageRepo';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
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
  const isITAdmin = session?.role === 'it_admin';
  const isAdmin = isAdminRole(session?.role);

  const [member, setMember] = useState<Member | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<(ClassRegistration & { scheduleItem?: ScheduleItem })[]>([]);
  const [lessons, setLessons] = useState<PrivateLesson[]>([]);
  const [assignedTrainer, setAssignedTrainer] = useState<Staff | null>(null);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [error, setError] = useState(false);

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

  const load = useCallback(async () => {
    if (memberId === '' || staffId === '') {
      return;
    }
    try {
      setError(false);
      const [nextMember, nextMembership, threads, memberRegs, memberLessons, currentTrainer, staffList] =
        await Promise.all([
          api.getMember(memberId),
          membershipRepo.getMembership(api, memberId),
          messageRepo.listThreads(api, staffId).catch(() => []),
          membershipRepo.listRegistrations(api, memberId).catch(() => []),
          membershipRepo.listLessons(api, memberId).catch(() => []),
          api.getAssignedTrainer(memberId).catch(() => null),
          api.listStaff().catch(() => []),
        ]);
      const thread = threads.find((t: Thread) => t.memberId === memberId && t.staffId === staffId);
      setMember(nextMember);
      setMembership(nextMembership);
      setThreadId(thread?.id ?? null);
      setRegistrations(memberRegs);
      setLessons(memberLessons);
      setAssignedTrainer(currentTrainer);
      setAllStaff(staffList);
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
      await membershipRepo.updateAdmin(api, memberId, {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
      });
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
    setSelectedTrainerId(assignedTrainer?.id ?? (allStaff[0]?.id || null));
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
      await membershipRepo.changeMembership(api, memberId, selectedPlan.name, selectedPlan.monthlyAmountCents);
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
      await membershipRepo.updateMembershipAdmin(api, memberId, { status: newStatus });
      dialog.alert('Status Updated', `Membership status set to ${newStatus.toUpperCase()}.`, [{ text: 'OK' }], 'checkmark');
      await load();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Failed to update status.', [{ text: 'OK' }]);
    }
  }

  async function handleRescindCancellation() {
    try {
      await membershipRepo.rescindCancel(api, memberId);
      dialog.alert('Restored', 'Cancellation request rescinded and membership restored.', [{ text: 'OK' }], 'checkmark');
      await load();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Failed to restore membership.', [{ text: 'OK' }]);
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
      await membershipRepo.deleteAccount(api, memberId);
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

  return (
    <View style={styles.screen}>
      <YHeader subtitle={isAdmin ? (isITAdmin ? 'IT Admin · Member Management' : 'Staff Admin · Member Management') : 'Member Details'} />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>← Back to Members</Text>
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

            {/* Admin Edit Profile & Password Shortcuts */}
            {isAdmin ? (
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

        {/* Assigned Personal Trainer Card */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="barbell" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Assigned Trainer</Text>
            </View>
            {isAdmin ? (
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

        {/* Membership Details & Admin Plan Actions */}
        {member && membership ? (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>Membership Plan</Text>
              {isAdmin ? (
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
                  {isAdmin ? (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                      <Pressable
                        onPress={() => void handleRescindCancellation()}
                        style={[styles.smallActionBtn, { backgroundColor: '#15803D' }]}
                      >
                        <Text style={styles.smallActionText}>Restore / Keep Active</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void handleUpdateStatus('cancelled')}
                        style={[styles.smallActionBtn, { backgroundColor: colors.scarlet }]}
                      >
                        <Text style={styles.smallActionText}>Approve & Terminate</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Admin Quick Status Overrides */}
            {isAdmin ? (
              <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6 }}>
                  ADMIN STATUS CONTROL:
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
                {isAdmin ? (
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
                {isAdmin && les.status === 'booked' ? (
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

        {/* ADMIN DANGER ZONE: DELETE MEMBER ACCOUNT */}
        {isAdmin ? (
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
              {allStaff.map((st) => {
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
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#F8FAFC',
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
});
