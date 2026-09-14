export type UserRole = 'member' | 'staff';
export type MemberStatus = 'active' | 'cancel_pending';
export type ScheduleCategory = 'groupEx' | 'swim' | 'childWatch' | 'event';

export type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  membershipId: string;
  homeBranchId: string;
  type: string;
  status: MemberStatus;
};

export type Staff = {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
  homeBranchId: string;
};

export type Membership = {
  memberId: string;
  rateName: string;
  monthlyAmountCents: number;
  nextBillingDate: string;
  paymentBrand: string;
  paymentLast4: string;
  cancelEffectiveDate?: string;
  lastBillDate?: string;
};

export type ScheduleItem = {
  id: string;
  branchId: string;
  category: ScheduleCategory;
  title: string;
  start: string; // ISO
  end: string;
  location: string;
  instructorName: string;
  staffId?: string;
};

export type SavedClass = { memberId: string; scheduleItemId: string };

export type TrainerAssignment = { memberId: string; staffId: string };

export type Thread = { id: string; memberId: string; staffId: string };

export type Message = {
  id: string;
  threadId: string;
  fromId: string;
  body: string;
  createdAt: string;
};

export type CancelRequest = {
  id: string;
  memberId: string;
  reason: string;
  requestedAt: string;
  lastBillDate: string;
  accessThrough: string;
  status: 'submitted';
};

export type AuthSession = { userId: string; role: UserRole };
