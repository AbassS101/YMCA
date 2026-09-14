import type { CancelRequest, Membership } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const membershipRepo = {
  getMembership(api: ProtivityPort, memberId: string): Promise<Membership> {
    return api.getMembership(memberId);
  },

  updatePayment(
    api: ProtivityPort,
    memberId: string,
    payment: { brand: string; last4: string }
  ): Promise<Membership> {
    return api.updatePaymentMethod(memberId, payment);
  },

  submitCancel(
    api: ProtivityPort,
    memberId: string,
    input: { reason: string; requestedAt: string }
  ): Promise<CancelRequest> {
    return api.submitCancelNotice(memberId, input);
  },
};
