export type UserRole = 'member' | 'staff' | 'admin' | 'trainer' | 'it_admin' | 'staff_admin';
export type MemberStatus = 'active' | 'paused' | 'cancel_pending' | 'cancelled';
export type StaffRole = 'it_admin' | 'staff_admin' | 'trainer' | 'desk' | 'admin';
export type ScheduleCategory = 'groupEx' | 'swim' | 'childWatch' | 'event' | 'seniors';
export type RegistrationStatus = 'registered' | 'cancelled';
export type LessonStatus = 'booked' | 'cancelled';

export function isAdminRole(role?: string | null): boolean {
  return role === 'admin' || role === 'it_admin' || role === 'staff_admin';
}

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
  avatarUrl?: string;
};

export type Staff = {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
  homeBranchId: string;
  staffRole?: StaffRole;
  avatarUrl?: string;
};

export type PendingMembershipChange = {
  planName: string;
  monthlyAmountCents: number;
  effectiveDate: string; // ISO date YYYY-MM-DD (e.g. next billing date)
  requestedAt: string;
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
  pendingChange?: PendingMembershipChange;
  status?: 'active' | 'paused' | 'cancel_pending' | 'cancelled';
  renewalCount?: number;
  joinedDate?: string;
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

export type AnnouncementCategory = 'facility' | 'event' | 'program' | 'community';
export type AnnouncementPriority = 'normal' | 'high' | 'urgent';

export type Announcement = {
  id: string;
  branchId: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  createdAt: string; // ISO
  expiresAt?: string;
  actionUrl?: string; // Optional deep link
  actionLabel?: string;
  authorName: string;
  pinned?: boolean;
};

export type NotificationType =
  | 'forum_mention'
  | 'forum_reply'
  | 'class_forum'
  | 'staff_inquiry'
  | 'announcement'
  | 'event'
  | 'membership'
  | 'donation'
  | 'general';

export type AppNotification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  createdAt: string; // ISO
  read: boolean;
  relatedId?: string;
  link?: string;
};

export type NotificationDigestFrequency = 'instant' | 'daily' | 'weekly' | 'none';

export type NotificationPreferences = {
  userId: string;
  mentions: boolean;
  topicReplies: boolean;
  classForumAlerts: boolean;
  staffInquiries: boolean;
  announcements: boolean;
  events: boolean;
  directMessages: boolean;
  emailDigest: NotificationDigestFrequency;
  pushEnabled: boolean;
  inAppBannerEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
};

export type DonationFrequency = 'one-time' | 'monthly';

export type Donation = {
  id: string;
  memberId?: string;
  donorName: string;
  donorEmail: string;
  amountCents: number;
  frequency: DonationFrequency;
  designation: string;
  dedication?: {
    tributeType: 'honor' | 'memory';
    name: string;
    message?: string;
  };
  paymentBrand: string;
  paymentLast4: string;
  createdAt: string; // ISO
  taxDeductibleId: string;
  receiptNumber: string;
};

export type DonationImpactTier = {
  amountCents: number;
  title: string;
  subtitle?: string;
  issue?: string;
  response?: string;
  impactText: string;
  badge?: string;
};

export const YMCA_CASE_FOR_SUPPORT_2026 = {
  title: 'YMCA Programs and Services Address Community Needs',
  documentSubtitle: 'Case for Support 2026',
  mission:
    'To foster the spiritual, mental and physical development of individuals, families and communities according to the ideals of inclusiveness, equality and mutual respect for all.',
  cause:
    'At the Y, we strengthen community by helping people build health, confidence and connection at every stage of life. In Montgomery County, residents and health leaders continue to identify access to community services and healthier lifestyle options as important needs. The County’s current health priorities include obesity, behavioral health, diabetes, cardiovascular disease, cancer, and maternal and infant health. Your support helps the Y respond with welcoming programs that improve well-being, nurture children and families, and remove financial barriers to participation.',
  goal:
    'To help children, families and individuals overcome barriers and achieve more through youth development, healthy living and social responsibility.',
  commitments: [
    {
      id: 'all',
      title: 'Making the Y Available to All',
      description:
        'We work to ensure that cost is not a barrier to the relationships, resources and opportunities people need to learn, grow and thrive.',
    },
    {
      id: 'kids',
      title: 'Nurturing the Potential of Kids',
      description:
        'The Y supports children and families through child care, day camp and aquatics—safe, enriching experiences that help young people build skills, confidence and connection.',
    },
    {
      id: 'health',
      title: 'Strengthening Community Health',
      description:
        'The Y expands access to evidence-informed programs that support people living with or beyond cancer and people living with Parkinson’s disease, while creating meaningful social connection.',
    },
  ],
  tagline: 'A stronger Montgomery County starts with each of us. Count Me In.',
} as const;

export const YMCA_DONATION_TIERS: DonationImpactTier[] = [
  {
    amountCents: 5000,
    title: 'LIVESTRONG® at the YMCA',
    subtitle: 'Cancer Survivorship Program',
    issue:
      'The County’s first comprehensive chronic disease report found that five of Montgomery County’s ten leading causes of death from 2021–2023 were chronic diseases, including cancer. Cancer remains one of Healthy Montgomery’s top-ranked priority areas.',
    response:
      'LIVESTRONG® at the YMCA is a 12-week, small-group physical activity and well-being program for adults living with, through or beyond cancer. YMCA-certified instructors guide participants through cardiovascular conditioning, strength training, balance and flexibility while building a supportive community. The program is designed to be offered at low or no cost, with medical clearance.',
    impactText:
      'Your $50 gift helps make this cancer survivorship program accessible to a participant. You help create a place to rebuild strength, increase confidence and connect with others, so a cancer diagnosis does not have to mean facing recovery alone.',
  },
  {
    amountCents: 10000,
    title: 'Pedaling for Parkinson’s™',
    subtitle: 'Mobility & Motor Function',
    badge: 'Community Favorite',
    issue:
      'People living with Parkinson’s can experience changes in mobility, balance and daily function, making consistent, supportive physical activity especially valuable. Montgomery County’s health improvement work continues to emphasize healthier lifestyle options and access to community-based supports.',
    response:
      'Pedaling for Parkinson’s™, powered by the Davis Phinney Foundation, is an evidence-based indoor cycling program for people living with Parkinson’s disease. Trained instructors lead a structured cycling protocol that supports mobility, motor function, confidence and connection. YMCA Silver Spring offers the program at no cost to participants and caregivers.',
    impactText:
      'Your $100 gift helps sustain trained instruction, program access and a welcoming community for people living with Parkinson’s. You are the catalyst that helps participants keep moving, build confidence and live well today.',
  },
  {
    amountCents: 17500,
    title: 'Day Camp',
    subtitle: 'Enriching Summer Experiences',
    issue:
      'Families need safe, enriching summer options that keep children active and connected while parents and caregivers work. In Montgomery County, only 21% of families have access to affordable summer care, creating a significant gap between the need for quality childcare and its availability.',
    response:
      'YMCA day camp gives children a supervised place to learn, play, build friendships and discover new interests. Camp experiences promote physical activity, creativity, confidence and belonging while giving families dependable summer support.',
    impactText:
      'Your $175 gift helps a child access YMCA day camp. You help create a summer filled with learning, movement, friendships and experiences that can build confidence long after camp ends.',
  },
  {
    amountCents: 25000,
    title: 'Aquatics',
    subtitle: 'Life-Saving Skills and Confidence',
    issue:
      'Water safety is an essential life skill, yet cost and access can keep families from swim instruction. In Montgomery County, drowning is a leading cause of unintentional death among children, particularly those ages 1–4, and second leading cause for children ages 4–12.',
    response:
      'To combat this, we partner with local organizations to offer swim lessons for children who otherwise lack access to water safety education. Additionally, we provide swim lessons to ensure all children, regardless of background or ability, can learn to swim in a safe and supportive environment.',
    impactText:
      'Your $250 gift helps expand access to aquatics and swim instruction for participants who need financial support. You help someone become safer and more confident around water while opening the door to a lifetime of healthy activity.',
  },
  {
    amountCents: 50000,
    title: 'Child Care',
    subtitle: 'Supporting Children and Working Families',
    issue:
      'Affordable child care remains a significant Montgomery County challenge; families face significant demand for reliable, affordable child care, with 75% of households reporting a need for reliable options. Quality child care supports children’s development while giving parents and caregivers the dependable care they need to work and support their families.',
    response:
      'The Y brings early learning and school-age care together as a continuum of child care support for families. Children have safe, nurturing environments where they can build relationships, strengthen social-emotional and academic skills, stay active and grow in confidence while parents and caregivers have dependable support for work and family life.',
    impactText:
      'Your $500 gift helps make YMCA child care more affordable for a family. You help a child learn, belong and thrive while strengthening the stability of the whole family.',
  },
  {
    amountCents: 100000,
    title: 'Making the Y Available to All',
    subtitle: 'Financial Assistance & Access',
    badge: 'Leadership Circle',
    issue:
      'Montgomery County’s health improvement process identifies access to health and social services and health equity as core goals. Even in a resource-rich county, financial barriers can limit access to the programs, relationships and healthy activities that strengthen individual and family well-being.',
    response:
      'The Y works to remove financial barriers so that people can participate in membership and programs based on their needs, not simply their ability to pay. Donor support helps open doors to youth development, healthy living and community connection across the lifespan.',
    impactText:
      'Your $1,000 gift helps make the Y available to all by supporting financial assistance for membership and programs. Your generosity becomes the catalyst that connects more neighbors to opportunities to be healthy, build relationships and reach their full potential.',
  },
];

export const YMCA_COMMUNITY_FUNDS = [
  { id: 'annual-campaign', name: 'Annual Community Campaign (Where Needed Most)' },
  { id: 'available-to-all', name: 'Making the Y Available to All (Financial Assistance)' },
  { id: 'livestrong', name: 'LIVESTRONG® at the YMCA (Cancer Survivorship)' },
  { id: 'parkinsons', name: 'Pedaling for Parkinson’s™ (Mobility & Motor Function)' },
  { id: 'summer-camp', name: 'Day Camp & Enriching Summer Experiences' },
  { id: 'aquatics', name: 'Aquatics & Life-Saving Water Safety' },
  { id: 'child-care', name: 'Child Care & Early Learning (Working Families)' },
] as const;

export type ClassForumPost = {
  id: string;
  classId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole | StaffRole;
  authorAvatarUrl?: string;
  content: string;
  createdAt: string; // ISO
  pinned?: boolean;
};

export type ForumTopicCategory =
  | 'general'
  | 'fitness'
  | 'swim'
  | 'facilities'
  | 'community'
  | 'programs';

export type ForumTopic = {
  id: string;
  title: string;
  content: string;
  category: ForumTopicCategory;
  authorId: string;
  authorName: string;
  authorRole: UserRole | StaffRole;
  authorAvatarUrl?: string;
  pinned?: boolean;
  likes: number;
  likedBy: string[];
  replyCount: number;
  mentionedStaffIds?: string[];
  mentionedStaffNames?: string[];
  hasStaffReply?: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type ForumReply = {
  id: string;
  topicId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole | StaffRole;
  authorAvatarUrl?: string;
  isStaffReply: boolean;
  mentionedStaffIds?: string[];
  likes: number;
  likedBy: string[];
  createdAt: string; // ISO
};

export const FORUM_CATEGORIES: {
  id: ForumTopicCategory;
  label: string;
  icon: string;
  color: string;
}[] = [
  { id: 'general', label: 'General', icon: 'chatbubbles-outline', color: '#0284C7' },
  { id: 'fitness', label: 'Fitness & Gym', icon: 'barbell-outline', color: '#16A34A' },
  { id: 'swim', label: 'Pool & Aquatics', icon: 'water-outline', color: '#00609C' },
  { id: 'facilities', label: 'Facility Updates', icon: 'business-outline', color: '#D97706' },
  { id: 'community', label: 'Community & Meetups', icon: 'people-outline', color: '#7C3AED' },
  { id: 'programs', label: 'Classes & Youth', icon: 'calendar-outline', color: '#E11D48' },
];

export type TicketType = 'feature_request' | 'problem_report';

export type TicketCategory =
  | 'app_bug'
  | 'feature_idea'
  | 'facility_tech'
  | 'account_access'
  | 'schedule_booking'
  | 'billing_membership'
  | 'other';

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export type SupportTicket = {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole | string;
  type: TicketType;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  threadId: string;
  deviceInfo?: string;
  createdAt: string;
  updatedAt: string;
};




