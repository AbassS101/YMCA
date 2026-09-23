import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { isAdminRole, type Staff, type StaffRole } from '@/domain/types';
import { UserAvatar } from '@/components/UserAvatar';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii, typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

export default function StaffManagementScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const isAdmin = isAdminRole(session?.role);

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [roleFilter, setRoleFilter] = useState<'all' | 'it_admin' | 'staff_admin' | 'trainer' | 'desk' | 'admin'>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Add / Edit Staff Modal
  const [staffModalVisible, setStaffModalVisible] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRoleLabel, setFormRoleLabel] = useState('');
  const [formStaffRole, setFormStaffRole] = useState<StaffRole>('trainer');
  const [formAvatarUrl, setFormAvatarUrl] = useState('');
  const [submittingStaff, setSubmittingStaff] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Change Password Modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [targetStaff, setTargetStaff] = useState<Staff | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete Confirm Modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);

  const loadStaff = useCallback(async () => {
    try {
      setError(false);
      setLoading(true);
      const list = await api.listStaff(BRANCH_ID);
      setStaffList(list);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const filteredStaff = useMemo(() => {
    let result = staffList;
    if (roleFilter !== 'all') {
      if (roleFilter === 'admin') {
        result = result.filter(
          (s) => s.staffRole === 'admin' || s.staffRole === 'staff_admin' || s.staffRole === 'it_admin'
        );
      } else {
        result = result.filter((s) => s.staffRole === roleFilter);
      }
    }
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.roleLabel.toLowerCase().includes(q)
      );
    }
    return result;
  }, [staffList, roleFilter, query]);

  function openCreateModal() {
    setEditingStaffId(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('ymca-demo');
    setFormRoleLabel('Personal Wellness Trainer');
    setFormStaffRole('trainer');
    setFormAvatarUrl('');
    setModalError(null);
    setStaffModalVisible(true);
  }

  function openEditModal(staff: Staff) {
    setEditingStaffId(staff.id);
    setFormName(staff.name);
    setFormEmail(staff.email);
    setFormPassword('');
    setFormRoleLabel(staff.roleLabel);
    setFormStaffRole(staff.staffRole || 'trainer');
    setFormAvatarUrl(staff.avatarUrl || '');
    setModalError(null);
    setStaffModalVisible(true);
  }

  async function handleSaveStaff() {
    if (!formName.trim() || !formEmail.trim() || !formRoleLabel.trim()) {
      setModalError('Please fill in name, email, and role title.');
      return;
    }
    setSubmittingStaff(true);
    setModalError(null);

    try {
      if (editingStaffId) {
        await api.updateStaff(editingStaffId, {
          name: formName.trim(),
          email: formEmail.trim(),
          roleLabel: formRoleLabel.trim(),
          staffRole: formStaffRole,
          avatarUrl: formAvatarUrl.trim() || undefined,
        });
        if (formPassword.trim()) {
          await api.changeUserPassword(formEmail.trim(), formPassword.trim());
        }
        dialog.alert('Updated!', 'Staff profile updated successfully.', [{ text: 'OK' }], 'checkmark');
      } else {
        await api.createStaff({
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword.trim() || 'ymca-demo',
          roleLabel: formRoleLabel.trim(),
          staffRole: formStaffRole,
          homeBranchId: BRANCH_ID,
          avatarUrl: formAvatarUrl.trim() || undefined,
        });
        dialog.alert(
          'Staff Member Created!',
          `${formName} is now registered with ${formStaffRole.toUpperCase()} credentials.`,
          [{ text: 'OK' }],
          'checkmark'
        );
      }
      setStaffModalVisible(false);
      await loadStaff();
    } catch (err: any) {
      setModalError(err?.message || 'Could not save staff member.');
    } finally {
      setSubmittingStaff(false);
    }
  }

  function openPasswordModal(staff: Staff) {
    setTargetStaff(staff);
    setNewPassword('');
    setPasswordModalVisible(true);
  }

  async function handleSavePassword() {
    if (!targetStaff || !newPassword.trim()) {
      dialog.alert('Password Required', 'Please enter a new password.', [{ text: 'OK' }]);
      return;
    }
    setChangingPassword(true);
    try {
      await api.changeUserPassword(targetStaff.email, newPassword.trim());
      setPasswordModalVisible(false);
      dialog.alert('Password Updated', `Password for ${targetStaff.name} has been updated.`, [{ text: 'OK' }], 'checkmark');
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not change password.', [{ text: 'OK' }]);
    } finally {
      setChangingPassword(false);
    }
  }

  function promptDelete(staff: Staff) {
    setDeletingStaff(staff);
    setDeleteModalVisible(true);
  }

  async function handleConfirmDelete() {
    if (!deletingStaff) return;
    try {
      await api.deleteStaff(deletingStaff.id);
      setDeleteModalVisible(false);
      setDeletingStaff(null);
      dialog.alert('Removed', 'Staff member removed from branch directory.', [{ text: 'OK' }], 'checkmark');
      await loadStaff();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not delete staff.', [{ text: 'OK' }]);
    }
  }

  return (
    <View style={styles.screen}>
      <YHeader subtitle="Staff Admin & IT Admin · Staff & Trainers" />
      {error ? <ErrorBanner onRetry={() => void loadStaff()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        {/* Header Action Card */}
        <View style={styles.heroCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="people" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Staff & Trainer Roster</Text>
              <Text style={styles.heroSubtitle}>
                Provision trainer accounts, set credentials, and manage roles.
              </Text>
            </View>
          </View>

          {isAdmin ? (
            <Pressable
              onPress={openCreateModal}
              style={styles.addStaffBtn}
              accessibilityRole="button"
            >
              <Ionicons name="person-add" size={18} color="#FFFFFF" />
              <Text style={styles.addStaffBtnText}>+ Add New Staff or Trainer</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Role Filters */}
        <View style={styles.filterRow}>
          {[
            { key: 'all', label: 'All Staff' },
            { key: 'it_admin', label: 'IT Admin' },
            { key: 'staff_admin', label: 'Staff Admin' },
            { key: 'trainer', label: 'Trainers' },
            { key: 'desk', label: 'Front Desk' },
          ].map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setRoleFilter(f.key as any)}
              style={[styles.filterChip, roleFilter === f.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, roleFilter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Search */}
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Search staff by name, email, or role title..."
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Staff List */}
        <Text style={styles.sectionTitle}>Branch Team Members ({filteredStaff.length})</Text>

        {filteredStaff.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="person-outline" size={36} color={colors.muted} />
            <Text style={styles.emptyText}>No staff members found matching criteria.</Text>
          </View>
        ) : (
          filteredStaff.map((s) => {
            const isIT = s.staffRole === 'it_admin';
            const isStaffAdminRole = s.staffRole === 'staff_admin' || s.staffRole === 'admin';
            const isTrainerRole = s.staffRole === 'trainer';
            const roleBadgeBg = isIT ? '#F5F3FF' : isStaffAdminRole ? '#EFF6FF' : isTrainerRole ? '#F0FDF4' : '#FEF3C7';
            const roleBadgeColor = isIT ? '#7C3AED' : isStaffAdminRole ? colors.primary : isTrainerRole ? '#15803D' : '#B45309';
            const roleBadgeText = isIT ? 'IT ADMIN' : isStaffAdminRole ? 'STAFF ADMIN' : isTrainerRole ? 'TRAINER' : 'FRONT DESK';

            return (
              <View key={s.id} style={styles.staffCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <UserAvatar uri={s.avatarUrl} name={s.name} size={46} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <View style={[styles.roleBadge, { backgroundColor: roleBadgeBg }]}>
                        <Text style={[styles.roleBadgeText, { color: roleBadgeColor }]}>
                          {roleBadgeText}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.staffName}>{s.name}</Text>
                    <Text style={styles.staffRoleLabel}>{s.roleLabel}</Text>
                    <Text style={styles.staffEmail}>{s.email}</Text>
                  </View>
                </View>

                {/* Admin Actions */}
                {isAdmin ? (
                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => openEditModal(s)}
                      style={styles.actionBtnOutline}
                      accessibilityRole="button"
                    >
                      <Ionicons name="pencil" size={14} color={colors.primary} />
                      <Text style={styles.actionBtnText}>Edit Info</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => openPasswordModal(s)}
                      style={styles.actionBtnOutline}
                      accessibilityRole="button"
                    >
                      <Ionicons name="key" size={14} color={colors.nearBlack} />
                      <Text style={[styles.actionBtnText, { color: colors.nearBlack }]}>Password</Text>
                    </Pressable>

                    {s.id !== session?.userId ? (
                      <Pressable
                        onPress={() => promptDelete(s)}
                        style={styles.actionBtnDestructive}
                        accessibilityRole="button"
                      >
                        <Ionicons name="trash" size={14} color={colors.scarlet} />
                        <Text style={[styles.actionBtnText, { color: colors.scarlet }]}>Delete</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ========================================== */}
      {/* MODAL: CREATE / EDIT STAFF */}
      {/* ========================================== */}
      <Modal visible={staffModalVisible} animationType="slide" transparent onRequestClose={() => setStaffModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingStaffId ? 'Edit Staff Profile' : 'Add New Staff / Trainer'}
              </Text>
              <Pressable onPress={() => setStaffModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.nearBlack} />
              </Pressable>
            </View>

            {modalError ? <ErrorBanner message={modalError} /> : null}

            <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
              <TextField label="Full Name *" value={formName} onChangeText={setFormName} placeholder="e.g. David Martinez" />
              <TextField label="Email Address *" value={formEmail} onChangeText={setFormEmail} autoCapitalize="none" keyboardType="email-address" placeholder="david@silverspring.ymca" />

              {/* Profile Avatar / Silhouette Selection */}
              <Text style={styles.fieldLabel}>Profile Avatar & Silhouette</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 }}>
                <UserAvatar uri={formAvatarUrl} name={formName || 'Staff'} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.nearBlack }}>
                    {formAvatarUrl ? 'Custom Silhouette / Photo' : 'Clean Vector Silhouette (Default)'}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>
                    Pick a preset silhouette below or enter a custom image URL.
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                {[
                  { label: 'Clean Silhouette', url: '' },
                  { label: 'Trainer (Alex)', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80' },
                  { label: 'Trainer (Sarah)', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80' },
                  { label: 'Director (Jane)', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80' },
                  { label: 'IT Admin (David)', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80' },
                ].map((preset) => {
                  const isMatch = formAvatarUrl === preset.url;
                  return (
                    <Pressable
                      key={preset.label}
                      onPress={() => setFormAvatarUrl(preset.url)}
                      style={[
                        styles.avatarPresetChip,
                        isMatch && styles.avatarPresetChipActive,
                      ]}
                    >
                      <Text style={[styles.avatarPresetText, isMatch && { color: colors.primary, fontWeight: '700' }]}>
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextField
                label="Custom Avatar Photo URL (Optional)"
                value={formAvatarUrl}
                onChangeText={setFormAvatarUrl}
                placeholder="https://... or leave blank for silhouette"
                autoCapitalize="none"
              />

              <TextField
                label={editingStaffId ? "Update Password (Optional)" : "Initial Password"}
                value={formPassword}
                onChangeText={setFormPassword}
                secureTextEntry
                placeholder={editingStaffId ? "Leave blank to keep unchanged" : "Default: ymca-demo"}
              />

              <TextField label="Role Title / Specialty *" value={formRoleLabel} onChangeText={setFormRoleLabel} placeholder="e.g. Strength Coach, Aquatics Specialist" />

              <Text style={styles.fieldLabel}>Staff Access Level</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { key: 'it_admin', label: 'IT Admin', desc: 'Full IT & system admin access' },
                  { key: 'staff_admin', label: 'Staff Admin', desc: 'Full branch administrative power' },
                  { key: 'trainer', label: 'Trainer / Coach', desc: 'Teaches classes & private lessons' },
                  { key: 'desk', label: 'Front Desk', desc: 'Check-in & member services' },
                ].map((r) => {
                  const isSelected = formStaffRole === r.key || (r.key === 'staff_admin' && formStaffRole === 'admin');
                  return (
                    <Pressable
                      key={r.key}
                      onPress={() => setFormStaffRole(r.key as StaffRole)}
                      style={[
                        styles.roleSelectCard,
                        { width: '48%' },
                        isSelected && styles.roleSelectCardActive,
                      ]}
                    >
                      <Text style={[styles.roleSelectTitle, isSelected && { color: colors.primary }]}>
                        {r.label}
                      </Text>
                      <Text style={styles.roleSelectDesc}>{r.desc}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ marginTop: 12 }}>
                <PrimaryButton
                  title={editingStaffId ? 'Save Profile Changes' : 'Create Staff Account'}
                  onPress={() => void handleSaveStaff()}
                  loading={submittingStaff}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================== */}
      {/* MODAL: CHANGE PASSWORD */}
      {/* ========================================== */}
      <Modal visible={passwordModalVisible} animationType="fade" transparent onRequestClose={() => setPasswordModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Staff Password</Text>
              <Pressable onPress={() => setPasswordModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.nearBlack} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>
              Update login password for {targetStaff?.name} ({targetStaff?.email}).
            </Text>

            <TextField
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Enter new password"
            />

            <View style={{ marginTop: 16 }}>
              <PrimaryButton
                title="Update Password"
                onPress={() => void handleSavePassword()}
                loading={changingPassword}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* MODAL: DELETE CONFIRM */}
      {/* ========================================== */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="trash" size={26} color={colors.scarlet} />
              </View>
              <Text style={[styles.modalTitle, { marginTop: 10 }]}>Remove Staff Member?</Text>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 6 }}>
                Are you sure you want to remove {deletingStaff?.name} ({deletingStaff?.email}) from the staff directory?
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable
                onPress={() => setDeleteModalVisible(false)}
                style={[styles.actionBtnOutline, { flex: 1, paddingVertical: 12 }]}
              >
                <Text style={{ textAlign: 'center', fontWeight: '700', color: colors.muted }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleConfirmDelete()}
                style={[styles.actionBtnDestructive, { flex: 1, paddingVertical: 12, backgroundColor: colors.scarlet }]}
              >
                <Text style={{ textAlign: 'center', fontWeight: '700', color: '#FFFFFF' }}>Delete Staff</Text>
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
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    ...cardStyle,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.nearBlack,
  },
  heroSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  addStaffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radii.sm,
  },
  addStaffBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nearBlack,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.nearBlack,
    marginTop: 4,
  },
  staffCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    ...cardStyle,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  staffName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.nearBlack,
  },
  staffRoleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 1,
  },
  staffEmail: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  actionBtnDestructive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
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
    maxWidth: 500,
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  roleSelectCard: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleSelectCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  roleSelectTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  roleSelectDesc: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
  avatarPresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  avatarPresetChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: colors.primary,
  },
  avatarPresetText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.nearBlack,
  },
});
