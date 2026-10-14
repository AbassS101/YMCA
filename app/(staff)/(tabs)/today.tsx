import { AdminDashboard } from '@/components/staff/dashboards/AdminDashboard';
import { AquaticsDirectorDashboard } from '@/components/staff/dashboards/AquaticsDirectorDashboard';
import { FrontDeskRepDashboard } from '@/components/staff/dashboards/FrontDeskRepDashboard';
import { MembershipDirectorDashboard } from '@/components/staff/dashboards/MembershipDirectorDashboard';
import { SwimInstructorDashboard } from '@/components/staff/dashboards/SwimInstructorDashboard';
import { TrainerDashboard } from '@/components/staff/dashboards/TrainerDashboard';
import { useSession } from '@/context/SessionContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';

export default function StaffTodayScreen() {
  const { session } = useSession();
  const { persona } = useStaffCapabilities();
  const staffId = session?.userId ?? '';

  switch (persona) {
    case 'admin':
    case 'it':
    case 'wellnessDirector':
      return <AdminDashboard staffId={staffId} />;
    case 'swimInstructor':
      return <SwimInstructorDashboard staffId={staffId} />;
    case 'aquaticsDirector':
      return <AquaticsDirectorDashboard staffId={staffId} />;
    case 'membershipDirector':
      return <MembershipDirectorDashboard staffId={staffId} />;
    case 'frontDesk':
      return <FrontDeskRepDashboard staffId={staffId} />;
    default:
      return <TrainerDashboard staffId={staffId} />;
  }
}
