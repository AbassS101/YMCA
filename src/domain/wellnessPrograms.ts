/**
 * YMCA Silver Spring - Wellness Training Programs Domain Model & Authoritative Catalog
 * Source: Official YMCA Silver Spring Wellness Training Programs Rate Card & Overview
 */

export type WellnessProgramType = 'personal-60' | 'personal-30' | 'partner';

export type WellnessPackageTier = {
  sessions: number; // 1, 4, 8, 12
  branchMemberPrice: number; // Total price in USD
  communityMemberPrice: number; // Total price in USD
  branchMemberPerSession: number; // Price per session in USD
  communityMemberPerSession: number; // Price per session in USD
  branchMemberPerPersonPerSession?: number; // For partner training ($/session/person)
  communityMemberPerPersonPerSession?: number; // For partner training ($/session/person)
  badge?: string; // e.g. "Most Popular", "Best Value"
  savingsNote?: string;
};

export type WellnessTrainingProgram = {
  id: WellnessProgramType;
  title: string;
  shortTitle: string;
  durationMinutes: number;
  participants: '1-on-1' | '2-on-1 (Partner)';
  tagline: string;
  description: string;
  icon: string;
  tiers: WellnessPackageTier[];
};

export type WellnessInclusion = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
};

export type WellnessAreaOfExpertise = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export type WellnessContactInfo = {
  branchName: string;
  address: string;
  phone: string;
  phoneRaw: string;
  email: string;
  inBranchPrompt: string;
};

/** Official Contact Information for YMCA Silver Spring Wellness */
export const WELLNESS_CONTACT_INFO: WellnessContactInfo = {
  branchName: 'YMCA Silver Spring',
  address: '9800 Hastings Drive, Silver Spring, MD 20901',
  phone: '301.585.2120',
  phoneRaw: '3015852120',
  email: 'YSS.Wellness@ymcadc.org',
  inBranchPrompt: 'Speak with a wellness team member in the branch or stop by the Wellness Center desk.',
};

/** Every package includes these four core professional pillars */
export const WELLNESS_PACKAGE_INCLUSIONS: WellnessInclusion[] = [
  {
    id: 'functional-assessment',
    title: 'Full Functional Assessment',
    subtitle: 'Baseline Biomechanics & Movement Screen',
    description:
      'Comprehensive movement screening evaluating joint mobility, core stability, balance, and muscular endurance to identify asymmetries and establish benchmarks.',
    icon: 'body-outline',
  },
  {
    id: 'goal-planning',
    title: 'Goal Planning & Behavior Modification',
    subtitle: 'Sustainable Lifestyle Strategy',
    description:
      'Collaborative objective setting with your certified trainer. Build actionable habit systems, nutrition accountability, and behavioral strategies tailored to your lifestyle.',
    icon: 'compass-outline',
  },
  {
    id: 'custom-program',
    title: 'Custom Program Plan',
    subtitle: 'Individualized Periodized Programming',
    description:
      'A science-backed, progressive training regimen engineered specifically around your assessment results, schedule availability, and primary fitness milestones.',
    icon: 'clipboard-outline',
  },
  {
    id: 'post-assessment',
    title: 'Post-Functional Assessment',
    subtitle: 'Measurable Progress Verification',
    description:
      'Structured re-evaluation after completing your session package to measure strength progression, mobility gains, body composition changes, and next-phase goals.',
    icon: 'analytics-outline',
  },
];

/** Specialized Areas of Expertise from Nationally Certified YMCA Trainers */
export const WELLNESS_AREAS_OF_EXPERTISE: WellnessAreaOfExpertise[] = [
  {
    id: 'general-fitness',
    title: 'General Health and Fitness',
    description: 'Cardiovascular conditioning, total-body muscular endurance, and functional everyday vitality.',
    icon: 'heart-outline',
  },
  {
    id: 'weight-loss',
    title: 'Weight Loss & Body Composition',
    description: 'Metabolic conditioning, lean mass retention, and progressive caloric expenditure strategies.',
    icon: 'flame-outline',
  },
  {
    id: 'chronic-disease',
    title: 'Chronic Disease Management',
    description: 'Exercise protocols tailored for hypertension, pre-diabetes, arthritis, osteopenia, and healthy aging.',
    icon: 'shield-checkmark-outline',
  },
  {
    id: 'corrective-rehab',
    title: 'Corrective Exercise & Post-Rehab',
    description: 'Postural restoration, shoulder/hip stability, and safe return-to-activity after physical therapy clearance.',
    icon: 'fitness-outline',
  },
  {
    id: 'athletic-training',
    title: 'Sport Specific Athletic Training',
    description: 'Agility, rotational power, sprint mechanics, and endurance periodization for competitive athletes.',
    icon: 'trophy-outline',
  },
];

/** Complete Official Wellness Training Packages & Pricing Tiers */
export const WELLNESS_TRAINING_PROGRAMS: WellnessTrainingProgram[] = [
  {
    id: 'personal-60',
    title: 'Personal Wellness Training (60-Minute)',
    shortTitle: '60-Min 1-on-1',
    durationMinutes: 60,
    participants: '1-on-1',
    tagline: 'Workout with one trainer',
    description:
      'Comprehensive 60-minute private coaching sessions with dedicated warmup, progressive strength overload, functional conditioning, and guided mobility.',
    icon: 'fitness',
    tiers: [
      {
        sessions: 1,
        branchMemberPrice: 60,
        communityMemberPrice: 65,
        branchMemberPerSession: 60,
        communityMemberPerSession: 65,
        savingsNote: 'Member saves $5',
      },
      {
        sessions: 4,
        branchMemberPrice: 220,
        communityMemberPrice: 240,
        branchMemberPerSession: 55,
        communityMemberPerSession: 60,
        badge: 'Popular Starter',
        savingsNote: '$55/session · Member saves $20',
      },
      {
        sessions: 8,
        branchMemberPrice: 440,
        communityMemberPrice: 480,
        branchMemberPerSession: 55,
        communityMemberPerSession: 60,
        badge: 'Consistency Builder',
        savingsNote: '$55/session · Member saves $40',
      },
      {
        sessions: 12,
        branchMemberPrice: 600,
        communityMemberPrice: 720,
        branchMemberPerSession: 50,
        communityMemberPerSession: 60,
        badge: 'Best Value',
        savingsNote: '$50/session · Member saves $120!',
      },
    ],
  },
  {
    id: 'personal-30',
    title: 'Personal Wellness Training (30-Minute)',
    shortTitle: '30-Min Express',
    durationMinutes: 30,
    participants: '1-on-1',
    tagline: 'High-efficiency focused workouts',
    description:
      'Time-efficient 30-minute high-intensity private sessions designed for tight schedules. Maximum training density and form coaching in a compact window.',
    icon: 'stopwatch-outline',
    tiers: [
      {
        sessions: 1,
        branchMemberPrice: 35,
        communityMemberPrice: 40,
        branchMemberPerSession: 35,
        communityMemberPerSession: 40,
        savingsNote: 'Member saves $5',
      },
      {
        sessions: 4,
        branchMemberPrice: 140,
        communityMemberPrice: 160,
        branchMemberPerSession: 35,
        communityMemberPerSession: 40,
        badge: 'Express Pack',
        savingsNote: 'Member saves $20',
      },
      {
        sessions: 8,
        branchMemberPrice: 280,
        communityMemberPrice: 320,
        branchMemberPerSession: 35,
        communityMemberPerSession: 40,
        badge: 'Routine Habit',
        savingsNote: 'Member saves $40',
      },
      {
        sessions: 12,
        branchMemberPrice: 420,
        communityMemberPrice: 480,
        branchMemberPerSession: 35,
        communityMemberPerSession: 40,
        badge: 'Best Value',
        savingsNote: 'Member saves $60',
      },
    ],
  },
  {
    id: 'partner',
    title: 'Partner Wellness Training',
    shortTitle: 'Partner (2:1)',
    durationMinutes: 60,
    participants: '2-on-1 (Partner)',
    tagline: 'Workout with a friend and one trainer',
    description:
      'Shared 60-minute training sessions for two participants with one certified trainer. Experience mutual accountability, motivating camaraderie, and premium savings.',
    icon: 'people-outline',
    tiers: [
      {
        sessions: 1,
        branchMemberPrice: 90,
        communityMemberPrice: 100,
        branchMemberPerSession: 90,
        communityMemberPerSession: 100,
        branchMemberPerPersonPerSession: 45,
        communityMemberPerPersonPerSession: 50,
        savingsNote: '$45/person/session',
      },
      {
        sessions: 4,
        branchMemberPrice: 340,
        communityMemberPrice: 400,
        branchMemberPerSession: 85,
        communityMemberPerSession: 100,
        branchMemberPerPersonPerSession: 42.5,
        communityMemberPerPersonPerSession: 50,
        badge: 'Partner Starter',
        savingsNote: '$42.50/person/session · Member saves $60',
      },
      {
        sessions: 8,
        branchMemberPrice: 680,
        communityMemberPrice: 800,
        branchMemberPerSession: 85,
        communityMemberPerSession: 100,
        branchMemberPerPersonPerSession: 42.5,
        communityMemberPerPersonPerSession: 50,
        badge: 'Partner Habit',
        savingsNote: '$42.50/person/session · Member saves $120',
      },
      {
        sessions: 12,
        branchMemberPrice: 900,
        communityMemberPrice: 1080,
        branchMemberPerSession: 75,
        communityMemberPerSession: 90,
        branchMemberPerPersonPerSession: 37.5,
        communityMemberPerPersonPerSession: 45,
        badge: 'Best Value',
        savingsNote: '$37.50/person/session · Member saves $180!',
      },
    ],
  },
];

/** Calculate total dollar savings for Branch Member vs Community Member */
export function calculateMemberSavings(programId: WellnessProgramType, sessions: number): number {
  const program = WELLNESS_TRAINING_PROGRAMS.find((p) => p.id === programId);
  if (!program) return 0;
  const tier = program.tiers.find((t) => t.sessions === sessions);
  if (!tier) return 0;
  return tier.communityMemberPrice - tier.branchMemberPrice;
}

/** Lowest branch-member per-session rate across the given packages (the "from $35" price). */
export function lowestWellnessRate(programs: WellnessTrainingProgram[]): number {
  return Math.min(...programs.flatMap((p) => p.tiers.map((t) => t.branchMemberPerSession)));
}

/** Biggest branch-member saving over the community rate on any package ("save up to $180"). */
export function largestWellnessSavings(programs: WellnessTrainingProgram[]): number {
  return Math.max(0, ...programs.flatMap((p) => p.tiers.map((t) => t.communityMemberPrice - t.branchMemberPrice)));
}

/** Rate-card highlights for the Programs screen, built from the packages on offer. */
export function wellnessRateHighlights(programs: WellnessTrainingProgram[]): string[] {
  const lines: string[] = [];
  const personal60 = programs.find((p) => p.id === 'personal-60');
  const single = personal60?.tiers[0];
  const biggest = personal60?.tiers[personal60.tiers.length - 1];
  if (personal60 && single && biggest) {
    const saving = biggest.communityMemberPrice - biggest.branchMemberPrice;
    const pack = `${biggest.sessions}-pack at ${formatWellnessPrice(biggest.branchMemberPerSession)}/session`;
    lines.push(
      `Personal 60-Min (${formatWellnessPrice(single.branchMemberPerSession)}/session; ${pack}${saving > 0 ? ` saving ${formatWellnessPrice(saving)}+` : ''})`
    );
  }
  const express = programs.find((p) => p.id === 'personal-30')?.tiers[0];
  if (express) lines.push(`Personal 30-Min Express (${formatWellnessPrice(express.branchMemberPerSession)}/session) for focused conditioning`);
  const partner = programs.find((p) => p.id === 'partner')?.tiers[0];
  if (partner) {
    const each = partner.branchMemberPerPersonPerSession ?? partner.branchMemberPerSession / 2;
    lines.push(`Partner Wellness Training (${formatWellnessPrice(each)}/person/session) - workout with a friend`);
  }
  return lines;
}

/** Format currency helper */
export function formatWellnessPrice(amount: number): string {
  return amount % 1 === 0 ? `$${amount}` : `$${amount.toFixed(2)}`;
}
