import type { Staff } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const staffRepo = {
  listStaff(api: ProtivityPort, branchId?: string): Promise<Staff[]> {
    return api.listStaff(branchId);
  },

  getAssignedTrainer(api: ProtivityPort, memberId: string): Promise<Staff | null> {
    return api.getAssignedTrainer(memberId);
  },

  setAssignedTrainer(api: ProtivityPort, memberId: string, staffId: string): Promise<void> {
    return api.setAssignedTrainer(memberId, staffId);
  },
};
