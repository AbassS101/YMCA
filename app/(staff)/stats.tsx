import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { ChipRow } from '@/components/desk/Sheet';
import { KpiRow } from '@/components/staff/KpiTile';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { ActionButton, EmptyState, ListRow, SectionCard } from '@/components/staff/SectionCard';
import { ExportSheet } from '@/components/stats/ExportSheet';
import { MiniBarChart } from '@/components/stats/MiniBarChart';
import { useAppConfig } from '@/context/AppConfigContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { getDemoToday } from '@/domain/demoClock';
import { formatCents } from '@/domain/lessonPricing';
import { buildBranchStats, type BranchStats } from '@/domain/stats/branchStats';
import { buildChildWatchStats, type ChildWatchStats } from '@/domain/stats/childWatchStats';
import {
  buildAquaticsStats,
  buildMembershipStats,
  buildWellnessStats,
  type AquaticsStats,
  type MembershipStats,
  type WellnessStats,
} from '@/domain/stats/departmentStats';
import { addDays, cohortRetention, monthlyRetention, monthsInRange, type CohortRow, type MonthlyRetention } from '@/domain/stats/retention';
import { STATS_SCOPE_LABELS, type StatsScope } from '@/domain/stats/statsScopes';
import type { ExportData } from '@/export/salesforceMappings';
import {
  statsRepo,
  type BranchRaw,
  type ChildWatchRaw,
  type StatsRange,
} from '@/repositories/statsRepo';

const BRANCH_ID = 'silver-spring';
const RANGES = [
  { key: '7', label: '7d', days: 7 },
  { key: '30', label: '30d', days: 30 },
  { key: '90', label: '90d', days: 90 },
  { key: '365', label: '12mo', days: 365 },
] as const;
type RangeKey = (typeof RANGES)[number]['key'];

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const dash = (n: number | null | undefined, suffix = '') => (n == null || !Number.isFinite(n) ? '—' : `${n}${suffix}`);
const sortedEntries = (r: Record<string, number>) => Object.entries(r).sort((a, b) => b[1] - a[1]);

type Loaded = {
  scope: StatsScope;
  branch?: { raw: BranchRaw; stats: BranchStats };
  childWatch?: { raw: ChildWatchRaw; stats: ChildWatchStats };
  aquatics?: AquaticsStats;
  wellness?: WellnessStats;
  membership?: MembershipStats;
};

export default function StatsScreen() {
  const router = useRouter();
  const { scope: scopeParam } = useLocalSearchParams<{ scope?: string }>();
  const { api, session } = useSession();
  const { config } = useAppConfig();
  const { colors: tc } = useTheme();
  const { statsScopes, can, theme } = useStaffCapabilities();

  const scopes = useMemo(
    () => statsScopes.filter((s) => s !== 'childWatch' || config.featureToggles.childWatch),
    [statsScopes, config.featureToggles.childWatch]
  );
  const [scope, setScope] = useState<StatsScope | null>(null);
  const activeScope: StatsScope | null =
    scope && scopes.includes(scope)
      ? scope
      : scopes.includes(scopeParam as StatsScope)
        ? (scopeParam as StatsScope)
        : (scopes[0] ?? null);

  const [rangeKey, setRangeKey] = useState<RangeKey>('30');
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const today = getDemoToday();
  const range: StatsRange = useMemo(() => {
    const days = RANGES.find((r) => r.key === rangeKey)?.days ?? 30;
    return { from: addDays(today, -(days - 1)), to: today };
  }, [rangeKey, today]);
  const requesterId = session?.userId ?? '';
  const childWatchRules = config.childWatch;

  useEffect(() => {
    if (!activeScope || requesterId === '') return;
    let cancelled = false;
    setError(false);
    (async () => {
      const retentionMonths = monthsInRange(addDays(today, -365), today);
      const branchLoad = async () => {
        const raw = await statsRepo.branchRaw(api, range, BRANCH_ID, requesterId);
        const stats = buildBranchStats(raw, range, today);
        const monthly = monthlyRetention(raw.memberships, retentionMonths);
        return { raw, stats: { ...stats, monthly, cohorts: cohortRetention(raw.memberships, today) } };
      };
      let next: Loaded = { scope: activeScope };
      if (activeScope === 'branch') next = { ...next, branch: await branchLoad() };
      if (activeScope === 'childWatch') {
        const raw = await statsRepo.childWatchRaw(range, requesterId);
        next = { ...next, childWatch: { raw, stats: buildChildWatchStats(raw, childWatchRules, range) } };
      }
      if (activeScope === 'aquatics') {
        next = { ...next, aquatics: buildAquaticsStats(await statsRepo.aquaticsRaw(api, range, BRANCH_ID), range) };
      }
      if (activeScope === 'wellness') {
        next = { ...next, wellness: buildWellnessStats(await statsRepo.wellnessRaw(api, range, BRANCH_ID), range) };
      }
      if (activeScope === 'membership') {
        const raw = await statsRepo.membershipRaw(api, range, BRANCH_ID, requesterId);
        const stats = buildMembershipStats(raw, range, today);
        next = {
          ...next,
          membership: {
            ...stats,
            monthly: monthlyRetention(raw.memberships, retentionMonths),
            cohorts: cohortRetention(raw.memberships, today),
          },
          // Contacts, leads, and donation exports are shared with the branch scope.
          branch: can('exportData') ? await branchLoad() : undefined,
        };
      }
      if (!cancelled) setData(next);
    })().catch(() => {
      if (!cancelled) setError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [activeScope, api, range, today, requesterId, childWatchRules, can]);

  if (!activeScope) {
    return (
      <StaffScreen subtitle="Stats">
        <EmptyState icon="lock-closed-outline" text="You don't have access to stats." actionLabel="Back" onAction={() => router.back()} />
      </StaffScreen>
    );
  }

  const current = data?.scope === activeScope ? data : null;
  const accent = theme.color;

  const exportData: ExportData = {
    branch: current?.branch,
    childWatch: current?.childWatch,
    departments: {
      ...(current?.aquatics ? { Aquatics: current.aquatics } : {}),
      ...(current?.wellness ? { Wellness: current.wellness } : {}),
      ...(current?.membership ? { Membership: current.membership } : {}),
    },
  };

  return (
    <StaffScreen subtitle="Stats & Exports">
      {scopes.length > 1 ? (
        <ChipRow
          options={scopes.map((s) => ({ key: s, label: STATS_SCOPE_LABELS[s] }))}
          value={activeScope}
          onChange={(s) => {
            setData(null);
            setScope(s);
          }}
        />
      ) : null}
      <ChipRow options={RANGES.map((r) => ({ key: r.key, label: r.label }))} value={rangeKey} onChange={setRangeKey} />
      {can('exportData') ? (
        <ActionButton label="Export" icon="download-outline" color={accent} variant="outline" onPress={() => setExportOpen(true)} />
      ) : null}

      {error ? <ErrorBanner onRetry={() => setRangeKey((k) => k)} /> : null}
      {!current && !error ? <Text style={{ color: tc.textMuted }}>Loading…</Text> : null}

      {current?.branch && activeScope === 'branch' ? (
        <BranchView stats={current.branch.stats} accent={accent} goTo={(s) => { setData(null); setScope(s); }} scopes={scopes} onMembers={() => router.push('/(staff)/members')} />
      ) : null}
      {current?.childWatch ? <ChildWatchView stats={current.childWatch.stats} capacity={childWatchRules.roomCapacity} accent={accent} /> : null}
      {current?.aquatics ? <AquaticsView stats={current.aquatics} accent={accent} /> : null}
      {current?.wellness ? <WellnessView stats={current.wellness} accent={accent} /> : null}
      {current?.membership ? <MembershipView stats={current.membership} accent={accent} /> : null}

      <ExportSheet
        visible={exportOpen}
        onClose={() => setExportOpen(false)}
        scopes={[activeScope]}
        data={exportData}
        range={range}
        requesterId={requesterId}
      />
    </StaffScreen>
  );
}

// --- Shared bits ----------------------------------------------------------------------------------

function Table({ rows }: { rows: [string, string][] }) {
  if (rows.length === 0) return <EmptyState icon="stats-chart-outline" text="No data for this range." />;
  return (
    <>
      {rows.map(([k, v], i) => (
        <ListRow key={`${i}-${k}`}title={k} right={<Text style={{ fontWeight: '800' }}>{v}</Text>} />
      ))}
    </>
  );
}

function RetentionCards({ monthly, cohorts }: { monthly: MonthlyRetention[]; cohorts: CohortRow[] }) {
  const missing = cohorts.length === 0;
  return (
    <>
      <SectionCard title="12-Month Retention" icon="repeat" subtitle="Month: retained % · churn % · new joins">
        <Table
          rows={monthly.map((m) => [
            m.month,
            m.startActive === 0 ? `— · — · ${m.newJoins} new` : `${m.retentionPct}% · ${m.churnPct}% · ${m.newJoins} new`,
          ])}
        />
      </SectionCard>
      <SectionCard title="Cohort Retention" icon="people" subtitle="Share of each join month still active at 30 / 90 / 365 days">
        {missing ? (
          <EmptyState icon="people-outline" text="No cohorts yet." />
        ) : (
          <Table rows={cohorts.map((c) => [`${c.cohort} (${c.size})`, `${dash(c.d30Pct, '%')} / ${dash(c.d90Pct, '%')} / ${dash(c.d365Pct, '%')}`])} />
        )}
      </SectionCard>
    </>
  );
}

function Funnel({ funnel, conversionPct }: { funnel: Record<string, number>; conversionPct: number }) {
  return (
    <SectionCard title="Leads Funnel" icon="funnel" subtitle={`${conversionPct}% converted`}>
      <Table rows={Object.entries(funnel).map(([k, v]) => [k.replace(/_/g, ' '), String(v)])} />
    </SectionCard>
  );
}

// --- Scope views ----------------------------------------------------------------------------------

function BranchView({
  stats,
  accent,
  goTo,
  scopes,
  onMembers,
}: {
  stats: BranchStats;
  accent: string;
  goTo: (s: StatsScope) => void;
  scopes: StatsScope[];
  onMembers: () => void;
}) {
  const daily = stats.dailyVisitors.slice(-60).map((d) => ({ label: d.date.slice(5), value: d.value }));
  return (
    <>
      <KpiRow
        items={[
          { label: 'Active', value: stats.activeMembers, icon: 'people', color: accent },
          { label: 'Paused', value: stats.paused, icon: 'pause-circle', color: '#B45309' },
          { label: 'Cancel Pending', value: stats.cancelPending, icon: 'alert-circle', color: '#B42318' },
          { label: 'MRR', value: formatCents(stats.mrrCents), icon: 'cash', color: '#15803D' },
        ]}
      />
      <SectionCard title="Daily Visitors" icon="walk" accent={accent} subtitle={`Avg ${stats.avgDailyVisitors} · Peak ${stats.peakDay ? `${stats.peakDay.value} on ${stats.peakDay.date}` : '—'}`}>
        <MiniBarChart data={daily} color={accent} />
      </SectionCard>
      <SectionCard title="Visits by Hour" icon="time" accent={accent}>
        <MiniBarChart data={stats.visitsByHour.map((v, h) => ({ label: String(h), value: v }))} color={accent} />
      </SectionCard>
      <SectionCard title="Visits by Weekday" icon="calendar" accent={accent}>
        <MiniBarChart data={stats.visitsByWeekday.map((v, i) => ({ label: WEEKDAYS[i], value: v }))} color={accent} />
      </SectionCard>
      <SectionCard title="Growth" icon="trending-up" accent={accent}>
        <Table
          rows={[
            ['New joins', String(stats.newJoins)],
            ['Cancellations', String(stats.cancellations)],
            ['Net growth', String(stats.netGrowth)],
            ['Avg visits per active member', String(stats.avgVisitsPerActiveMember)],
          ]}
        />
      </SectionCard>
      <RetentionCards monthly={stats.monthly} cohorts={stats.cohorts} />
      <SectionCard title="At-Risk Members" icon="warning" accent="#B45309" subtitle="Active, no visits in 30 days" actionLabel="Members" onAction={onMembers}>
        <Table rows={[['At risk', String(stats.atRiskMembers)]]} />
      </SectionCard>
      <Funnel funnel={stats.leadFunnel} conversionPct={stats.leadConversionPct} />
      <SectionCard title="Donations & Billing" icon="heart" accent={accent}>
        <Table
          rows={[
            ['Donations', `${stats.donations.count} · ${formatCents(stats.donations.totalCents)}`],
            ['Declined cards', String(stats.billingIssues.declined)],
            ['Past due', String(stats.billingIssues.pastDue)],
            ['Child Watch visits', String(stats.childWatchVisits)],
          ]}
        />
      </SectionCard>
      {scopes.length > 1 ? (
        <SectionCard title="Departments" icon="grid" accent={accent}>
          <View style={{ gap: 8 }}>
            {scopes
              .filter((s) => s !== 'branch')
              .map((s) => (
                <ActionButton key={s} label={STATS_SCOPE_LABELS[s]} color={accent} variant="outline" onPress={() => goTo(s)} />
              ))}
          </View>
        </SectionCard>
      ) : null}
    </>
  );
}

function ChildWatchView({ stats, capacity, accent }: { stats: ChildWatchStats; capacity: number; accent: string }) {
  const visits = stats.visitsPerDay.slice(-60).map((d) => ({ label: d.date.slice(5), value: d.visits }));
  const total = stats.visitsPerDay.reduce((s, d) => s + d.visits, 0);
  return (
    <>
      <KpiRow
        items={[
          { label: 'Visits', value: total, icon: 'happy', color: accent },
          { label: 'Unique Kids', value: stats.uniqueChildren, icon: 'person', color: '#0284C7' },
          { label: 'Households', value: stats.uniqueHouseholds, icon: 'home', color: '#7C3AED' },
          { label: 'Avg Stay (min)', value: stats.avgStayMin, icon: 'time', color: '#D97706' },
        ]}
      />
      <SectionCard title="Visits per Day" icon="bar-chart" accent={accent}>
        <MiniBarChart data={visits} color={accent} />
      </SectionCard>
      <SectionCard title="Occupancy by Hour" icon="time" accent={accent} subtitle="Average children present per open hour">
        <MiniBarChart data={stats.occupancyByHour.map((v, h) => ({ label: String(h), value: Math.round(v * 10) / 10 }))} color={accent} />
      </SectionCard>
      <SectionCard title="Room & Staffing" icon="shield-checkmark" accent={accent}>
        <Table
          rows={[
            ['Peak occupancy', `${stats.peakOccupancy} of ${capacity} (${stats.capacityUtilizationPct}%)`],
            ['Over-limit stays', String(stats.overLimitStays)],
            ['Ratio violation minutes', String(stats.ratioViolationMinutes)],
            ['Staff hours', String(Math.round(stats.staffHours * 10) / 10)],
            ['Kids per staff-hour', String(stats.childrenPerStaffHour)],
            ['Headcount mismatches', String(stats.headcountMismatches)],
            ['Overrides', String(stats.overridePickups)],
            ['Locked visits', String(stats.lockedVisits)],
          ]}
        />
      </SectionCard>
      <SectionCard title="Incidents" icon="medkit" accent="#B42318">
        <Table
          rows={[
            ...sortedEntries(stats.incidentsByType as Record<string, number>).map(([k, v]) => [k.replace(/_/g, ' '), String(v)] as [string, string]),
            ['High severity', String(stats.incidentsBySeverity.high)],
            ['Medium severity', String(stats.incidentsBySeverity.medium)],
            ['Low severity', String(stats.incidentsBySeverity.low)],
            ['Parent acknowledged', `${stats.parentAckPct}%`],
            ['Avg review time', stats.avgIncidentReviewHours == null ? '—' : `${stats.avgIncidentReviewHours} h`],
          ]}
        />
      </SectionCard>
    </>
  );
}

function AquaticsView({ stats, accent }: { stats: AquaticsStats; accent: string }) {
  return (
    <>
      <KpiRow
        items={[
          { label: 'Classes', value: stats.classCount, icon: 'water', color: accent },
          { label: 'Avg Fill', value: `${stats.avgFillPct}%`, icon: 'people', color: '#0284C7' },
          { label: 'Over Capacity', value: stats.waitlist, icon: 'alert-circle', color: '#B45309' },
          { label: 'Lessons Done', value: stats.lessonsDelivered, icon: 'checkmark-done', color: '#15803D' },
        ]}
      />
      <SectionCard title="Class Fill" icon="bar-chart" accent={accent}>
        <Table rows={stats.classFill.map((c) => [c.title, `${c.enrolled}/${c.capacity} (${c.fillPct}%)`])} />
      </SectionCard>
      <SectionCard title="Lessons by Instructor" icon="person" accent={accent}>
        <Table rows={sortedEntries(stats.lessonsByInstructor).map(([k, v]) => [k, String(v)])} />
      </SectionCard>
      <SectionCard title="Session Requests" icon="mail" accent={accent}>
        <Table rows={[['Requests', String(stats.requests)], ['Avg response', `${stats.avgResponseHours} h`]]} />
      </SectionCard>
    </>
  );
}

function WellnessView({ stats, accent }: { stats: WellnessStats; accent: string }) {
  return (
    <>
      <KpiRow
        items={[
          { label: 'Sessions Done', value: stats.sessionsDelivered, icon: 'fitness', color: accent },
          { label: 'With Trainer', value: stats.membersWithTrainer, icon: 'people', color: '#0284C7' },
          { label: 'Paid Sessions', value: stats.paidSessions, icon: 'card', color: '#7C3AED' },
          { label: 'Paid Revenue', value: formatCents(stats.paidRevenueCents), icon: 'cash', color: '#15803D' },
        ]}
      />
      <SectionCard title="Trainer Utilization" icon="speedometer" accent={accent} subtitle="Booked ÷ available hours">
        <Table
          rows={stats.trainerUtilization.map((t) => [
            t.name,
            `${t.sessions} sessions · ${t.bookedHours}/${t.availableHours} h (${t.availableHours > 0 ? `${t.utilizationPct}%` : '—'})`,
          ])}
        />
      </SectionCard>
      <SectionCard title="Session Requests" icon="mail" accent={accent}>
        <Table rows={[['Requests', String(stats.requests)], ['Avg response', `${stats.avgResponseHours} h`]]} />
      </SectionCard>
    </>
  );
}

function MembershipView({ stats, accent }: { stats: MembershipStats; accent: string }) {
  return (
    <>
      <KpiRow
        items={[
          { label: 'Joins', value: stats.joins, icon: 'person-add', color: accent },
          { label: 'Cancels', value: stats.cancels, icon: 'person-remove', color: '#B42318' },
          { label: 'Save Rate', value: `${stats.saveRatePct}%`, icon: 'shield-checkmark', color: '#15803D' },
          { label: 'Billing Recovery', value: `${stats.billingRecoveryPct}%`, icon: 'card', color: '#0284C7' },
        ]}
      />
      <RetentionCards monthly={stats.monthly} cohorts={stats.cohorts} />
      <SectionCard title="Cancels by Reason" icon="close-circle" accent="#B42318">
        <Table rows={sortedEntries(stats.cancelsByReason).map(([k, v]) => [k, String(v)])} />
      </SectionCard>
      <Funnel funnel={stats.leadFunnel} conversionPct={stats.leadConversionPct} />
      <SectionCard title="Conversion by Source" icon="git-branch" accent={accent}>
        <Table rows={stats.conversionBySource.map((s) => [s.source.replace(/_/g, ' '), `${s.won}/${s.leads} (${s.conversionPct}%)`])} />
      </SectionCard>
      <SectionCard title="Campaign Joins" icon="pricetag" accent={accent}>
        <Table rows={stats.campaignJoins.map((c) => [c.name, String(c.joins)])} />
      </SectionCard>
      <SectionCard title="Contacts by Rep" icon="call" accent={accent}>
        <Table rows={sortedEntries(stats.contactsByRep).map(([k, v]) => [k, String(v)])} />
      </SectionCard>
    </>
  );
}
