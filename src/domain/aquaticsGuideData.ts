export interface AquaticsContact {
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface PoolHoursOfOperation {
  days: string;
  indoorHours: string;
  outdoorHours: string;
}

export interface AquaticsSessionInfo {
  sessionName: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  laborDayNotice: string;
  registrationDates: {
    fullMembers: string;
    programMembers: string;
  };
  enrollmentPortalUrl: string;
  facility: {
    name: string;
    address: string;
    phone: string;
    website: string;
    socialFacebook: string;
    socialTwitter: string;
  };
  hours: PoolHoursOfOperation[];
  contacts: AquaticsContact[];
  refundPolicy: {
    title: string;
    rules: string[];
  };
  missionStatement: string;
  healthBenefits: {
    youthFocus: string;
    cdcDrowningStat: string;
    adultBenefits: string[];
  };
}

export type SwimTrack = 'starters' | 'basics' | 'strokes';
export type SwimAgeGroup = 'parent-child' | 'preschool' | 'youth' | 'teen-adult' | 'all';

export interface SwimStage {
  id: string; // e.g. "stage-a", "stage-1"
  code: string; // "A", "B", "1", "2", "3", "4", "5", "6"
  name: string; // "Water Discovery", "Water Acclimation", etc.
  track: SwimTrack;
  trackName: string; // "Swim Starters", "Swim Basics", "Swim Strokes"
  ageGroupLabel: string; // "Parent/Child", "Preschool (3-5)", "School Age (5-12)", "Teen & Adult"
  description: string;
  keySkills: string[];
  color: string;
  badgeBg: string;
  badgeText: string;
}

export interface AquaticsClassOffering {
  id: string;
  day: 'Monday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string;
  endTime: string;
  title: string;
  stageCode: string;
  classCode: string;
  ageCategory: 'Parent/Child' | 'Preschool' | 'Youth' | 'Teen & Adult' | 'Adult Masters';
  fullMemberPrice: number; // in dollars
  programMemberPrice: number; // in dollars
  poolLocation: string;
  durationWeeks: number;
  totalClasses: number;
  isFree?: boolean;
  notes?: string;
}

export interface CertificationProgram {
  id: string;
  title: string;
  provider: string;
  badge: string;
  ageRequirement: string;
  validity: string;
  description: string;
  curriculumHighlights: string[];
  audience: string;
}

export const AQUATICS_SESSION_INFO: AquaticsSessionInfo = {
  sessionName: 'FALL 1 Session 2026',
  subtitle: 'Be Strong, Be Confident',
  startDate: 'September 08, 2026',
  endDate: 'November 01, 2026',
  laborDayNotice: 'No classes on Monday, September 07, 2026 – Labor Day',
  registrationDates: {
    fullMembers: 'August 24, 2026',
    programMembers: 'September 01, 2026',
  },
  enrollmentPortalUrl: 'https://www.ymcadc.org',
  facility: {
    name: 'YMCA Silver Spring',
    address: '9800 Hastings Drive, Silver Spring, MD 20814',
    phone: '301-585-2120',
    website: 'www.ymcadc.org',
    socialFacebook: 'facebook.com/ymcadc',
    socialTwitter: 'twitter.com/ymcadc',
  },
  hours: [
    {
      days: 'Monday – Friday',
      indoorHours: '6:00 AM – 9:45 PM',
      outdoorHours: '6:00 AM – 9:00 PM',
    },
    {
      days: 'Saturday',
      indoorHours: '7:00 AM – 7:45 PM',
      outdoorHours: '7:00 AM – 7:45 PM',
    },
    {
      days: 'Sunday',
      indoorHours: '8:00 AM – 7:45 PM',
      outdoorHours: '8:00 AM – 9:00 PM',
    },
  ],
  contacts: [
    {
      name: 'Aleksandar Milojkovic',
      role: 'Aquatics Director',
      email: 'Aleksandar.Milojkovic@ymcadc.org',
      phone: '301-585-2120',
    },
    {
      name: 'Vance Brown',
      role: 'Assistant Aquatics Director',
      email: 'Vance.Brown@ymcadc.org',
      phone: '301-585-2120',
    },
    {
      name: 'Michelle Barry',
      role: 'Aquatic Coordinator',
      email: 'Michelle.Barry@ymcadc.org',
      phone: '301-585-2120',
    },
  ],
  refundPolicy: {
    title: 'Refund & Cancellation Policy',
    rules: [
      'The YSS aquatics department will only credit/refund money due to family emergencies or medical reasons with a doctor’s note.',
      'Any credit/refund made after the start of a session will be prorated at the discretion of the Aquatics Director.',
      'The YMCA does not offer make-ups for individual absences.',
      'If verified illness prohibits class attendance, and is reported to the YMCA Aquatics Staff, a makeup lesson will be given. A doctor’s note must be submitted.',
      'All programs have a minimum enrollment number of three participants. Programs with fewer participants may be combined or canceled. You will have the option of receiving a full refund/credit or switching to another similar price program or class.',
      'Only the Aquatics Director will approve refunds for reasons not mentioned above.',
    ],
  },
  missionStatement:
    'To foster the spiritual, mental and physical development of individuals, families and communities according to the ideals of inclusiveness, equality and mutual respect for all.',
  healthBenefits: {
    youthFocus:
      'The Y’s Aquatic Programs encourage children and adults to live healthier lifestyles, have fun, and be safe in the water. Youth can take advantage of programs ranging from beginner to advanced swimming, with opportunities to learn CPR or become certified lifeguards.',
    cdcDrowningStat:
      'Our aquatic programs help combat startling water-related statistics: drowning is the number one cause of unintentional death for children, according to the Centers for Disease Control (CDC). The Y provides essential techniques for water safety for all.',
    adultBenefits: [
      'Improves cardiovascular flexibility & range of motion',
      'Reduces joint inflammation & eases arthritis discomfort',
      'Lowers daily stress, anxiety, and depression',
      'Burns greater amount of calories with zero joint impact',
      'Improves full-body blood circulation and lymphatic flow',
      'Lowers resting blood pressure and resting heart rate',
    ],
  },
};

export const SWIM_STAGES: SwimStage[] = [
  // TRACK 1: SWIM STARTERS (Parent / Child)
  {
    id: 'stage-a',
    code: 'A',
    name: 'Water Discovery',
    track: 'starters',
    trackName: 'Swim Starters',
    ageGroupLabel: 'Parent & Child (6–36 months)',
    description:
      'Parents accompany children in stage A, which introduces infants and toddlers to the aquatic environment through exploration and encourages them to enjoy themselves while learning about the water.',
    keySkills: [
      'Water exploration & sensory acclimation',
      'Parent-assisted floating positions',
      'Gentle water entry and safe exit',
      'Drowning prevention education for parents',
    ],
    color: '#0284C7',
    badgeBg: '#E0F2FE',
    badgeText: '#0369A1',
  },
  {
    id: 'stage-b',
    code: 'B',
    name: 'Water Exploration',
    track: 'starters',
    trackName: 'Swim Starters',
    ageGroupLabel: 'Parent & Child (6–36 months)',
    description:
      'In stage B, parents work with their children to explore body positions, floating, blowing bubbles, and fundamental safety and aquatic skills.',
    keySkills: [
      'Blowing bubbles & mouth submerging',
      'Assisted front & back floats',
      'Kicking on front and back with parent',
      'Jump, push, turn, grab foundation',
    ],
    color: '#0369A1',
    badgeBg: '#BAE6FD',
    badgeText: '#075985',
  },

  // TRACK 2: SWIM BASICS (Preschool & School Age)
  {
    id: 'stage-1',
    code: '1',
    name: 'Water Acclimation',
    track: 'basics',
    trackName: 'Swim Basics',
    ageGroupLabel: 'Preschool (3–5) & Youth (5–12)',
    description:
      'Students develop comfort with underwater exploration and learn to safely exit in the event of falling into a body of water in stage 1. This stage lays the foundation that allows for a student’s future progress in swimming.',
    keySkills: [
      'Underwater exploration & breath control',
      'Safely exiting the pool independently',
      'Front glide to wall (unassisted 5 ft)',
      'Benchmark skill: Swim-Float-Swim introduction',
    ],
    color: '#E11D48',
    badgeBg: '#FFE4E6',
    badgeText: '#9F1239',
  },
  {
    id: 'stage-2',
    code: '2',
    name: 'Water Movement',
    track: 'basics',
    trackName: 'Swim Basics',
    ageGroupLabel: 'Preschool (3–5) & Youth (5–12)',
    description:
      'In stage 2, students focus on body position and control, directional change, and forward movement in the water while also continuing to practice how to safely exit in the event of falling into a body of water.',
    keySkills: [
      'Body position & directional changes',
      'Forward movement on front & back (10 ft)',
      'Benchmark skill: Jump, Push, Turn, Grab independently',
      'Back glide and recovery to vertical stance',
    ],
    color: '#EA580C',
    badgeBg: '#FFEDD5',
    badgeText: '#9A3412',
  },
  {
    id: 'stage-3',
    code: '3',
    name: 'Water Stamina',
    track: 'basics',
    trackName: 'Swim Basics',
    ageGroupLabel: 'Preschool (3–5) & Youth (5–12)',
    description:
      'In stage 3, students learn how to swim to safety from a longer distance than in previous stages in the event of falling into a body of water. This stage also introduces rhythmic breathing and integrated arm and leg action.',
    keySkills: [
      'Swim to safety from longer distance (15 yds)',
      'Rhythmic rotary breathing on side',
      'Integrated arm pull and flutter kick action',
      'Mastery of benchmark: Swim, Float, Swim (25 yds)',
    ],
    color: '#D97706',
    badgeBg: '#FEF3C7',
    badgeText: '#78350F',
  },

  // TRACK 3: SWIM STROKES (School Age, Teens & Adults)
  {
    id: 'stage-4',
    code: '4',
    name: 'Stroke Introduction',
    track: 'strokes',
    trackName: 'Swim Strokes',
    ageGroupLabel: 'Preschool (3–5), Youth (5–12), Teens & Adults',
    description:
      'Students in stage 4 develop stroke technique in front crawl and back crawl and learn the breaststroke kick and butterfly kick. Water safety is reinforced through treading water and elementary backstroke.',
    keySkills: [
      'Front crawl and back crawl mechanics (15 yds)',
      'Breaststroke whip kick & butterfly dolphin kick',
      'Continuous treading water for 1 minute',
      'Elementary backstroke with glide',
    ],
    color: '#059669',
    badgeBg: '#D1FAE5',
    badgeText: '#065F46',
  },
  {
    id: 'stage-5',
    code: '5',
    name: 'Stroke Development',
    track: 'strokes',
    trackName: 'Swim Strokes',
    ageGroupLabel: 'Youth (5–12) & Teens',
    description:
      'Students in stage 5 work on stroke technique and learn all major competitive strokes. The emphasis on water safety continues through treading water and sidestroke.',
    keySkills: [
      'All 4 major competitive strokes: Free, Back, Breast, Fly',
      'Sidestroke and endurance treading (2 minutes)',
      'Continuous 25-yard laps with legal flip turns',
      'Open water safety principles',
    ],
    color: '#2563EB',
    badgeBg: '#DBEAFE',
    badgeText: '#1E40AF',
  },
  {
    id: 'stage-6',
    code: '6',
    name: 'Stroke Mechanics',
    track: 'strokes',
    trackName: 'Swim Strokes',
    ageGroupLabel: 'Youth (5–12), Teens & Adults',
    description:
      'In stage 6, students refine stroke technique on all major competitive strokes, learn about competitive swimming, and discover how to incorporate swimming into a healthy lifestyle.',
    keySkills: [
      'Refining stroke efficiency and pace management',
      '50-yard continuous strokes on competitive intervals',
      'Competitive starts, flip turns, and relay transitions',
      'Lifelong conditioning & swim team readiness',
    ],
    color: '#7C3AED',
    badgeBg: '#EDE9FE',
    badgeText: '#5B21B6',
  },
];

/**
 * COMPLETE SCHEDULE OFFERINGS FROM PAGES 4, 5, AND 6 OF THE OFFICIAL AQUATICS GUIDE
 */
export const AQUATICS_CLASSES: AquaticsClassOffering[] = [
  // ================= MONDAY & WEDNESDAY =================
  {
    id: 'class-mon-masters',
    day: 'Monday',
    startTime: '8:00 PM',
    endTime: '9:15 PM',
    title: 'Masters Adult Swim Workout',
    stageCode: 'Masters',
    classCode: '02301-05',
    ageCategory: 'Adult Masters',
    fullMemberPrice: 170,
    programMemberPrice: 245,
    poolLocation: 'Indoor 25m Pool',
    durationWeeks: 8,
    totalClasses: 15,
    notes: 'Mondays and Wednesdays (09/10 – 10/28). Coached long-distance endurance training.',
  },

  // ================= FRIDAY =================
  {
    id: 'class-fri-teen-adult-beginner',
    day: 'Friday',
    startTime: '7:00 PM',
    endTime: '7:45 PM',
    title: 'Sharon Kelly Teen & Adults Beginner',
    stageCode: 'Beginner',
    classCode: '02301-17',
    ageCategory: 'Teen & Adult',
    fullMemberPrice: 0,
    programMemberPrice: 0,
    isFree: true,
    poolLocation: 'Indoor 25m Pool',
    durationWeeks: 8,
    totalClasses: 8,
    notes: 'Free class for Full Members and Program Members! 09/11 – 10/30 (8 classes).',
  },

  // ================= SATURDAY (14 CLASSES) =================
  {
    id: 'class-sat-01',
    day: 'Saturday',
    startTime: '8:00 AM',
    endTime: '8:30 AM',
    title: 'Parent and Child Stage A (Water Discovery)',
    stageCode: 'A',
    classCode: '02101-20',
    ageCategory: 'Parent/Child',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
    notes: '09/12 – 10/31 (8 classes). Parent accompanies child.',
  },
  {
    id: 'class-sat-02',
    day: 'Saturday',
    startTime: '8:00 AM',
    endTime: '8:30 AM',
    title: 'Pre Stage 1: Water Acclimation',
    stageCode: '1',
    classCode: '02101-22',
    ageCategory: 'Preschool',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sat-03',
    day: 'Saturday',
    startTime: '8:40 AM',
    endTime: '9:10 AM',
    title: 'Parent and Child Stage B (Water Exploration)',
    stageCode: 'B',
    classCode: '02101-21',
    ageCategory: 'Parent/Child',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sat-04',
    day: 'Saturday',
    startTime: '8:40 AM',
    endTime: '9:10 AM',
    title: 'Youth Stage 4: Stroke Introduction',
    stageCode: '4',
    classCode: '02201-20',
    ageCategory: 'Youth',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sat-05',
    day: 'Saturday',
    startTime: '9:20 AM',
    endTime: '9:50 AM',
    title: 'Pre Stage 3: Water Stamina',
    stageCode: '3',
    classCode: '02103-20',
    ageCategory: 'Preschool',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sat-06',
    day: 'Saturday',
    startTime: '9:20 AM',
    endTime: '9:50 AM',
    title: 'Youth Stage 1: Water Acclimation',
    stageCode: '1',
    classCode: '02201-21',
    ageCategory: 'Youth',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sat-07',
    day: 'Saturday',
    startTime: '10:00 AM',
    endTime: '10:30 AM',
    title: 'Youth Stage 6: Stroke Mechanics',
    stageCode: '6',
    classCode: '02101-23',
    ageCategory: 'Youth',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sat-08',
    day: 'Saturday',
    startTime: '10:00 AM',
    endTime: '10:30 AM',
    title: 'Youth Stage 2: Water Movement',
    stageCode: '2',
    classCode: '02202-21',
    ageCategory: 'Youth',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sat-09',
    day: 'Saturday',
    startTime: '10:40 AM',
    endTime: '11:10 AM',
    title: 'Pre Stage 2: Water Movement',
    stageCode: '2',
    classCode: '02102-20',
    ageCategory: 'Preschool',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sat-10',
    day: 'Saturday',
    startTime: '10:40 AM',
    endTime: '11:10 AM',
    title: 'Youth Stage 3: Water Stamina',
    stageCode: '3',
    classCode: '02203-20',
    ageCategory: 'Youth',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sat-11',
    day: 'Saturday',
    startTime: '11:20 AM',
    endTime: '11:50 AM',
    title: 'Pre Stage 4: Stroke Introduction',
    stageCode: '4',
    classCode: '02104-20',
    ageCategory: 'Preschool',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sat-12',
    day: 'Saturday',
    startTime: '11:20 AM',
    endTime: '11:50 AM',
    title: 'Youth Stage 5: Stroke Development',
    stageCode: '5',
    classCode: '02204-20',
    ageCategory: 'Youth',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sat-13',
    day: 'Saturday',
    startTime: '12:00 PM',
    endTime: '12:30 PM',
    title: 'Pre Stage 1: Water Acclimation',
    stageCode: '1',
    classCode: '02101-68',
    ageCategory: 'Preschool',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sat-14',
    day: 'Saturday',
    startTime: '12:00 PM',
    endTime: '12:30 PM',
    title: 'Pre Stage 2: Water Movement',
    stageCode: '2',
    classCode: '02101-69',
    ageCategory: 'Preschool',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },

  // ================= SUNDAY (12 CLASSES) =================
  {
    id: 'class-sun-01',
    day: 'Sunday',
    startTime: '8:30 AM',
    endTime: '9:10 AM',
    title: 'Teen & Adults Beginner',
    stageCode: 'Beginner',
    classCode: '02301-17',
    ageCategory: 'Teen & Adult',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
    notes: '09/13 – 11/01 (8 classes).',
  },
  {
    id: 'class-sun-02',
    day: 'Sunday',
    startTime: '9:20 AM',
    endTime: '9:50 AM',
    title: 'Parent and Child Stage A (Water Discovery)',
    stageCode: 'A',
    classCode: '02101-18',
    ageCategory: 'Parent/Child',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sun-03',
    day: 'Sunday',
    startTime: '9:20 AM',
    endTime: '9:50 AM',
    title: 'Youth Stage 1: Water Acclimation',
    stageCode: '1',
    classCode: '02201-18',
    ageCategory: 'Youth',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sun-04',
    day: 'Sunday',
    startTime: '10:00 AM',
    endTime: '10:30 AM',
    title: 'Pre Stage 2: Water Movement',
    stageCode: '2',
    classCode: '02102-19',
    ageCategory: 'Preschool',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sun-05',
    day: 'Sunday',
    startTime: '10:00 AM',
    endTime: '10:30 AM',
    title: 'Youth Stage 2: Water Movement',
    stageCode: '2',
    classCode: '02202-18',
    ageCategory: 'Youth',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sun-06',
    day: 'Sunday',
    startTime: '10:40 AM',
    endTime: '11:10 AM',
    title: 'Pre Stage 1: Water Acclimation',
    stageCode: '1',
    classCode: '02101-19',
    ageCategory: 'Preschool',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sun-07',
    day: 'Sunday',
    startTime: '10:40 AM',
    endTime: '11:10 AM',
    title: 'Youth Stage 4: Stroke Introduction',
    stageCode: '4',
    classCode: '02201-19',
    ageCategory: 'Youth',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sun-08',
    day: 'Sunday',
    startTime: '11:20 AM',
    endTime: '11:50 AM',
    title: 'Pre Stage 4: Stroke Introduction',
    stageCode: '4',
    classCode: '02104-18',
    ageCategory: 'Preschool',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sun-09',
    day: 'Sunday',
    startTime: '11:20 AM',
    endTime: '11:50 AM',
    title: 'Youth Stage 3: Water Stamina',
    stageCode: '3',
    classCode: '02203-18',
    ageCategory: 'Youth',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sun-10',
    day: 'Sunday',
    startTime: '12:00 PM',
    endTime: '12:30 PM',
    title: 'Pre Stage 3: Water Stamina',
    stageCode: '3',
    classCode: '02103-65',
    ageCategory: 'Preschool',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sun-11',
    day: 'Sunday',
    startTime: '12:00 PM',
    endTime: '12:30 PM',
    title: 'Youth Stage 5: Stroke Development',
    stageCode: '5',
    classCode: '02204-30',
    ageCategory: 'Youth',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
  {
    id: 'class-sun-12',
    day: 'Sunday',
    startTime: '12:40 PM',
    endTime: '1:10 PM',
    title: 'Youth Stage 6: Stroke Mechanics',
    stageCode: '6',
    classCode: '02101-66',
    ageCategory: 'Youth',
    fullMemberPrice: 112,
    programMemberPrice: 185,
    poolLocation: 'Indoor Pool',
    durationWeeks: 8,
    totalClasses: 8,
  },
];

export const CERTIFICATION_PROGRAMS: CertificationProgram[] = [
  {
    id: 'cert-cpr-community',
    title: 'CPR for the Community',
    provider: 'American Safety & Health Institute (ASHI)',
    badge: 'Open to All Community Members',
    ageRequirement: 'Must be at least 16 years old',
    validity: 'Certifications are valid for 2 years',
    description:
      'Certification through American Safety and Health Institute. Participants will receive hands-on training for infant, child, and adult CPR and basic airway management. This course is open to all members of the community.',
    curriculumHighlights: [
      'Adult, Child, and Infant CPR protocols',
      'Automated External Defibrillator (AED) usage',
      'Relief of choking in conscious and unconscious victims',
      'Hands-on manikin practice with pocket mask techniques',
      '2-year ASHI certification card issued upon completion',
    ],
    audience: 'Community members, parents, caregivers, coaches, teachers (Ages 16+)',
  },
  {
    id: 'cert-red-cross-lifeguard',
    title: 'American Red Cross Lifeguard Certification',
    provider: 'American Red Cross',
    badge: 'Professional Career Credential',
    ageRequirement: 'Must be at least 15 years old',
    validity: 'Lifeguarding / First Aid / CPR / AED valid for 2 years',
    description:
      'The purpose of the American Red Cross Lifeguarding course is to provide entry-level lifeguard participants with the knowledge and skills to prevent, recognize, and respond to aquatic emergencies and to provide care for breathing and cardiac emergencies, injuries, and sudden illnesses until emergency medical services (EMS) personnel take over.',
    curriculumHighlights: [
      'Professional surveillance and scanning techniques',
      'Water rescue skills (active, passive, submerged victims)',
      'Spinal injury management in shallow and deep water',
      'CPR/AED for the Professional Rescuer',
      'First Aid and Emergency Oxygen administration',
      'Pre-requisite: 300-yard continuous swim, 2-minute treading (no hands), and 20-yard timed brick retrieve',
    ],
    audience: 'Future YMCA lifeguards, camp counselors, competitive swimmers (Ages 15+)',
  },
  {
    id: 'masters-swim-program',
    title: 'YMCA Masters Swim Program',
    provider: 'YMCA Silver Spring Aquatics Department',
    badge: 'Competitive Adult Fitness',
    ageRequirement: 'Adults (Ages 18+)',
    validity: '8-Week Structured Coaching Session (15 Classes)',
    description:
      'A special class of competitive swimming designed for individuals looking to push themselves in long distance workouts. Builds cardiovascular conditioning, muscular endurance across all muscle groups, and technical stroke efficiency under coaching.',
    curriculumHighlights: [
      'Coached interval sets with customized workout lanes',
      'Endurance pacing, interval training, and aerobic threshold work',
      'Technique feedback on all competitive strokes and turns',
      'Preparation for open water swims, triathlons, and Masters meets',
      'Mondays & Wednesdays 8:00 PM – 9:15 PM ($170 Full Priv. / $245 Program)',
    ],
    audience: 'Adult fitness swimmers, former competitive swimmers, triathletes (Ages 18+)',
  },
];

export function getClassesByDay(day: 'Monday' | 'Friday' | 'Saturday' | 'Sunday') {
  return AQUATICS_CLASSES.filter((c) => c.day === day);
}

export function getClassesByStage(stageCode: string) {
  return AQUATICS_CLASSES.filter((c) => c.stageCode === stageCode);
}

export function searchAquaticsClasses(query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return AQUATICS_CLASSES;
  return AQUATICS_CLASSES.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.classCode.toLowerCase().includes(q) ||
      c.ageCategory.toLowerCase().includes(q) ||
      c.day.toLowerCase().includes(q) ||
      c.stageCode.toLowerCase().includes(q)
  );
}
