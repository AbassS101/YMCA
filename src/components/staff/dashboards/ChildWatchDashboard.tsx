import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { UserAvatar } from '@/components/UserAvatar';
import { BroadcastNoticeModal } from '@/components/staff/BroadcastNoticeModal';
import { KpiRow } from '@/components/staff/KpiTile';
import { PersonaHero } from '@/components/staff/PersonaHero';
import { QuickActionBar } from '@/components/staff/QuickActionBar';
import { ActionButton, EmptyState, ListRow, SectionCard, StatusPill } from '@/components/staff/SectionCard';
import { HeadcountSheet } from '@/components/staff/childwatch/HeadcountSheet';
import { IncidentReviewSheet } from '@/components/staff/childwatch/IncidentReviewSheet';
import { IncidentSheet } from '@/components/staff/childwatch/IncidentSheet';
import { PickupApprovalsSheet } from '@/components/staff/childwatch/PickupApprovalsSheet';
import { ShiftsSheet } from '@/components/staff/childwatch/ShiftsSheet';
import { useAppConfig } from '@/context/AppConfigContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { demoNow } from '@/domain/childWatch';
import { getDemoToday } from '@/domain/demoClock';
import { buildChildWatchStats, type ChildWatchStats } from '@/domain/stats/childWatchStats';
import { addDays } from '@/domain/stats/retention';
import type { ChildWatchIncident, Staff } from '@/domain/types';
import { statsRepo } from '@/repositories/statsRepo';
import { colors } from '@/theme/colors';

import { DashboardScaffold } from './DashboardScaffold';
import { BRANCH_ID, formatClockTime, formatLongDate } from './format';
import { useChildWatchRoom, type RoomAlert } from './useChildWatchRoom';

const LEVEL_COLOR: Record<RoomAlert['level'], string> = {
  critical: colors.scarlet,
  warning: '#B45309',
  info: '#0284C7',
};

const RATIO_COLOR = { ok: '#15803D', at_limit: '#B45309', over: colors.scarlet } as const;

type Sheet = 'headcount' | 'incident' | 'pickups' | 'shifts' | null;

function firstNameLastInitial(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest[rest.length - 1];
  return last ? `${first} ${last[0]}.` : first;
}

function ageLabel(months: number): string {
  if (months < 24) return `${months} mo`;
  return `${Math.floor(months / 12)} yr`;
}

export function ChildWatchDashboard({ staffId }: { staffId: string }) {
  const router = useRouter();
  const { api } = useSession();
  const { colors: tc } = useTheme();
  const { config } = useAppConfig();
  const { theme, can } = useStaffCapabilities();
  const isDirector = can('manageChildWatchProgram');
  const room = useChildWatchRoom(staffId);

  const [profile, setProfile] = useState<Staff | null>(null);
  const [staffById, setStaffById] = useState<Record<string, Staff>>({});
  const [week, setWeek] = useState<ChildWatchStats | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [reviewing, setReviewing] = useState<ChildWatchIncident | null>(null);
  const [broadcastVisible, setBroadcastVisible] = useState(false);

  const today = getDemoToday();
  const rules = config.childWatch;

  const loadExtras = useCallback(async () => {
    if (staffId === '') return;
    const [me, staff] = await Promise.all([
      api.getStaff(staffId).catch(() => null),
      api.listStaff(BRANCH_ID).catch(() => [] as Staff[]),
    ]);
    setProfile(me);
    setStaffById(Object.fromEntries(staff.map((s) => [s.id, s])));
    if (isDirector) {
      try {
        const raw = await statsRepo.childWatchRaw({ from: addDays(today, -6), to: today }, staffId);
        setWeek(buildChildWatchStats(raw, rules, { from: addDays(today, -6), to: today }));
      } catch {
        setWeek(null);
      }
    }
  }, [api, staffId, isDirector, today, rules]);

  useFocusEffect(
    useCallback(() => {
      void loadExtras();
    }, [loadExtras])
  );

  const reloadAll = () => {
    void room.reload();
    void loadExtras();
  };

  const closeSheet = () => setSheet(null);
  const sheetDone = () => {
    setSheet(null);
    reloadAll();
  };

  const openAlert = (a: RoomAlert) => {
    if (a.action === 'headcount') setSheet('headcount');
    else if (a.action === 'incident') setSheet('incident');
    else if (a.action === 'pickups' && isDirector) setSheet('pickups');
    else if (a.action === 'shifts' && isDirector) setSheet('shifts');
    else if (a.action === 'room') router.push('/(staff)/child-watch');
  };

  const nameOf = (id: string) => staffById[id]?.name ?? 'Staff member';
  const childNameOf = (childId: string) => {
    const c = room.inRoom.find((r) => r.child.id === childId);
    return c ? firstNameLastInitial(c.child.name) : undefined;
  };

  if (!config.featureToggles.childWatch) {
    return (
      <DashboardScaffold subtitle="Child Watch" error={false} onRetry={() => undefined}>
        <EmptyState icon="toggle-outline" text="Child Watch is turned off in Feature Toggles." />
      </DashboardScaffold>
    );
  }

  const overdue = room.headcountDueInMin < 0;
  const nowHour = demoNow().getHours();
  const forecast = room.forecast.filter((f) => f.expectedKids > 0 || f.hour === nowHour);
  const maxKids = Math.max(1, ...forecast.map((f) => f.expectedKids));
  const reviewable = [...room.openIncidents, ...room.awaitingAck.filter((a) => !room.openIncidents.some((o) => o.id === a.id))];

  return (
    <DashboardScaffold
      subtitle={isDirector ? 'Child Watch Director' : 'Child Watch Supervisor'}
      error={room.error}
      onRetry={reloadAll}
      overlay={
        <>
          <BroadcastNoticeModal visible={broadcastVisible} onClose={() => setBroadcastVisible(false)} />
          <HeadcountSheet
            visible={sheet === 'headcount'}
            onClose={closeSheet}
            staffId={staffId}
            expected={room.inRoom.length}
            onDone={sheetDone}
          />
          <IncidentSheet
            visible={sheet === 'incident'}
            onClose={closeSheet}
            staffId={staffId}
            inRoom={room.inRoom}
            onDone={sheetDone}
          />
          {isDirector ? (
            <>
              <PickupApprovalsSheet
                visible={sheet === 'pickups'}
                onClose={closeSheet}
                staffId={staffId}
                pickups={room.pendingPickups}
                onDone={sheetDone}
              />
              <ShiftsSheet visible={sheet === 'shifts'} onClose={closeSheet} staffId={staffId} onDone={sheetDone} />
              <IncidentReviewSheet
                incident={reviewing}
                childName={reviewing ? childNameOf(reviewing.childId) : undefined}
                onClose={() => setReviewing(null)}
                staffId={staffId}
                onDone={() => {
                  setReviewing(null);
                  reloadAll();
                }}
              />
            </>
          ) : null}
        </>
      }
    >
      <PersonaHero
        theme={theme}
        name={profile?.name ?? (isDirector ? 'Child Watch Director' : 'Child Watch Supervisor')}
        avatarUrl={profile?.avatarUrl}
        roleLabel={profile?.roleLabel}
        dateLabel={formatLongDate(today)}
      >
        <KpiRow
          items={[
            { label: 'In Room', value: `${room.inRoom.length}/${room.capacity}`, icon: 'happy', color: '#0D9488' },
            { label: 'Staff', value: `${room.staffOnDuty}/${room.staffNeeded}`, icon: 'people', color: RATIO_COLOR[room.ratio] },
            {
              label: 'Next Headcount',
              value: !room.isOpenNow ? 'Closed' : overdue ? 'OVERDUE' : `in ${room.headcountDueInMin}m`,
              icon: 'timer',
              color: overdue && room.isOpenNow ? colors.scarlet : '#0284C7',
              onPress: () => setSheet('headcount'),
            },
            { label: 'Open Incidents', value: room.openIncidents.length, icon: 'warning', color: room.openIncidents.length > 0 ? colors.scarlet : '#15803D' },
          ]}
        />
      </PersonaHero>

      <QuickActionBar
        actions={[
          { key: 'checkin', label: 'Check In/Out', icon: 'log-in-outline', onPress: () => router.push('/(staff)/child-watch'), color: '#0D9488' },
          { key: 'headcount', label: 'Headcount', icon: 'calculator-outline', onPress: () => setSheet('headcount'), color: '#0284C7' },
          { key: 'incident', label: 'Log Incident', icon: 'medkit-outline', onPress: () => setSheet('incident'), color: colors.scarlet },
          { key: 'broadcast', label: 'Broadcast', icon: 'megaphone-outline', onPress: () => setBroadcastVisible(true), color: theme.color },
          ...(isDirector
            ? [
                { key: 'shifts', label: 'Shifts', icon: 'calendar-outline' as const, onPress: () => setSheet('shifts'), color: '#D97706' },
                { key: 'pickups', label: 'Pickup Approvals', icon: 'shield-checkmark-outline' as const, onPress: () => setSheet('pickups'), color: '#7C3AED' },
                { key: 'rules', label: 'Rules', icon: 'settings-outline' as const, onPress: () => router.push('/(staff)/admin-child-watch'), color: '#B45309' },
                { key: 'stats', label: 'Stats', icon: 'stats-chart-outline' as const, onPress: () => router.push('/(staff)/stats?scope=childWatch' as never), color: '#16A34A' },
              ]
            : []),
        ]}
      />

      <SectionCard title="Alerts" icon="notifications" accent={theme.color} count={room.alerts.length}>
        {room.alerts.length === 0 ? (
          <EmptyState icon="checkmark-done-outline" text="No alerts. The room is in good shape." />
        ) : (
          room.alerts.map((a) => (
            <ListRow
              key={a.key}
              title={a.title}
              subtitle={a.detail}
              left={<View style={[styles.dot, { backgroundColor: LEVEL_COLOR[a.level] }]} />}
              onPress={a.action ? () => openAlert(a) : undefined}
            />
          ))
        )}
      </SectionCard>

      <SectionCard title="In the Room Now" icon="happy" accent="#0D9488" count={room.inRoom.length}>
        {room.inRoom.length === 0 ? (
          <EmptyState icon="happy-outline" text="No children signed in." />
        ) : (
          room.inRoom.map((c) => (
            <ListRow
              key={c.visit.id}
              title={firstNameLastInitial(c.child.name)}
              subtitle={`${ageLabel(c.ageMonths)} · ${c.minutesIn} min in room`}
              left={<UserAvatar uri={c.child.avatarUrl} name={c.child.name} size={34} />}
              right={
                <View style={styles.pills}>
                  {c.hasAllergy ? (
                    <StatusPill label={`Allergy: ${c.child.allergies}`} color={colors.scarlet} bg="#FEE2E2" />
                  ) : null}
                  {c.minutesLeft <= 0 ? (
                    <StatusPill label="Over limit" color={colors.scarlet} bg="#FEE2E2" />
                  ) : (
                    <Text style={[styles.small, { color: tc.textMuted }]}>{c.minutesLeft} min left</Text>
                  )}
                </View>
              }
              onPress={() => router.push('/(staff)/child-watch')}
            />
          ))
        )}
      </SectionCard>

      <SectionCard
        title="Today's Staffing"
        icon="people-circle"
        accent="#D97706"
        subtitle={`${room.staffOnDuty} on duty now · ${room.staffNeeded} needed`}
        actionLabel={isDirector ? 'Edit' : undefined}
        onAction={isDirector ? () => setSheet('shifts') : undefined}
      >
        {room.todayShifts.length === 0 && room.coverageGaps.length === 0 ? (
          <EmptyState icon="calendar-outline" text="No shifts scheduled today." />
        ) : (
          <>
            {[...room.todayShifts]
              .sort((a, b) => a.start.localeCompare(b.start))
              .map((s) => (
                <ListRow
                  key={s.id}
                  title={nameOf(s.staffId)}
                  subtitle={`${s.start} - ${s.end}`}
                  left={<UserAvatar uri={staffById[s.staffId]?.avatarUrl} name={nameOf(s.staffId)} size={34} />}
                />
              ))}
            {room.coverageGaps.map((g) => (
              <ListRow
                key={`gap-${g.start}-${g.end}`}
                title="Coverage gap"
                subtitle={`No staff ${g.start} - ${g.end}`}
                left={<View style={[styles.dot, { backgroundColor: colors.scarlet }]} />}
                onPress={isDirector ? () => setSheet('shifts') : undefined}
              />
            ))}
          </>
        )}
      </SectionCard>

      <SectionCard title="Expected Load Today" icon="bar-chart" accent="#0284C7" subtitle="Average of recent same-weekday visits">
        {forecast.length === 0 ? (
          <EmptyState icon="bar-chart-outline" text="Not enough history to forecast yet." />
        ) : (
          forecast.map((f) => {
            const current = f.hour === nowHour;
            return (
              <View
                key={f.hour}
                style={styles.barRow}
                accessible
                accessibilityLabel={`${formatHour(f.hour)}: about ${f.expectedKids} children, ${f.staffNeeded} staff needed`}
              >
                <Text style={[styles.hour, { color: current ? tc.text : tc.textMuted, fontWeight: current ? '800' : '600' }]}>
                  {formatHour(f.hour)}
                </Text>
                <View style={[styles.track, { backgroundColor: tc.cardBorder }]}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${Math.round((f.expectedKids / maxKids) * 100)}%`, backgroundColor: current ? '#0D9488' : '#0284C7' },
                    ]}
                  />
                </View>
                <Text style={[styles.small, { color: tc.textMuted }]}>
                  {Math.round(f.expectedKids * 10) / 10} kids · {f.staffNeeded} staff
                </Text>
              </View>
            );
          })
        )}
      </SectionCard>

      <SectionCard title="Incidents" icon="medkit" accent={colors.scarlet} count={reviewable.length}>
        {reviewable.length === 0 ? (
          <EmptyState icon="shield-checkmark-outline" text="No open incidents." />
        ) : (
          reviewable.map((i) => (
            <ListRow
              key={i.id}
              title={`${i.type.replace('_', ' ')} · ${childNameOf(i.childId) ?? 'Child'}`}
              subtitle={`${formatClockTime(i.at)} · ${i.severity} severity${
                i.parentNotifiedAt && !i.parentAcknowledgedAt ? ' · awaiting parent' : ''
              }`}
              meta={i.description}
              right={
                isDirector && i.status === 'open' ? (
                  <ActionButton label="Review" icon="clipboard-outline" color={tc.primary} variant="outline" onPress={() => setReviewing(i)} />
                ) : undefined
              }
            />
          ))
        )}
      </SectionCard>

      <SectionCard title="Today So Far" icon="today" accent="#15803D">
        <KpiRow
          items={[
            { label: 'Visits', value: room.todayStats.visits, icon: 'enter', color: '#0D9488' },
            { label: 'Avg Stay', value: `${room.todayStats.avgStayMin}m`, icon: 'time', color: '#0284C7' },
            { label: 'Peak', value: room.todayStats.peak, icon: 'trending-up', color: '#B45309' },
          ]}
        />
      </SectionCard>

      {isDirector ? (
        <SectionCard
          title="This Week"
          icon="stats-chart"
          accent="#16A34A"
          subtitle="Last 7 days"
          actionLabel="Stats"
          onAction={() => router.push('/(staff)/stats?scope=childWatch' as never)}
        >
          {week == null ? (
            <EmptyState icon="stats-chart-outline" text="Weekly numbers are not available right now." />
          ) : (
            <KpiRow
              items={[
                { label: 'Visits', value: week.visitsPerDay.reduce((s, d) => s + d.visits, 0), icon: 'enter', color: '#0D9488' },
                { label: 'Avg Stay', value: `${week.avgStayMin}m`, icon: 'time', color: '#0284C7' },
                { label: 'Incidents', value: Object.values(week.incidentsByType).reduce((s, n) => s + (n ?? 0), 0), icon: 'medkit', color: colors.scarlet },
                { label: 'Ratio Breaches', value: `${week.ratioViolationMinutes}m`, icon: 'alert-circle', color: '#B45309' },
              ]}
            />
          )}
        </SectionCard>
      ) : null}
    </DashboardScaffold>
  );
}

function formatHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? 'a' : 'p'}`;
}

const styles = StyleSheet.create({
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pills: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: 160,
  },
  small: {
    fontSize: 11,
    fontWeight: '700',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  hour: {
    width: 28,
    fontSize: 12,
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: 10,
    borderRadius: 5,
  },
});
