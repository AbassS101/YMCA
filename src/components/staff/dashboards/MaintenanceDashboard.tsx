import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { KpiRow } from '@/components/staff/KpiTile';
import { PersonaHero } from '@/components/staff/PersonaHero';
import { QuickActionBar } from '@/components/staff/QuickActionBar';
import { EmptyState, ListRow, SectionCard, StatusPill } from '@/components/staff/SectionCard';
import { maintenanceStatusBadge, urgencyBadge } from '@/components/staffHub/MaintenanceReports';
import { useSession } from '@/context/SessionContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { getDemoToday } from '@/domain/demoClock';
import { ageLabel, filterMaintenanceQueue, summarizeMaintenance, ticketSource } from '@/domain/maintenanceTickets';
import { MAINTENANCE_CATEGORIES, type ComplaintSuggestion, type Staff } from '@/domain/types';
import { complaintSuggestionRepo } from '@/repositories/complaintSuggestionRepo';

import { DashboardScaffold } from './DashboardScaffold';
import { BRANCH_ID, formatLongDate } from './format';

export function MaintenanceDashboard({ staffId }: { staffId: string }) {
  const router = useRouter();
  const { api } = useSession();
  const { theme } = useStaffCapabilities();
  const [profile, setProfile] = useState<Staff | null>(null);
  const [items, setItems] = useState<ComplaintSuggestion[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const [list, me] = await Promise.all([
        complaintSuggestionRepo.list(api, BRANCH_ID, undefined, 'maintenance'),
        api.getStaff(staffId).catch(() => null),
      ]);
      setItems(list);
      setProfile(me);
    } catch {
      setError(true);
    }
  }, [api, staffId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const summary = useMemo(() => summarizeMaintenance(items), [items]);
  const next = useMemo(() => filterMaintenanceQueue(items, 'open').slice(0, 5), [items]);
  const open = () => router.push('/(staff)/maintenance');

  return (
    <DashboardScaffold subtitle="Facilities & Maintenance" error={error} onRetry={() => void load()}>
      <PersonaHero
        theme={theme}
        name={profile?.name ?? 'Maintenance'}
        avatarUrl={profile?.avatarUrl}
        roleLabel={profile?.roleLabel}
        dateLabel={formatLongDate(getDemoToday())}
      >
        <KpiRow
          items={[
            { label: 'Open Reports', value: summary.open, icon: 'construct', color: theme.color, onPress: open },
            { label: 'Urgent', value: summary.urgent, icon: 'alert-circle', color: '#B91C1C', onPress: open },
            { label: 'Resolved (7d)', value: summary.resolvedThisWeek, icon: 'checkmark-done', color: '#15803D' },
            { label: 'Avg Age (days)', value: summary.avgOpenAgeDays, icon: 'time', color: '#6D28D9' },
          ]}
        />
      </PersonaHero>

      <QuickActionBar
        actions={[
          { key: 'queue', label: 'Request Queue', icon: 'list-outline', onPress: open, color: theme.color },
          { key: 'msg', label: 'Messages', icon: 'mail-outline', onPress: () => router.push('/(staff)/messages'), color: '#15803D' },
        ]}
      />

      <SectionCard
        title="Up Next"
        icon="flame-outline"
        accent={theme.color}
        count={next.length}
        subtitle="Urgent first, then oldest"
        actionLabel="Open queue"
        onAction={open}
      >
        {next.length === 0 ? (
          <EmptyState icon="checkmark-done-outline" text="No open reports. Nice work." />
        ) : (
          next.map((item) => {
            const st = maintenanceStatusBadge(item.status);
            const ur = urgencyBadge(item.urgency);
            const cat = MAINTENANCE_CATEGORIES.find((c) => c.id === item.category);
            return (
              <ListRow
                key={item.id}
                title={item.title}
                subtitle={`${cat?.label ?? 'Facility'}${item.location ? ` · ${item.location}` : ''}`}
                meta={`${ticketSource(item) === 'staff' ? (item.submittedByStaffName ?? 'Staff') : item.isAnonymous ? 'Anonymous member' : (item.memberName ?? 'Member')} · ${ageLabel(item.createdAt)}`}
                right={<StatusPill label={item.urgency === 'urgent' ? ur.label : st.label} color={item.urgency === 'urgent' ? ur.color : st.color} bg={item.urgency === 'urgent' ? ur.bg : st.bg} />}
                onPress={open}
              />
            );
          })
        )}
      </SectionCard>
    </DashboardScaffold>
  );
}
