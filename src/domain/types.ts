export type UserRole = 'member' | 'staff';
export type MemberStatus = 'active' | 'cancel_pending';
export type ScheduleCategory = 'groupEx' | 'swim' | 'childWatch' | 'event' | 'seniors';
export type RegistrationStatus = 'registered' | 'cancelled';
export type LessonStatus = 'booked' | 'cancelled';

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
  capacity: number;
  /** 0 or undefined = included with membership; > 0 = extra-cost booking */
  priceCents?: number;
  isSpecialEvent?: boolean;
  /** True for classes specially designed or great for Active Older Adults / seniors */
  seniorFriendly?: boolean;
  description?: string;
};

export type SavedClass = { memberId: string; scheduleItemId: string };

export type ClassRegistration = {
  id: string;
  memberId: string;
  scheduleItemId: string;
  status: RegistrationStatus;
  paidAmountCents?: number;
  paymentLast4?: string;
  registeredAt?: string;
};

export type LessonSlot = {
  id: string;
  staffId: string;
  branchId: string;
  start: string;
  end: string;
  location: string;
};

export type PrivateLesson = {
  id: string;
  memberId: string;
  staffId: string;
  slotId: string;
  start: string;
  end: string;
  location: string;
  status: LessonStatus;
};

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

export type MembershipPlan = {
  id: string;
  name: string;
  monthlyAmountCents: number;
  badge?: string;
  subtitle: string;
  description: string;
  features: string[];
  recommended?: boolean;
};

export const YMCA_MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: 'adult',
    name: 'Adult',
    monthlyAmountCents: 8000,
    subtitle: 'Ages 30–64',
    description: 'Individual full access to wellness center, heated outdoor & indoor pools, group fitness, and pickleball.',
    features: [
      'Full access to fitness center, free weights & cardio',
      'Over 40 free weekly group exercise classes',
      'Heated outdoor pool (year-round) & 25m indoor lap pool',
      'JOOLA pickleball courts & open gym basketball',
      'Saunas, steam rooms & locker room amenities',
      'Nationwide YMCA reciprocity access',
    ],
  },
  {
    id: 'young-adult',
    name: 'Young Adult',
    monthlyAmountCents: 5400,
    badge: 'Popular for Under 30',
    subtitle: 'Ages 18–29',
    description: 'Budget-friendly full facility access tailored for students and young professionals launching their health journey.',
    features: [
      'Save $26/month compared to standard Adult rate',
      'Unlimited fitness center, pool, and court access',
      'All group exercise classes included at no extra cost',
      'Free 1-on-1 member wellness consultation',
      'Access to sports leagues and social events',
      'Nationwide YMCA reciprocity access',
    ],
  },
  {
    id: 'senior',
    name: 'Senior / Active Older Adult',
    monthlyAmountCents: 6800,
    subtitle: 'Ages 65+',
    description: 'Dedicated active aging programs, gentle mobility, joint-friendly warm water aqua classes, and community socials.',
    features: [
      'Specialized AOA classes: Gentle Chair Yoga, Fit & Well Seniors',
      'Aqua Arthritis warm-water therapy pool sessions',
      'Low-impact movement drills and mobility workouts',
      'Senior coffee socials & community game days',
      'Eligible for SilverSneakers & Renew Active verification',
      'Full access to all wellness facility amenities',
    ],
  },
  {
    id: 'family',
    name: 'Family / Household',
    monthlyAmountCents: 14500,
    badge: 'Best Value for Families',
    recommended: true,
    subtitle: 'Up to 2 Adults + Children under 26',
    description: 'The ultimate YMCA experience with complimentary drop-off Child Watch, youth swim lesson discounts, and camp priority.',
    features: [
      'FREE drop-off Child Watch for up to 2 hours daily',
      'Up to 2 adults and dependent children in same home',
      'Discounts & priority registration for Summer Camps & Sports',
      'Reduced fees on Youth Swim Academy lessons',
      'Family fun nights, heated outdoor pool & open gym time',
      'Nationwide YMCA reciprocity for entire family',
    ],
  },
  {
    id: 'two-adults',
    name: 'Two Adults',
    monthlyAmountCents: 12500,
    subtitle: 'Two Adults in Household',
    description: 'Shared fitness lifestyle for couples, partners, or roommates living at the same address.',
    features: [
      'Save $35/month compared to two separate Adult memberships',
      'Both members receive full access to fitness, pools & courts',
      'All group fitness & cycling classes included',
      'Free wellness orientation for both adults',
      'Nationwide YMCA reciprocity access',
    ],
  },
  {
    id: 'community-assistance',
    name: 'Community Assistance (Open Doors)',
    monthlyAmountCents: 1750,
    badge: 'Accessible Rate',
    subtitle: 'Income / Program Eligible',
    description: 'Ensuring YMCA wellness is accessible to everyone in Montgomery County and the Greater Washington community.',
    features: [
      'Subsidized rate starting at $17.50/month',
      'Eligible with SNAP, WIC, Medicaid, or TANF verification',
      '100% full access to all facility amenities and pools',
      'Confidential and dignity-focused application process',
      'Supported by YMCA Annual Campaign community donations',
    ],
  },
];

