import { AdminDashboard } from '@/components/staff/dashboards/AdminDashboard';
import { MembershipDirectorDashboard } from '@/components/staff/dashboards/MembershipDirectorDashboard';
import { TrainerDashboard } from '@/components/staff/dashboards/TrainerDashboard';
import { WellnessDirectorDashboard } from '@/components/staff/dashboards/WellnessDirectorDashboard';
import { useSession } from '@/context/SessionContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';

export default function StaffTodayScreen() {
  const { session } = useSession();
  const { persona } = useStaffCapabilities();
  const staffId = session?.userId ?? '';

  switch (persona) {
    case 'admin':
    case 'it':
      return <AdminDashboard staffId={staffId} />;
    case 'wellnessDirector':
      return <WellnessDirectorDashboard staffId={staffId} />;
    case 'membershipDirector':
    case 'frontDesk':
      return <MembershipDirectorDashboard staffId={staffId} />;
    default:
      return <TrainerDashboard staffId={staffId} />;
  }
}
