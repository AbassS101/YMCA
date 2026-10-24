import type { Ionicons } from '@expo/vector-icons';

/** Hours the branch is open for the busy-times chart. */
export const OPEN_HOUR = 5;
export const CLOSE_HOUR = 22;

type IconName = keyof typeof Ionicons.glyphMap;

export type AboutPillar = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: IconName;
  color: string;
  bg: string;
  hidden?: boolean;
};
export type AboutMetric = { id: string; label: string; value: string };
export type AboutAmenity = { id: string; name: string; icon: IconName };
export type AboutConfig = {
  association: string;
  email: string;
  pillars: AboutPillar[];
  metrics: AboutMetric[];
  amenities: AboutAmenity[];
};

export const AMENITY_CATEGORIES = ['Aquatics', 'Fitness', 'Courts', 'Family', 'Wellness'] as const;
export type AmenityCategory = (typeof AMENITY_CATEGORIES)[number];

export type AmenityItem = {
  id: string;
  title: string;
  category: AmenityCategory;
  icon: IconName;
  badge?: string;
  description: string;
  details: string[];
  scheduleAction?: {
    label: string;
    route: string;
  };
  hidden?: boolean;
};

export type ProgramSection = {
  id: string;
  title: string;
  category: string;
  badge?: string;
  icon: IconName;
  description: string;
  highlights: string[];
  ctaText?: string;
  ctaRoute?: string;
  hidden?: boolean;
};

/** Occupancy 0-100 for each open hour (OPEN_HOUR..CLOSE_HOUR-1); row 0 = Sunday. Always 7 rows. */
export type BusyTimesConfig = { byDay: number[][]; note: string };

export type PoolSlotOverride = { title?: string; isClosed?: boolean; note?: string };
export type PoolWeeklyBlock = {
  id: string;
  templateId: string;
  title: string;
  startTime: string;
  endTime: string;
  lapLanes: number;
  recLanes: number;
  programLanes: number;
  isClosed: boolean;
  note: string;
};
export type PoolScheduleConfig = {
  /** Replacement days repeat every week. Omitted days keep the original schedule. */
  weeklyDays?: Record<string, PoolWeeklyBlock[]>;
  /** Banner shown at the top of the pool schedule, keyed by pool id. Blank = none. */
  facilityNotices: Record<string, string>;
  /** Per-slot changes, keyed by slot id. */
  slotOverrides: Record<string, PoolSlotOverride>;
};

/** Icons staff may pick for member-facing content. */
export const CONTENT_ICONS: IconName[] = [
  'water-outline',
  'sunny-outline',
  'barbell-outline',
  'fitness-outline',
  'flame-outline',
  'happy-outline',
  'tennisball-outline',
  'basketball-outline',
  'flower-outline',
  'bicycle-outline',
  'heart-outline',
  'people-outline',
  'school-outline',
  'star-outline',
  'leaf-outline',
  'medkit-outline',
  'calendar-outline',
  'home-outline',
];

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const PILLARS = [
  {
    title: 'Youth Development',
    subtitle: 'Nurturing the potential of every child & teen',
    description:
      'Empowering children through safe, high-quality afterschool programs, summer day camps, youth swim academy, and complimentary Child Watch while parents exercise.',
    icon: 'school' as const,
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    title: 'Healthy Living',
    subtitle: 'Improving the nation’s health and well-being',
    description:
      'Over 85 weekly group fitness classes, warm water joint mobility therapy, state-of-the-art cardio and strength equipment, certified personal coaching, and active older adult vitality.',
    icon: 'heart' as const,
    color: '#DC2626',
    bg: '#FEF2F2',
  },
  {
    title: 'Social Responsibility',
    subtitle: 'Giving back and providing support to neighbors',
    description:
      'Ensuring nobody is turned away due to inability to pay through our Open Doors sliding-scale financial assistance, community outreach, and philanthropic donor partnerships.',
    icon: 'people' as const,
    color: '#15803D',
    bg: '#F0FDF4',
  },
];

const METRICS = [
  { label: 'Active Members', value: '4,200+' },
  { label: 'Weekly Classes', value: '85+' },
  { label: 'Heated Pools', value: '2' },
  { label: 'Certified Staff', value: '50+' },
];

const AMENITIES = [
  { name: '25m Heated Lap Pool', icon: 'water-outline' as const },
  { name: 'Warm Water Therapy Pool', icon: 'sunny-outline' as const },
  { name: 'Cardio & Free Weight Floor', icon: 'barbell-outline' as const },
  { name: 'Dry Saunas & Steam Rooms', icon: 'flame-outline' as const },
  { name: 'Free Child Watch (w/ Membership)', icon: 'happy-outline' as const },
  { name: 'Pickleball & Basketball Gym', icon: 'tennisball-outline' as const },
  { name: 'Mind & Body Yoga Studio', icon: 'flower-outline' as const },
  { name: 'Cycling & Spin Theater', icon: 'bicycle-outline' as const },
];


export const DEFAULT_AMENITIES: AmenityItem[] = [
  {
    id: 'outdoor-pool',
    title: 'Heated Outdoor Pool (Year-Round)',
    category: 'Aquatics',
    icon: 'water-outline',
    badge: 'Open 365 Days',
    description: 'One of the area’s few heated outdoor pools open year-round! Enjoy lap swim, family rec swim, and refreshing open-air workouts through every season.',
    details: [
      'Water temperature maintained between 82°F – 84°F',
      'Dedicated lap lanes available morning, afternoon, and evening',
      'Open rec swim hours for families on weekends',
      'Heated pool deck access and deck chairs',
    ],
    scheduleAction: {
      label: 'View Outdoor Pool Schedule',
      route: '/(member)/pool-schedule?pool=outdoor',
    },
  },
  {
    id: 'indoor-pool',
    title: 'Indoor 25-Meter Lap & Teaching Pool',
    category: 'Aquatics',
    icon: 'water',
    description: 'A 6-lane 25-meter indoor pool host to youth and adult swim lessons, Aqua Fit water aerobics, and Masters swim training.',
    details: [
      'Warm-water section ideal for Aqua Arthritis therapy',
      'Youth Swim Academy (Stages 1 through 6)',
      'Kickboards, pull buoys, and aquatic exercise equipment provided',
      'Certified YMCA lifeguards always on duty',
    ],
    scheduleAction: {
      label: 'View Indoor Pool Schedule',
      route: '/(member)/pool-schedule?pool=indoor',
    },
  },
  {
    id: 'pickleball',
    title: 'Pickleball Powered by JOOLA',
    category: 'Courts',
    icon: 'tennisball-outline',
    badge: 'JOOLA Official Partner',
    description: 'High-energy pickleball on professional courts. Silver Spring hosts weekly beginner clinics, open recreational ladders, and pickup play.',
    details: [
      'Multiple indoor marked courts in the main gymnasium',
      'Open drop-in play: Mon/Wed/Fri mornings and Tuesday evenings',
      'JOOLA demo paddles and balls available at the equipment desk',
      'All skill levels welcome from beginner to tournament players',
    ],
  },
  {
    id: 'child-watch',
    title: 'Child Watch Babysitting',
    category: 'Family',
    icon: 'happy-outline',
    badge: 'Free with Family Membership',
    description: 'Positive and fun on-site childcare during your visit, for children 6 weeks and up. Maximum of 2 hours per day; parents must remain in the building.',
    details: [
      'Monday – Friday: 9 am-12 pm, 4 pm-8 pm',
      'Saturday – 9 am-12 pm · Closed Sunday',
      'Sign in cut off is 30 minutes prior to closing time',
      'Check in at the Y Membership Desk before dropping children off',
    ],
    scheduleAction: {
      label: 'View Child Watch Info',
      route: '/(member)/child-watch',
    },
  },
  {
    id: 'fitness-center',
    title: 'Fitness & Wellness Center',
    category: 'Fitness',
    icon: 'barbell-outline',
    description: 'Spacious wellness floor equipped with the latest cardio machines, free weight dumbbells up to 100 lbs, Olympic squat racks, and Cybex selectorized machines.',
    details: [
      'Treadmills, ellipticals, stair climbers, and rowers with personal TVs',
      'Dedicated stretching and functional turf movement zone',
      'Fitlinxx computerized strength and cardio tracking',
      'Complimentary 1-on-1 member wellness consultation included',
    ],
    scheduleAction: {
      label: 'Meet Personal Trainers',
      route: '/(member)/(tabs)/staff',
    },
  },
  {
    id: 'group-ex',
    title: 'Group Exercise & Cycle Studios',
    category: 'Fitness',
    icon: 'people-outline',
    badge: '40+ Classes Weekly',
    description: 'Multi-purpose wood-floor studios with surround sound and dedicated spin bikes. Unlimited classes are included free with membership.',
    details: [
      'Signature classes: BodyPump, Yoga Flow, Zumba, Cycle & Spin, HIIT',
      'Active Older Adult classes: Gentle Chair Yoga, Fit & Well Seniors',
      'Top certified instructors passionate about motivating every fitness level',
      'All mats, weights, bands, and steps provided in studio',
    ],
    scheduleAction: {
      label: 'Browse Class Schedule',
      route: '/(member)/(tabs)/schedules',
    },
  },
  {
    id: 'gymnasium',
    title: 'Full Gymnasium & Basketball',
    category: 'Courts',
    icon: 'basketball-outline',
    description: 'Regulation high-school sized basketball court host to adult open pickup runs, youth basketball leagues, and community family games.',
    details: [
      'Open shootaround and pickup basketball daily',
      'Youth sports leagues, floor hockey, and seasonal camps',
      'Volleyball setup available during weekend family hours',
    ],
  },
  {
    id: 'sauna-steam',
    title: 'Saunas, Steam Rooms & Locker Rooms',
    category: 'Wellness',
    icon: 'flame-outline',
    description: 'Recharge post-workout with cedarwood dry heat saunas, eucalyptus-infused steam rooms, private showers, and lockers.',
    details: [
      'Men’s and Women’s locker rooms with digital lockers',
      'Separate dry cedar saunas and steam rooms in each facility',
      'Day lockers available free (bring your own padlock or purchase at desk)',
      'Accessible family / gender-neutral changing suites with direct pool access',
    ],
  },
  {
    id: 'tennis',
    title: 'Outdoor Tennis Courts',
    category: 'Courts',
    icon: 'tennisball',
    description: 'Outdoor hard courts tucked behind the YMCA Silver Spring facility for member recreation and seasonal instruction.',
    details: [
      'First-come, first-served open play for members',
      'Spring and summer youth tennis clinics and private instruction',
      'Court reservations available through Member Services',
    ],
  },
];

export const DEFAULT_PROGRAMS: ProgramSection[] = [
  {
    id: 'wellness-training-programs',
    title: 'Wellness Training Programs (Personal & Partner)',
    category: 'Personal Fitness & Coaching',
    badge: 'Nationally Certified Trainers',
    icon: 'fitness-outline',
    description: 'Evidence-based 60-minute, 30-minute express, and partner wellness training packages supported by nationally certified YMCA trainers. Every package includes a full functional assessment, goal planning, and custom program plan.',
    highlights: [
      'Full functional movement screening & post-assessment progress verification',
      'Goal planning, behavioral habit modification & custom periodized protocol',
      'Specialized expertise: chronic disease, corrective rehab, weight loss, athletics',
    ],
    ctaText: 'View Packages & Rates',
    ctaRoute: '/(member)/(tabs)/staff?tab=packages',
  },
  {
    id: 'camps',
    title: 'YMCA Summer & Day Camps',
    category: 'Youth Development',
    badge: 'Member Priority & Discount',
    icon: 'sunny-outline',
    description: 'Award-winning full-day summer camps that inspire confidence, build friendships, and create lifelong memories in a safe, nurturing environment.',
    highlights: [
      'Camp Silver Spring: Traditional outdoor adventures, games, and weekly field trips',
      'Sports & Aquatics specialty camps with daily swimming instruction',
      'STEM & Arts discovery sessions for curious young minds',
      'Financial assistance and sibling discounts available',
    ],
    ctaText: 'Register or Inquire at Wellness Desk',
    ctaRoute: '/(member)/(tabs)/staff',
  },
  {
    id: 'swim-academy',
    title: 'YMCA Swim Academy (All Ages)',
    category: 'Aquatics',
    badge: 'Stages 1–6',
    icon: 'water-outline',
    description: 'Nationally recognized swim curriculum emphasizing water safety, stroke mechanics, stamina, and building lifelong aquatic confidence.',
    highlights: [
      'Parent & Child (6 months – 3 years): Water acclimation and bonding',
      'Preschool & School Age (Stages 1–6): Water movement to stroke mechanics',
      'Masters Swim & Adult stroke refinement for fitness swimmers',
      'Small instructor-to-swimmer ratios with certified safety lifeguards',
    ],
    ctaText: 'View Fall 1 Aquatics Guide',
    ctaRoute: '/(member)/aquatics-guide',
  },
  {
    id: 'child-care',
    title: 'Early Learning & School-Age Care',
    category: 'Youth Development',
    badge: 'Licensed Programs',
    icon: 'school-outline',
    description: 'High-quality before-and-after school enrichment and licensed early childhood education serving Montgomery County families.',
    highlights: [
      'Curriculum aligned with Maryland State Department of Education standards',
      'Homework assistance, STEM activities, and healthy snacks',
      'Transportation to and from select local Silver Spring elementary schools',
      'Full-day care options during school holidays and professional days',
    ],
  },
  {
    id: 'diabetes-prevention',
    title: "YMCA's Diabetes Prevention Program",
    category: 'Community Health',
    badge: 'CDC Recognized',
    icon: 'heart-outline',
    description: 'A proven, lifestyle-change program helping adults at risk of type 2 diabetes reduce their risk through healthy eating, physical activity, and peer support.',
    highlights: [
      'Led by a trained YMCA Lifestyle Coach over 12 monthly sessions',
      'Goals: 7% weight loss and 150 minutes of weekly moderate activity',
      'Often covered by Medicare, Medicaid, and private health insurers',
      'Confidential risk assessments available anytime at Silver Spring branch',
    ],
  },
  {
    id: 'blood-pressure',
    title: 'Blood Pressure Self-Monitoring',
    category: 'Community Health',
    icon: 'pulse-outline',
    description: 'Evidence-based program helping adults with hypertension manage their blood pressure through personal tracking and healthy habit consultations.',
    highlights: [
      'Free blood pressure cuff and log book provided upon enrollment',
      'Personal consultations with YMCA Healthy Heart Ambassadors twice monthly',
      'Monthly nutrition education seminars on reducing sodium and DASH diet',
      'Track improvements and share reports with your primary care provider',
    ],
  },
  {
    id: 'wellness-orientation',
    title: 'Complimentary Member Wellness Consultation',
    category: 'Personal Fitness',
    badge: 'Free with Membership',
    icon: 'fitness-outline',
    description: 'Every YMCA Silver Spring member receives a complimentary 45-minute 1-on-1 orientation with a certified trainer to evaluate goals and establish an actionable workout routine.',
    highlights: [
      'Equipment walkthrough tailored to your comfort level and fitness goals',
      'Personalized recommendation of group classes and lane swim times',
      'Goal setting: strength building, mobility, weight management, or race prep',
      'Book anytime directly with our personal trainers in the app',
    ],
    ctaText: 'Book with Doc or Jane Doe',
    ctaRoute: '/(member)/(tabs)/staff',
  },
];

export const DEFAULT_ABOUT: AboutConfig = {
  association: 'YMCA of Metropolitan Washington',
  email: 'silverspring@ymcadc.org',
  pillars: PILLARS.map((p) => ({ id: slug(p.title), ...p })),
  metrics: METRICS.map((m) => ({ id: slug(m.label), ...m })),
  amenities: AMENITIES.map((a) => ({ id: slug(a.name), ...a })),
};

const WEEKDAY = [45, 70, 60, 40, 30, 25, 30, 35, 30, 35, 50, 75, 90, 95, 80, 55, 30];
const FRIDAY = [35, 55, 50, 40, 30, 25, 30, 30, 25, 25, 35, 50, 55, 50, 40, 25, 15];
const SATURDAY = [10, 15, 30, 55, 65, 60, 50, 40, 35, 30, 25, 20, 15, 10, 10, 5, 5];
const SUNDAY = [5, 10, 20, 35, 50, 55, 50, 45, 40, 35, 40, 45, 40, 30, 20, 15, 10];

export const BUSY_HOURS_PER_DAY = CLOSE_HOUR - OPEN_HOUR;

export const DEFAULT_BUSY_TIMES: BusyTimesConfig = {
  byDay: [SUNDAY, WEEKDAY, WEEKDAY, WEEKDAY, WEEKDAY, FRIDAY, SATURDAY].map((row) => [...row]),
  note: '',
};

export const DEFAULT_POOL_SCHEDULE: PoolScheduleConfig = { facilityNotices: {}, slotOverrides: {} };

/** Items staff have not hidden. */
export function visibleItems<T extends { hidden?: boolean }>(items: T[]): T[] {
  return items.filter((i) => !i.hidden);
}
