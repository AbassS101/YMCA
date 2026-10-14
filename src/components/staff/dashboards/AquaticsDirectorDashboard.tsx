import { PersonaHero } from '@/components/staff/PersonaHero';
import { KpiRow } from '@/components/staff/KpiTile';
import { SessionRequestsOversight } from '@/components/staff/SessionRequestsOversight';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { getDemoToday } from '@/domain/demoClock';

import { DashboardScaffold } from './DashboardScaffold';
import { formatLongDate } from './format';
import { TrainerWorkspace } from './TrainerWorkspace';
import { useTrainerDay } from './useTrainerDay';

export function AquaticsDirectorDashboard({ staffId }: { staffId: string }) {
  const { theme } = useStaffCapabilities();
  const day = useTrainerDay(staffId);
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
