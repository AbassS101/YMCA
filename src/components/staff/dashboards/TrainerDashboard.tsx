import { PersonaHero } from '@/components/staff/PersonaHero';
import { KpiRow } from '@/components/staff/KpiTile';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { getDemoToday } from '@/domain/demoClock';

import { DashboardScaffold } from './DashboardScaffold';
import { formatLongDate } from './format';
import { TrainerWorkspace } from './TrainerWorkspace';
import { useTrainerDay } from './useTrainerDay';

export function TrainerDashboard({ staffId }: { staffId: string }) {
  const { theme } = useStaffCapabilities();
  const day = useTrainerDay(staffId);
  const completed = day.lessons.filter((l) => l.status === 'completed').length;

  return (
    <DashboardScaffold subtitle="Personal Trainer Command Center" error={day.error} onRetry={() => void day.reload()}>
      <PersonaHero
        theme={theme}
        name={day.profile?.name ?? 'Coach'}
        avatarUrl={day.profile?.avatarUrl}
        roleLabel={day.profile?.roleLabel}
        greeting={`Coach ${day.profile?.name?.split(' ')[0] ?? ''}`.trim()}
        dateLabel={formatLongDate(getDemoToday())}
      >
        <KpiRow
          items={[
            { label: '1-on-1 Today', value: day.lessons.length, icon: 'body', color: theme.color },
            { label: 'Classes to Teach', value: day.classes.length, icon: 'people', color: '#0284C7' },
            { label: 'My Clients', value: day.clients.length, icon: 'trophy', color: '#7C3AED' },
            { label: 'Done Today', value: completed, icon: 'checkmark-done', color: '#D97706' },
          ]}
        />
      </PersonaHero>
      <TrainerWorkspace day={day} staffId={staffId} accent={theme.color} />
    </DashboardScaffold>
  );
}
