import { useMemo } from 'react';

import { useSession } from '@/context/SessionContext';
import {
  canEditConfigSection,
  capabilitiesForRole,
  personaForRole,
  personaTheme,
  type PersonaTheme,
  type ConfigSection,
  type StaffCapability,
  type StaffPersona,
} from '@/domain/staffCapabilities';
import { statsScopesForRole, type StatsScope } from '@/domain/stats/statsScopes';

export type StaffCapabilities = {
  persona: StaffPersona | null;
  theme: PersonaTheme;
  can: (capability: StaffCapability) => boolean;
  canManageBusinessConfig: boolean;
  canManageSystemConfig: boolean;
  /** Section-level edit rights: includes directors editing just their own section. */
  canEditSection: (section: ConfigSection) => boolean;
  isAdmin: boolean;
  isITAdmin: boolean;
  isTrainer: boolean;
  isSwimInstructor: boolean;
  isWellnessDirector: boolean;
  isAquaticsDirector: boolean;
  isMembershipDirector: boolean;
  isFrontDesk: boolean;
  isChildWatchSupervisor: boolean;
  isChildWatchDirector: boolean;
  isMaintenance: boolean;
  coachesClients: boolean;
  statsScopes: StatsScope[];
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
      canManageBusinessConfig: caps.has('manageBusinessConfig'),
      canManageSystemConfig: caps.has('manageSystemConfig'),
      canEditSection: (section: ConfigSection) => canEditConfigSection(role, section),
      isAdmin: persona === 'admin' || persona === 'it' || persona === 'wellnessDirector',
      isITAdmin: persona === 'it',
      isTrainer: persona === 'trainer',
      isSwimInstructor: persona === 'swimInstructor',
      isWellnessDirector: persona === 'wellnessDirector',
      isAquaticsDirector: persona === 'aquaticsDirector',
      isMembershipDirector: persona === 'membershipDirector',
      isFrontDesk: persona === 'frontDesk',
      isChildWatchSupervisor: persona === 'childWatchSupervisor',
      isChildWatchDirector: persona === 'childWatchDirector',
      isMaintenance: persona === 'maintenance',
      coachesClients:
        persona === 'trainer' ||
        persona === 'swimInstructor' ||
        persona === 'wellnessDirector' ||
        persona === 'aquaticsDirector',
      statsScopes: statsScopesForRole(role),
    };
  }, [role]);
}
