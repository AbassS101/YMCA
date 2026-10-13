import { useMemo } from 'react';

import { useSession } from '@/context/SessionContext';
import {
  capabilitiesForRole,
  personaForRole,
  personaTheme,
  type PersonaTheme,
  type StaffCapability,
  type StaffPersona,
} from '@/domain/staffCapabilities';

export type StaffCapabilities = {
  persona: StaffPersona | null;
  theme: PersonaTheme;
  can: (capability: StaffCapability) => boolean;
  isAdmin: boolean;
  isITAdmin: boolean;
  isTrainer: boolean;
  isWellnessDirector: boolean;
  isMembershipDirector: boolean;
  isFrontDesk: boolean;
  coachesClients: boolean;
};

export function useStaffCapabilities(): StaffCapabilities {
  const { session } = useSession();
  const role = session?.role;

  return useMemo(() => {
    const persona = personaForRole(role);
    const caps = capabilitiesForRole(role);
    return {
      persona,
      theme: personaTheme(role),
      can: (capability: StaffCapability) => caps.has(capability),
      isAdmin: persona === 'admin' || persona === 'it',
      isITAdmin: persona === 'it',
      isTrainer: persona === 'trainer',
      isWellnessDirector: persona === 'wellnessDirector',
      isMembershipDirector: persona === 'membershipDirector',
      isFrontDesk: persona === 'frontDesk',
      coachesClients: persona === 'trainer' || persona === 'wellnessDirector',
    };
  }, [role]);
}
