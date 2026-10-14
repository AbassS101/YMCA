import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { UserAvatar } from '@/components/UserAvatar';
import { BroadcastNoticeModal } from '@/components/staff/BroadcastNoticeModal';
import { KpiRow } from '@/components/staff/KpiTile';
import { PersonaHero } from '@/components/staff/PersonaHero';
import { QuickActionBar } from '@/components/staff/QuickActionBar';
import { SessionRequestsOversight } from '@/components/staff/SessionRequestsOversight';
import { ActionButton, EmptyState, ListRow, SectionCard, StatusPill } from '@/components/staff/SectionCard';
import { dialog } from '@/context/DialogContext';
import { useAppConfig } from '@/context/AppConfigContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { getDemoToday } from '@/domain/demoClock';
import { personaForRole } from '@/domain/staffCapabilities';
import type { Member, Staff } from '@/domain/types';
import { formatWellnessPrice } from '@/domain/wellnessPrograms';
import { availabilityRepo } from '@/repositories/lessonRepo';
import { radii } from '@/theme/typography';

import { DashboardScaffold } from './DashboardScaffold';
import { BRANCH_ID, formatLongDate, percent } from './format';
import { TrainerWorkspace } from './TrainerWorkspace';
import { useTrainerDay } from './useTrainerDay';

type TrainerLoad = {
  trainer: Staff;
  lessonsToday: number;
  classesToday: number;
  openSlotsToday: number;
  clientCount: number;
};

export function WellnessDirectorDashboard({ staffId }: { staffId: string }) {
  const router = useRouter();
  const { api } = useSession();
  const { config } = useAppConfig();
  const { colors: tc } = useTheme();
  const { theme } = useStaffCapabilities();
  const day = useTrainerDay(staffId);

  const [team, setTeam] = useState<TrainerLoad[]>([]);
  const [unassigned, setUnassigned] = useState<Member[]>([]);
  const [assigningMember, setAssigningMember] = useState<Member | null>(null);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [broadcastVisible, setBroadcastVisible] = useState(false);
  const [teamError, setTeamError] = useState(false);

  const loadTeam = useCallback(async () => {
    try {
      setTeamError(false);
      const today = getDemoToday();
      const [staff, members] = await Promise.all([api.listStaff(BRANCH_ID), api.listAllMembers(BRANCH_ID)]);
      const trainers = staff.filter((s) => {
        const persona = personaForRole(s.staffRole);
        return persona === 'trainer' || persona === 'swimInstructor' || persona === 'wellnessDirector';
      });

      const loads = await Promise.all(
        trainers.map(async (trainer) => {
          const [lessons, classes, slots, clients] = await Promise.all([
            api.listStaffLessons(trainer.id, today).catch(() => []),
            api.getStaffDay(trainer.id, today).catch(() => []),
            availabilityRepo.listWindows(api, trainer.id, today, today).catch(() => []),
            api.listAssignedMembers(trainer.id).catch(() => []),
          ]);
          return {
            trainer,
            lessonsToday: lessons.length,
            classesToday: classes.length,
            openSlotsToday: slots.length,
            clientCount: clients.length,
          };
        })
      );
      loads.sort((a, b) => b.lessonsToday + b.classesToday - (a.lessonsToday + a.classesToday));

      const candidates = members.filter((m) => m.status === 'active' && m.type !== '1-Day Guest Pass');
      const withTrainer = await Promise.all(
        candidates.map(async (m) => ({ member: m, trainer: await api.getAssignedTrainer(m.id).catch(() => null) }))
      );

      setTeam(loads);
      setUnassigned(withTrainer.filter((r) => r.trainer == null).map((r) => r.member));
    } catch {
      setTeamError(true);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void loadTeam();
    }, [loadTeam])
  );

  const assignTo = async (trainer: Staff) => {
    if (!assigningMember) return;
    setSavingAssignment(true);
    try {
      await api.setAssignedTrainer(assigningMember.id, trainer.id);
      dialog.alert('Trainer Assigned', `${trainer.name} is now coaching ${assigningMember.name}.`, [{ text: 'OK' }], 'checkmark');
      setAssigningMember(null);
      await Promise.all([loadTeam(), day.reload()]);
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not assign trainer.');
    } finally {
      setSavingAssignment(false);
    }
  };

  const teamSessions = team.reduce((sum, t) => sum + t.lessonsToday, 0);
  const teamCapacity = team.reduce((sum, t) => sum + t.lessonsToday + t.openSlotsToday, 0);
  const utilization = percent(teamSessions, teamCapacity);

  return (
    <DashboardScaffold
      subtitle="Wellness Director · Trainer Team"
      error={day.error || teamError}
      onRetry={() => {
        void day.reload();
        void loadTeam();
      }}
      overlay={
        <>
          <BroadcastNoticeModal
            visible={broadcastVisible}
            onClose={() => setBroadcastVisible(false)}
            defaultCategory="program"
          />
          <Modal visible={assigningMember != null} transparent animationType="slide" onRequestClose={() => setAssigningMember(null)}>
            <View style={styles.overlay}>
              <View style={[styles.modal, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: tc.text }]}>Assign {assigningMember?.name}</Text>
                  <Pressable onPress={() => setAssigningMember(null)} hitSlop={8} accessibilityLabel="Close">
                    <Ionicons name="close" size={24} color={tc.textMuted} />
                  </Pressable>
                </View>
                <Text style={{ fontSize: 13, color: tc.textMuted }}>
                  Pick a trainer. Current client counts help you balance the team.
                </Text>
                <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ gap: 8 }}>
                  {team.map(({ trainer, clientCount }) => (
                    <Pressable
                      key={trainer.id}
                      disabled={savingAssignment}
                      onPress={() => void assignTo(trainer)}
                      style={[styles.pickRow, { borderColor: tc.cardBorder }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Assign to ${trainer.name}`}
                    >
                      <UserAvatar uri={trainer.avatarUrl} name={trainer.name} size={36} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.name, { color: tc.text }]}>
                          {trainer.id === staffId ? `${trainer.name} (me)` : trainer.name}
                        </Text>
                        <Text style={[styles.meta, { color: tc.textMuted }]}>
                          {trainer.roleLabel} · {clientCount} clients
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={tc.primary} />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </>
      }
    >
      <PersonaHero
        theme={theme}
        name={day.profile?.name ?? 'Wellness Director'}
        avatarUrl={day.profile?.avatarUrl}
        roleLabel="Wellness Director"
        dateLabel={formatLongDate(getDemoToday())}
      >
        <KpiRow
          items={[
            { label: 'Team Sessions Today', value: teamSessions, icon: 'body', color: theme.color },
            { label: 'Slot Utilization', value: `${utilization}%`, icon: 'speedometer', color: '#0284C7' },
            { label: 'Unassigned Clients', value: unassigned.length, icon: 'person-add', color: '#D97706' },
            { label: 'Trainers', value: team.length, icon: 'people', color: '#15803D' },
          ]}
        />
      </PersonaHero>

      <QuickActionBar
        actions={[
          { key: 'members', label: 'All Clients', icon: 'people-outline', onPress: () => router.push('/(staff)/members'), color: theme.color },
          { key: 'slots', label: 'Team Hours', icon: 'calendar-outline', onPress: () => router.push('/(staff)/trainer-availability'), color: '#15803D' },
          { key: 'team', label: 'Trainer Directory', icon: 'id-card-outline', onPress: () => router.push('/(staff)/staff-management'), color: '#0284C7' },
          { key: 'notice', label: 'Wellness Notice', icon: 'megaphone-outline', onPress: () => setBroadcastVisible(true), color: '#B45309' },
        ]}
      />

      <SectionCard
        title="Trainer Team Today"
        icon="people-circle"
        accent={theme.color}
        subtitle="Booked 1-on-1s against open slots for today"
      >
        {team.length === 0 ? (
          <EmptyState icon="people-outline" text="No trainers found for this branch." />
        ) : (
          team.map((t) => {
            const capacity = t.lessonsToday + t.openSlotsToday;
            const pct = percent(t.lessonsToday, capacity);
            return (
              <View key={t.trainer.id} style={[styles.teamRow, { borderColor: tc.cardBorder }]}>
                <UserAvatar uri={t.trainer.avatarUrl} name={t.trainer.name} size={40} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.name, { color: tc.text }]}>
                    {t.trainer.id === staffId ? `${t.trainer.name} (me)` : t.trainer.name}
                  </Text>
                  <Text style={[styles.meta, { color: tc.textMuted }]}>
                    {t.lessonsToday} 1-on-1 · {t.classesToday} classes · {t.openSlotsToday} open slots · {t.clientCount} clients
                  </Text>
                  <View style={[styles.barTrack, { backgroundColor: tc.cardBorder }]}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: theme.color }]} />
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <StatusPill
                    label={capacity === 0 ? 'NO SLOTS' : `${pct}%`}
                    color={capacity === 0 ? tc.textMuted : theme.color}
                    bg={capacity === 0 ? tc.cardBorder : theme.softBg}
                  />
                  <ActionButton
                    label="Hours"
                    icon="calendar-outline"
                    color={theme.color}
                    variant="outline"
                    onPress={() => router.push({ pathname: '/(staff)/trainer-availability', params: { staffId: t.trainer.id } })}
                  />
                </View>
              </View>
            );
          })
        )}
      </SectionCard>

      <SectionCard
        title="Clients Without a Trainer"
        icon="person-add"
        accent="#D97706"
        count={unassigned.length}
        actionLabel="See all"
        onAction={() => router.push('/(staff)/members')}
      >
        {unassigned.length === 0 ? (
          <EmptyState icon="checkmark-done-outline" text="Every active member has a trainer." />
        ) : (
          unassigned.slice(0, 6).map((m) => (
            <ListRow
              key={m.id}
              title={m.name}
              subtitle={`${m.type} · ${m.membershipId}`}
              left={<UserAvatar uri={m.avatarUrl} name={m.name} size={36} />}
              right={<ActionButton label="Assign" icon="person-add" color="#D97706" onPress={() => setAssigningMember(m)} />}
              onPress={() => router.push(`/(staff)/members/${m.id}`)}
            />
          ))
        )}
      </SectionCard>

      <SessionRequestsOversight
        viewerId={staffId}
        accent={theme.color}
        title="Personal Training Requests"
        lessonType="training"
      />

      <SectionCard title="Wellness Programs" icon="fitness" accent={theme.color} subtitle="Branch member pricing">
        {config.wellnessPackages.map((p) => {
          const from = Math.min(...p.tiers.map((tier) => tier.branchMemberPerSession));
          return (
            <ListRow
              key={p.id}
              title={p.shortTitle}
              subtitle={`${p.durationMinutes} min · ${p.participants} · ${p.tiers.length} package sizes`}
              right={<Text style={[styles.price, { color: theme.color }]}>from {formatWellnessPrice(from)}</Text>}
            />
          );
        })}
      </SectionCard>

      <Text style={[styles.groupLabel, { color: tc.textMuted }]}>MY COACHING</Text>
      <TrainerWorkspace day={day} staffId={staffId} accent={theme.color} showQuickActions={false} />
    </DashboardScaffold>
  );
}

const styles = StyleSheet.create({
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
  },
  meta: {
    fontSize: 12,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  price: {
    fontSize: 13,
    fontWeight: '800',
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 480,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
});
