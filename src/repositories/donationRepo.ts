import type { Donation } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const donationRepo = {
  create(
    api: ProtivityPort,
    donation: Omit<Donation, 'id' | 'createdAt' | 'taxDeductibleId' | 'receiptNumber'>
  ): Promise<Donation> {
    return api.createDonation(donation);
  },

  list(api: ProtivityPort, memberId?: string): Promise<Donation[]> {
    return api.listDonations(memberId);
  },
};
