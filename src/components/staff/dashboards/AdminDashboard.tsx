import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ClassAttendanceModal } from '@/components/ClassAttendanceModal';
import { UserAvatar } from '@/components/UserAvatar';
import { BroadcastNoticeModal } from '@/components/staff/BroadcastNoticeModal';
import { KpiRow } from '@/components/staff/KpiTile';
import { PersonaHero } from '@/components/staff/PersonaHero';
import { QuickActionBar } from '@/components/staff/QuickActionBar';
import { SessionRequestsOversight } from '@/components/staff/SessionRequestsOversight';
import { ActionButton, EmptyState, ListRow, SectionCard, StatusPill } from '@/components/staff/SectionCard';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { getDemoToday } from '@/domain/demoClock';
import { formatShortDate } from '@/domain/displayDates';
import { personaForRole, personaTheme } from '@/domain/staffCapabilities';
import type { CancelRequest, ComplaintSuggestion, Member, ScheduleItem, Staff } from '@/domain/types';
import { registrationRepo } from '@/repositories/registrationRepo';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import { streakRepo } from '@/repositories/streakRepo';
import { colors } from '@/theme/colors';

import { DashboardScaffold } from './DashboardScaffold';
import { BRANCH_ID, formatClockTime, formatLongDate, percent } from './format';

const STALE_CANCEL_DAYS = 7;
const FULL_CLASS_RATIO = 0.9;

type ClassFill = { item: ScheduleItem; registered: number };
type TeamMember = { staff: Staff; sessionsToday: number };
type Attention = { key: string; title: string; detail: string; tone: string; route: string };

export function AdminDashboard({ staffId }: { staffId: string }) {
  const router = useRouter();
  const { api } = useSession();
  const { colors: tc } = useTheme();
  const { theme, isITAdmin, isWellnessDirector, can } = useStaffCapabilities();
  const seesComplaints = can('manageComplaints');

  const [profile, setProfile] = useState<Staff | null>(null);
  const [classes, setClasses] = useState<ClassFill[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [cancels, setCancels] = useState<CancelRequest[]>([]);
  const [feedback, setFeedback] = useState<ComplaintSuggestion[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [checkIns, setCheckIns] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [attendanceClass, setAttendanceClass] = useState<ScheduleItem | null>(null);
  const [broadcastVisible, setBroadcastVisible] = useState(false);
  const [error, setError] = useState(false);

  const today = getDemoToday();

  const load = useCallback(async () => {
    if (staffId === '') return;
    try {
      setError(false);
      const [me, allClasses, allMembers, pending, complaints, staff] = await Promise.all([
        api.getStaff(staffId).catch(() => null),
        scheduleRepo.listAll(api, BRANCH_ID),
        api.listAllMembers(BRANCH_ID),
        api.listPendingCancels(BRANCH_ID).catch(() => []),
        seesComplaints
          ? api.listComplaintsSuggestions(BRANCH_ID).catch(() => [] as ComplaintSuggestion[])
          : Promise.resolve([] as ComplaintSuggestion[]),
        api.listStaff(BRANCH_ID).catch(() => []),
      ]);
      const todays = allClasses
        .filter((c) => c.start.slice(0, 10) === today)
        .sort((a, b) => a.start.localeCompare(b.start));

      const [fills, streaks, teamLoads, trainerLinks] = await Promise.all([
        Promise.all(todays.map(async (item) => ({ item, registered: (await registrationRepo.roster(api, item.id)).length }))),
        Promise.all(allMembers.map((m) => streakRepo.getStreakProfile(m.id).catch(() => null))),
        Promise.all(
          staff
            .filter((s) => {
              const persona = personaForRole(s.staffRole);
              return persona === 'trainer' || persona === 'swimInstructor';
            })
            .map(async (s) => ({ staff: s, sessionsToday: (await api.listStaffLessons(s.id, today).catch(() => [])).length }))
        ),
        Promise.all(
          allMembers
            .filter((m) => m.status === 'active' && m.type !== '1-Day Guest Pass')
            .map((m) => api.getAssignedTrainer(m.id).catch(() => null))
        ),
      ]);

      setProfile(me);
      setClasses(fills);
      setMembers(allMembers);
      setCancels(pending);
      setFeedback(complaints.filter((c) => c.status !== 'resolved'));
      setTeam(teamLoads);
      setCheckIns(streaks.filter((p) => p?.checkInDates.includes(today)).length);
      setUnassignedCount(trainerLinks.filter((t) => t == null).length);
    } catch {
      setError(true);
    }
  }, [api, staffId, today, seesComplaints]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const registered = classes.reduce((sum, c) => sum + c.registered, 0);
  const capacity = classes.reduce((sum, c) => sum + c.item.capacity, 0);
  const fillRate = percent(registered, capacity);
  const newComplaints = feedback.filter((f) => f.status === 'submitted' && f.type === 'complaint');
  const staleCancels = cancels.filter((c) => {
    const age = (new Date(`${today}T12:00:00`).getTime() - new Date(c.requestedAt).getTime()) / 86_400_000;
    return age >= STALE_CANCEL_DAYS;
  });
  const fullClasses = classes.filter((c) => c.item.capacity > 0 && c.registered / c.item.capacity >= FULL_CLASS_RATIO);

  const attention: Attention[] = [
    ...(staleCancels.length > 0
      ? [{
          key: 'stale',
          title: `${staleCancels.length} cancellation${staleCancels.length === 1 ? '' : 's'} waiting ${STALE_CANCEL_DAYS}+ days`,
          detail: 'Owned by the Membership Director. You can step in from any member profile.',
          tone: colors.scarlet,
          route: '/(staff)/members',
        }]
      : []),
    ...(seesComplaints && newComplaints.length > 0
      ? [{
          key: 'complaints',
          title: `${newComplaints.length} new complaint${newComplaints.length === 1 ? '' : 's'}`,
          detail: 'No staff response yet.',
          tone: '#B45309',
          route: '/(staff)/complaints-suggestions',
        }]
      : []),
    ...(unassignedCount > 0
      ? [{
          key: 'unassigned',
          title: `${unassignedCount} active member${unassignedCount === 1 ? '' : 's'} without a trainer`,
          detail: 'The Wellness Director handles assignments.',
          tone: personaTheme('wellness_director').color,
          route: '/(staff)/members',
        }]
      : []),
    ...fullClasses.map((c) => ({
      key: `full-${c.item.id}`,
      title: `${c.item.title} is ${percent(c.registered, c.item.capacity)}% full`,
      detail: `${formatClockTime(c.item.start)} · ${c.item.location}`,
      tone: '#0284C7',
      route: '/(staff)/schedules',
    })),
  ];

  const statusCount = (status: Member['status']) => members.filter((m) => m.status === status).length;
  const guestCount = members.filter((m) => m.type === '1-Day Guest Pass').length;

  return (
    <DashboardScaffold
      subtitle={
        isITAdmin
          ? 'IT Admin · Branch Overview'
          : isWellnessDirector
            ? 'Wellness Director · Branch Overview'
            : 'Staff Admin · Branch Overview'
      }
      error={error}
      onRetry={() => void load()}
      overlay={
        <>
          <BroadcastNoticeModal visible={broadcastVisible} onClose={() => setBroadcastVisible(false)} />
          <ClassAttendanceModal
            visible={attendanceClass != null}
            onClose={() => setAttendanceClass(null)}
            scheduleItem={attendanceClass}
            onAttendanceChanged={() => void load()}
          />
        </>
      }
    >
      <PersonaHero
        theme={theme}
        name={profile?.name ?? (isWellnessDirector ? 'Wellness Director' : 'Staff Admin')}
        avatarUrl={profile?.avatarUrl}
        roleLabel={profile?.roleLabel}
        dateLabel={formatLongDate(today)}
      >
        <KpiRow
          items={[
            { label: 'Checked In Today', value: checkIns, icon: 'scan', color: '#15803D' },
            { label: 'Class Fill Rate', value: `${fillRate}%`, icon: 'pie-chart', color: '#0284C7' },
            ...(seesComplaints
              ? [{ label: 'Open Feedback', value: feedback.length, icon: 'chatbubbles' as const, color: '#B45309', onPress: () => router.push('/(staff)/complaints-suggestions') }]
              : [{ label: 'Members', value: members.length, icon: 'people' as const, color: '#B45309' }]),
            { label: 'Pending Cancels', value: cancels.length, icon: 'alert-circle', color: colors.scarlet },
          ]}
        />
      </PersonaHero>

      <QuickActionBar
        actions={[
          { key: 'notice', label: 'Broadcast', icon: 'megaphone-outline', onPress: () => setBroadcastVisible(true), color: theme.color },
          { key: 'notices', label: 'Notices', icon: 'newspaper-outline', onPress: () => router.push('/(staff)/announcements') },
          { key: 'surveys', label: 'Surveys', icon: 'stats-chart-outline', onPress: () => router.push('/(staff)/surveys'), color: '#16A34A' },
          { key: 'staff', label: 'Staff', icon: 'people-outline', onPress: () => router.push('/(staff)/staff-management'), color: '#7C3AED' },
          ...(seesComplaints
            ? [{ key: 'feedback', label: 'Feedback', icon: 'chatbubbles-outline' as const, onPress: () => router.push('/(staff)/complaints-suggestions'), color: '#0284C7' }]
            : []),
          { key: 'schedules', label: 'Schedules', icon: 'calendar-outline', onPress: () => router.push('/(staff)/schedules'), color: '#D97706' },
          { key: 'childwatch', label: 'Child Watch', icon: 'happy-outline', onPress: () => router.push('/(staff)/child-watch'), color: '#0D9488' },
        ]}
      />

      <SectionCard title="Needs Your Attention" icon="flag" accent={theme.color} count={attention.length}>
        {attention.length === 0 ? (
          <EmptyState icon="checkmark-done-outline" text="Nothing is waiting on you right now." />
        ) : (
          attention.map((a) => (
            <ListRow
              key={a.key}
              title={a.title}
              subtitle={a.detail}
              left={<View style={[styles.dot, { backgroundColor: a.tone }]} />}
              onPress={() => router.push(a.route as never)}
            />
          ))
        )}
      </SectionCard>

      <SectionCard title="Membership Snapshot" icon="business" accent={personaTheme('membership_director').color}>
        <KpiRow
          items={[
            { label: 'Active', value: statusCount('active'), icon: 'checkmark-circle', color: '#15803D' },
            { label: 'Paused', value: statusCount('paused'), icon: 'pause-circle', color: '#B45309' },
            { label: 'Cancel Pending', value: statusCount('cancel_pending'), icon: 'alert-circle', color: colors.scarlet },
            { label: 'Guest Passes', value: guestCount, icon: 'ticket', color: '#0284C7' },
          ]}
        />
      </SectionCard>

      <SessionRequestsOversight viewerId={staffId} accent={theme.color} title="Private Session Requests" />

      <SectionCard
        title="Team Today"
        icon="people-circle"
        accent={personaTheme('wellness_director').color}
        subtitle="Private sessions booked per trainer and swim instructor"
        actionLabel="Staff"
        onAction={() => router.push('/(staff)/staff-management')}
      >
        {team.length === 0 ? (
          <EmptyState icon="people-outline" text="No trainers or swim instructors found." />
        ) : (
          team.map(({ staff, sessionsToday }) => {
            const pt = personaTheme(staff.staffRole ?? 'desk');
            return (
              <ListRow
                key={staff.id}
                title={staff.name}
                subtitle={staff.roleLabel}
                left={<UserAvatar uri={staff.avatarUrl} name={staff.name} size={34} />}
                right={
                  <View style={styles.teamRight}>
                    <StatusPill label={pt.badge} color={pt.color} bg={pt.softBg} />
                    <Text style={[styles.sessions, { color: tc.textMuted }]}>{sessionsToday} 1-on-1</Text>
                  </View>
                }
              />
            );
          })
        )}
      </SectionCard>

      <SectionCard title="Branch Classes Today" icon="barbell" accent="#0284C7" count={classes.length}>
        {classes.length === 0 ? (
          <EmptyState icon="calendar-outline" text="No classes scheduled today." />
        ) : (
          classes.map(({ item, registered: count }) => (
            <ListRow
              key={item.id}
              title={item.title}
              subtitle={`${formatClockTime(item.start)} · ${item.instructorName} · ${item.location}`}
              meta={`${count}/${item.capacity} registered`}
              right={
                <ActionButton label="Attendance" icon="clipboard-outline" color={tc.primary} variant="outline" onPress={() => setAttendanceClass(item)} />
              }
            />
          ))
        )}
      </SectionCard>

      {cancels.length > 0 ? (
        <SectionCard
          title="Pending Cancellations"
          icon="alert-circle"
          accent={colors.scarlet}
          count={cancels.length}
          subtitle="Membership Director decides. Open a member to override."
        >
          {cancels.map((c) => {
            const m = members.find((x) => x.id === c.memberId);
            return (
              <ListRow
                key={c.id}
                title={m?.name ?? 'Member'}
                subtitle={`Requested ${formatShortDate(c.requestedAt)} · access through ${formatShortDate(c.accessThrough)}`}
                meta={`"${c.reason}"`}
                onPress={() => router.push(`/(staff)/members/${c.memberId}`)}
              />
            );
          })}
        </SectionCard>
      ) : null}
    </DashboardScaffold>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  teamRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  sessions: {
    fontSize: 11,
    fontWeight: '700',
  },
});
