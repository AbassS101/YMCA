import type { Member } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const memberRepo = {
  getMember(api: ProtivityPort, memberId: string): Promise<Member> {
    return api.getMember(memberId);
  },

  updateProfile(
    api: ProtivityPort,
    memberId: string,
    updates: { name?: string; phone?: string }
  ): Promise<Member> {
    return api.updateMemberProfile(memberId, updates);
  },
};
