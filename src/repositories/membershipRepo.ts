import type { CancelRequest, Member, Membership } from '@/domain/types';
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

  changeMembership(
    api: ProtivityPort,
    memberId: string,
    planName: string,
    monthlyAmountCents: number
  ): Promise<Membership> {
    return api.changeMembership(memberId, planName, monthlyAmountCents);
  },

  scheduleMembershipChange(
    api: ProtivityPort,
    memberId: string,
    planName: string,
    monthlyAmountCents: number,
    effectiveDate: string
  ): Promise<Membership> {
    return api.scheduleMembershipChange(memberId, planName, monthlyAmountCents, effectiveDate);
  },

  cancelScheduledChange(api: ProtivityPort, memberId: string): Promise<Membership> {
    return api.cancelScheduledChange(memberId);
  },

  buyMembership(
    api: ProtivityPort,
    input: {
      name: string;
      email: string;
      phone: string;
      address: string;
      planId: string;
      payment: { brand: string; last4: string };
      donationCents?: number;
      password?: string;
    }
  ): Promise<{ member: Member; membership: Membership }> {
    return api.buyMembership(input);
  },

  submitCancel(
    api: ProtivityPort,
    memberId: string,
    input: { reason: string; requestedAt: string }
  ): Promise<CancelRequest> {
    return api.submitCancelNotice(memberId, input);
  },

  rescindCancel(api: ProtivityPort, memberId: string): Promise<Member> {
    return api.rescindCancelNotice(memberId);
  },

  listAll(api: ProtivityPort, branchId?: string): Promise<Member[]> {
    return api.listAllMembers(branchId);
  },

  updateAdmin(
    api: ProtivityPort,
    memberId: string,
    updates: Partial<Member>
  ): Promise<Member> {
    return api.updateMemberAdmin(memberId, updates);
  },

  updateMembershipAdmin(
    api: ProtivityPort,
    memberId: string,
    updates: Partial<Membership>
  ): Promise<Membership> {
    return api.updateMembershipAdmin(memberId, updates);
  },

  deleteAccount(api: ProtivityPort, memberId: string): Promise<void> {
    return api.deleteMemberAccount(memberId);
  },

  listRegistrations(api: ProtivityPort, memberId: string) {
    return api.listMemberRegistrations(memberId);
  },

  listLessons(api: ProtivityPort, memberId: string) {
    return api.listMemberLessons(memberId);
  },
};


