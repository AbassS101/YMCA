import type { CancelRequest, HouseholdMemberInput, Member, Membership } from '@/domain/types';
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
    monthlyAmountCents: number,
    requesterUserId?: string
  ): Promise<Membership> {
    return api.changeMembership(memberId, planName, monthlyAmountCents, requesterUserId);
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
      waiveEnrollmentFee?: boolean;
      campaignId?: string;
      birthDate?: string;
      householdMembers?: HouseholdMemberInput[];
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

  rescindCancel(api: ProtivityPort, memberId: string, requesterUserId?: string): Promise<Member> {
    return api.rescindCancelNotice(memberId, requesterUserId);
  },

  approveCancel(api: ProtivityPort, memberId: string, requesterUserId: string): Promise<CancelRequest> {
    return api.approveCancelRequest(memberId, requesterUserId);
  },

  listAll(api: ProtivityPort, branchId?: string): Promise<Member[]> {
    return api.listAllMembers(branchId);
  },

  updateAdmin(
    api: ProtivityPort,
    memberId: string,
    updates: Partial<Member>,
    requesterUserId?: string
  ): Promise<Member> {
    return api.updateMemberAdmin(memberId, updates, requesterUserId);
  },

  updateMembershipAdmin(
    api: ProtivityPort,
    memberId: string,
    updates: Partial<Membership>,
    requesterUserId?: string
  ): Promise<Membership> {
    return api.updateMembershipAdmin(memberId, updates, requesterUserId);
  },

  deleteAccount(api: ProtivityPort, memberId: string, requesterUserId?: string): Promise<void> {
    return api.deleteMemberAccount(memberId, requesterUserId);
  },

  listRegistrations(api: ProtivityPort, memberId: string) {
    return api.listMemberRegistrations(memberId);
  },

  listLessons(api: ProtivityPort, memberId: string) {
    return api.listMemberLessons(memberId);
  },
};


