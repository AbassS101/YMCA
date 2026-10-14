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
  isSwimInstructor: boolean;
  isWellnessDirector: boolean;
  isAquaticsDirector: boolean;
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
      isAdmin: persona === 'admin' || persona === 'it' || persona === 'wellnessDirector',
      isITAdmin: persona === 'it',
      isTrainer: persona === 'trainer',
      isSwimInstructor: persona === 'swimInstructor',
      isWellnessDirector: persona === 'wellnessDirector',
      isAquaticsDirector: persona === 'aquaticsDirector',
      isMembershipDirector: persona === 'membershipDirector',
      isFrontDesk: persona === 'frontDesk',
      coachesClients:
        persona === 'trainer' ||
        persona === 'swimInstructor' ||
        persona === 'wellnessDirector' ||
        persona === 'aquaticsDirector',
    };
  }, [role]);
}
