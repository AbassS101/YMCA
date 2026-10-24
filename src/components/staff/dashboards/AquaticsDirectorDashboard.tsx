import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { PersonaHero } from '@/components/staff/PersonaHero';
import { KpiRow } from '@/components/staff/KpiTile';
import { QuickActionBar } from '@/components/staff/QuickActionBar';
import { SessionRequestsOversight } from '@/components/staff/SessionRequestsOversight';
import { ActionButton, ListRow, SectionCard } from '@/components/staff/SectionCard';
import { useSession } from '@/context/SessionContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { manageableTrainers } from '@/domain/availabilityAccess';
import { getDemoToday } from '@/domain/demoClock';
import type { Staff } from '@/domain/types';

import { DashboardScaffold } from './DashboardScaffold';
import { formatLongDate } from './format';
import { TrainerWorkspace } from './TrainerWorkspace';
import { useTrainerDay } from './useTrainerDay';

export function AquaticsDirectorDashboard({ staffId }: { staffId: string }) {
  const router = useRouter();
  const { api, session } = useSession();
  const { theme, can } = useStaffCapabilities();
  const day = useTrainerDay(staffId);
  const [team, setTeam] = useState<Staff[]>([]);

  useEffect(() => {
    api
      .listStaff()
      .then((all) => setTeam(manageableTrainers(session?.role, staffId, all).filter((s) => s.id !== staffId)))
      .catch(() => setTeam([]));
  }, [api, session?.role, staffId]);
  const completed = day.lessons.filter((l) => l.status === 'completed').length;

  return (
    <DashboardScaffold subtitle="Aquatics Director" error={day.error} onRetry={() => void day.reload()}>
      <PersonaHero
        theme={theme}
        name={day.profile?.name ?? 'Aquatics Director'}
        avatarUrl={day.profile?.avatarUrl}
        roleLabel="Aquatics Director"
        dateLabel={formatLongDate(getDemoToday())}
      >
        <KpiRow
          items={[
            { label: 'Swim Lessons Today', value: day.lessons.length, icon: 'water', color: theme.color },
            { label: 'Swim Classes', value: day.classes.length, icon: 'people', color: '#0369A1' },
            { label: 'My Swimmers', value: day.clients.length, icon: 'trophy', color: '#7C3AED' },
            { label: 'Lessons Done', value: completed, icon: 'checkmark-done', color: '#D97706' },
          ]}
        />
      </PersonaHero>
      {can('viewDepartmentStats') ? (
        <QuickActionBar
          actions={[
            { key: 'pool', label: 'Pool Schedule', icon: 'water-outline', onPress: () => router.push('/(staff)/admin-pool-schedule' as never), color: theme.color },
            { key: 'stats', label: 'Stats', icon: 'analytics-outline', onPress: () => router.push('/(staff)/stats?scope=aquatics' as never), color: theme.color },
          ]}
        />
      ) : null}
      {team.length > 0 ? (
        <SectionCard title="Swim Team Hours" icon="calendar-outline" accent={theme.color} subtitle="Weekly availability for each instructor">
          {team.map((s) => (
            <ListRow
              key={s.id}
              title={s.name}
              subtitle={s.roleLabel}
              right={
                <ActionButton
                  label="Hours"
                  icon="calendar-outline"
                  color={theme.color}
                  variant="outline"
                  onPress={() => router.push({ pathname: '/(staff)/trainer-availability', params: { staffId: s.id } })}
                />
              }
            />
          ))}
        </SectionCard>
      ) : null}
      <SessionRequestsOversight
        viewerId={staffId}
        accent={theme.color}
        title="Private Swim Requests"
        lessonType="swim"
      />
      <TrainerWorkspace day={day} staffId={staffId} accent={theme.color} variant="swim" />
    </DashboardScaffold>
  );
}
