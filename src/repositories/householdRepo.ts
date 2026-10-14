import type { HouseholdMemberInput, HouseholdView, Member } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const householdRepo = {
  get(api: ProtivityPort, memberId: string): Promise<HouseholdView> {
    return api.getHousehold(memberId);
  },

  add(api: ProtivityPort, primaryId: string, input: HouseholdMemberInput): Promise<Member> {
    return api.addHouseholdMember(primaryId, input);
  },

  update(
    api: ProtivityPort,
    primaryId: string,
    memberId: string,
    updates: Partial<Pick<HouseholdMemberInput, 'name' | 'birthDate' | 'allergies' | 'notes'>>
  ): Promise<Member> {
    return api.updateHouseholdMember(primaryId, memberId, updates);
  },

  remove(api: ProtivityPort, primaryId: string, memberId: string): Promise<void> {
    return api.removeHouseholdMember(primaryId, memberId);
  },

  recordGymOrientation(api: ProtivityPort, memberId: string, staffId: string): Promise<Member> {
    return api.recordGymOrientation(memberId, staffId);
  },
};
