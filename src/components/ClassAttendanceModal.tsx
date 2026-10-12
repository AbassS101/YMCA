import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { UserAvatar } from '@/components/UserAvatar';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import type { AttendanceStatus, ClassRegistration, Member, ScheduleItem } from '@/domain/types';
import { registrationRepo } from '@/repositories/registrationRepo';
import { trainerRepo } from '@/repositories/trainerRepo';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii, spacing, typography } from '@/theme/typography';

interface ClassAttendanceModalProps {
  visible: boolean;
  onClose: () => void;
  scheduleItem: ScheduleItem | null;
  onAttendanceChanged?: () => void;
}

type RosterEntry = {
  registration: ClassRegistration;
  member: Member;
};

export function ClassAttendanceModal({
  visible,
  onClose,
  scheduleItem,
  onAttendanceChanged,
}: ClassAttendanceModalProps) {
  const { api } = useSession();
  const { colors: tc, isDark } = useTheme();

  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [allBranchMembers, setAllBranchMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [walkInMode, setWalkInMode] = useState(false);
  const [walkInSearch, setWalkInSearch] = useState('');
  const [addingWalkInId, setAddingWalkInId] = useState<string | null>(null);

  const loadRoster = useCallback(async () => {
    if (!scheduleItem) return;
    setLoading(true);
    try {
      const [regs, members, allMembers] = await Promise.all([
        trainerRepo.getClassRegistrations(api, scheduleItem.id),
        registrationRepo.roster(api, scheduleItem.id),
        api.listAllMembers(scheduleItem.branchId || 'silver-spring'),
      ]);

      const memberMap = new Map<string, Member>();
      for (const m of allMembers) {
        memberMap.set(m.id, m);
      }

      const entries: RosterEntry[] = regs.map((reg) => ({
        registration: reg,
        member: memberMap.get(reg.memberId) ?? {
          id: reg.memberId,
          name: 'YMCA Member',
          email: '',
          phone: '',
          address: '',
          membershipId: reg.memberId,
          homeBranchId: scheduleItem.branchId,
          type: 'Adult',
          status: 'active',
        },
      }));

      // Sort alphabetically
      entries.sort((a, b) => a.member.name.localeCompare(b.member.name));
      setRoster(entries);
      setAllBranchMembers(allMembers);
    } catch {
      setRoster([]);
    } finally {
      setLoading(false);
    }
  }, [api, scheduleItem]);

  useEffect(() => {
    if (visible && scheduleItem) {
      void loadRoster();
      setSearchQuery('');
      setWalkInMode(false);
      setWalkInSearch('');
    }
  }, [visible, scheduleItem, loadRoster]);

  const handleMarkAttendance = async (memberId: string, status: AttendanceStatus) => {
    if (!scheduleItem) return;
    try {
      await trainerRepo.markClassAttendance(api, scheduleItem.id, memberId, status);
      // Optimistic update
      setRoster((prev) =>
        prev.map((r) =>
          r.member.id === memberId
            ? { ...r, registration: { ...r.registration, attendanceStatus: status } }
            : r
        )
      );
      onAttendanceChanged?.();
    } catch {
      dialog.alert('Error', 'Could not record attendance status.');
    }
  };

  const handleAddWalkIn = async (member: Member) => {
    if (!scheduleItem) return;
    setAddingWalkInId(member.id);
    try {
      const newReg = await trainerRepo.addWalkIn(api, scheduleItem.id, member.id);
      setRoster((prev) => [
        ...prev,
        {
          registration: newReg,
          member,
        },
      ]);
      setWalkInMode(false);
      setWalkInSearch('');
      dialog.alert(
        'Walk-In Checked In',
        `${member.name} has been added to the roster and marked as attended.`,
        [{ text: 'OK' }],
        'checkmark'
      );
      onAttendanceChanged?.();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not add walk-in attendee.');
    } finally {
      setAddingWalkInId(null);
    }
  };

  const attendedCount = roster.filter((r) => r.registration.attendanceStatus === 'attended').length;
  const noShowCount = roster.filter((r) => r.registration.attendanceStatus === 'no_show').length;

  const filteredRoster = roster.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.member.name.toLowerCase().includes(q) ||
      r.member.email.toLowerCase().includes(q) ||
      r.member.membershipId.toLowerCase().includes(q)
    );
  });

  const enrolledMemberIds = new Set(roster.map((r) => r.member.id));
  const candidateWalkIns = allBranchMembers.filter((m) => {
    if (enrolledMemberIds.has(m.id)) return false;
    if (!walkInSearch.trim()) return true;
    const q = walkInSearch.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.membershipId.toLowerCase().includes(q)
    );
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalSheet,
            { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: tc.cardBorder }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="clipboard" size={20} color={colors.primary} />
                <Text style={[styles.title, { color: tc.text }]}>Class Roster & Attendance</Text>
              </View>
              {scheduleItem ? (
                <Text style={[styles.subtitle, { color: tc.textMuted }]}>
                  {scheduleItem.title} · {scheduleItem.location}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close modal">
              <Ionicons name="close" size={24} color={tc.textMuted} />
            </Pressable>
          </View>

          {/* Stats Bar */}
          <View
            style={[
              styles.statsBar,
              { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderBottomColor: tc.cardBorder },
            ]}
          >
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: tc.text }]}>{roster.length}</Text>
              <Text style={[styles.statLabel, { color: tc.textMuted }]}>Registered</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: '#15803D' }]}>{attendedCount}</Text>
              <Text style={[styles.statLabel, { color: tc.textMuted }]}>Checked In</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.scarlet }]}>{noShowCount}</Text>
              <Text style={[styles.statLabel, { color: tc.textMuted }]}>No-Show</Text>
            </View>
            <View style={styles.statDivider} />
            <Pressable
              onPress={() => setWalkInMode(!walkInMode)}
              style={[
                styles.walkInBtn,
                { backgroundColor: walkInMode ? colors.primary : colors.primaryLight },
              ]}
              accessibilityRole="button"
            >
              <Ionicons
                name={walkInMode ? 'list' : 'person-add'}
                size={16}
                color={walkInMode ? '#FFFFFF' : colors.primaryDark}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: walkInMode ? '#FFFFFF' : colors.primaryDark,
                }}
              >
                {walkInMode ? 'View Roster' : '+ Add Walk-In'}
              </Text>
            </Pressable>
          </View>

          {/* Body Content */}
          {walkInMode ? (
            /* WALK-IN SELECTION MODE */
            <View style={{ flex: 1, padding: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: tc.text, marginBottom: 8 }}>
                Select Member to Check In as Walk-In:
              </Text>
              <View
                style={[
                  styles.searchWrap,
                  { backgroundColor: isDark ? '#1F2937' : '#F3F4F6', borderColor: tc.cardBorder },
                ]}
              >
                <Ionicons name="search" size={16} color={tc.textMuted} />
                <TextInput
                  value={walkInSearch}
                  onChangeText={setWalkInSearch}
                  placeholder="Search member name or ID..."
                  placeholderTextColor={tc.textMuted}
                  style={[styles.searchInput, { color: tc.text }]}
                  autoCapitalize="none"
                />
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
                {candidateWalkIns.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: tc.textMuted, marginTop: 20 }}>
                    No un-enrolled members found.
                  </Text>
                ) : (
                  candidateWalkIns.map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => void handleAddWalkIn(m)}
                      disabled={addingWalkInId === m.id}
                      style={[
                        styles.walkInRow,
                        { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: tc.cardBorder },
                      ]}
                    >
                      <UserAvatar uri={m.avatarUrl} name={m.name} size={36} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: tc.text }}>
                          {m.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: tc.textMuted }}>
                          {m.membershipId} · {m.type}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: '#15803D',
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: radii.sm,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                          {addingWalkInId === m.id ? 'Adding...' : 'Check In'}
                        </Text>
                      </View>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>
          ) : (
            /* ACTIVE ROSTER ATTENDANCE MODE */
            <View style={{ flex: 1, padding: 16 }}>
              {/* Search Attendee */}
              <View
                style={[
                  styles.searchWrap,
                  { backgroundColor: isDark ? '#1F2937' : '#F3F4F6', borderColor: tc.cardBorder },
                ]}
              >
                <Ionicons name="search" size={16} color={tc.textMuted} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Filter attendees by name or ID..."
                  placeholderTextColor={tc.textMuted}
                  style={[styles.searchInput, { color: tc.text }]}
                  autoCapitalize="none"
                />
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingVertical: 10 }}>
                {loading ? (
                  <Text style={{ textAlign: 'center', color: tc.textMuted, marginTop: 20 }}>
                    Loading class attendees...
                  </Text>
                ) : filteredRoster.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
                    <Ionicons name="people-outline" size={36} color={tc.textMuted} />
                    <Text style={{ color: tc.textMuted, fontSize: 14 }}>
                      {roster.length === 0
                        ? 'No members registered yet for this class.'
                        : 'No matching attendees.'}
                    </Text>
                  </View>
                ) : (
                  filteredRoster.map(({ registration, member }) => {
                    const status = registration.attendanceStatus;
                    const isAttended = status === 'attended';
                    const isNoShow = status === 'no_show';

                    return (
                      <View
                        key={registration.id}
                        style={[
                          styles.rosterCard,
                          {
                            backgroundColor: isAttended
                              ? isDark
                                ? '#064E3B'
                                : '#F0FDF4'
                              : isNoShow
                              ? isDark
                                ? '#7F1D1D'
                                : '#FEF2F2'
                              : isDark
                              ? '#1E293B'
                              : '#FFFFFF',
                            borderColor: isAttended
                              ? '#15803D'
                              : isNoShow
                              ? colors.scarlet
                              : tc.cardBorder,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <UserAvatar uri={member.avatarUrl} name={member.name} size={40} />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.attendeeName, { color: tc.text }]}>
                                {member.name}
                              </Text>
                              {isAttended ? (
                                <View style={styles.attendedBadge}>
                                  <Ionicons name="checkmark-circle" size={13} color="#15803D" />
                                  <Text style={styles.attendedBadgeText}>ATTENDED</Text>
                                </View>
                              ) : isNoShow ? (
                                <View style={styles.noShowBadge}>
                                  <Ionicons name="close-circle" size={13} color={colors.scarlet} />
                                  <Text style={styles.noShowBadgeText}>NO-SHOW</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={[styles.attendeeMeta, { color: tc.textMuted }]}>
                              ID: {member.membershipId} · {member.email || member.phone}
                            </Text>
                          </View>
                        </View>

                        {/* Attendance Actions */}
                        <View style={styles.actionRow}>
                          <Pressable
                            onPress={() => void handleMarkAttendance(member.id, 'attended')}
                            style={[
                              styles.attBtn,
                              {
                                backgroundColor: isAttended ? '#15803D' : isDark ? '#374151' : '#F3F4F6',
                                borderColor: isAttended ? '#15803D' : tc.cardBorder,
                              },
                            ]}
                          >
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color={isAttended ? '#FFFFFF' : '#15803D'}
                            />
                            <Text
                              style={[
                                styles.attBtnText,
                                { color: isAttended ? '#FFFFFF' : '#15803D' },
                              ]}
                            >
                              Check In
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => void handleMarkAttendance(member.id, 'no_show')}
                            style={[
                              styles.attBtn,
                              {
                                backgroundColor: isNoShow ? colors.scarlet : isDark ? '#374151' : '#F3F4F6',
                                borderColor: isNoShow ? colors.scarlet : tc.cardBorder,
                              },
                            ]}
                          >
                            <Ionicons
                              name="close"
                              size={16}
                              color={isNoShow ? '#FFFFFF' : colors.scarlet}
                            />
                            <Text
                              style={[
                                styles.attBtnText,
                                { color: isNoShow ? '#FFFFFF' : colors.scarlet },
                              ]}
                            >
                              No-Show
                            </Text>
                          </Pressable>

                          {status ? (
                            <Pressable
                              onPress={() => void handleMarkAttendance(member.id, 'unmarked')}
                              style={[styles.attBtnReset, { borderColor: tc.cardBorder }]}
                            >
                              <Text style={{ fontSize: 11, color: tc.textMuted }}>Reset</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: tc.cardBorder }]}>
            <PrimaryButton title="Done" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '88%',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    ...cardStyle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 17,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 14,
  },
  walkInBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  rosterCard: {
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 10,
  },
  attendeeName: {
    fontSize: 15,
    fontWeight: '700',
  },
  attendeeMeta: {
    fontSize: 12,
  },
  attendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  attendedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  noShowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  noShowBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.scarlet,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  attBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  attBtnReset: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  walkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
});
