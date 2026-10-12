import type { ScheduleItem } from '@/domain/types';

export type ClassCatalogSection = 'Mind-Body' | 'Cardio' | 'Strength' | 'Specialty & Aquatics';

export type ClassCatalogEntry = {
  id: string;
  title: string;
  aliases: string[];
  section: ClassCatalogSection;
  shortSummary: string;
  description: string;
};

/**
 * Official YMCA Class Descriptions & Short Schedule Summaries
 * Sourced from the YMCA Mind-Body, Cardio, and Strength Class Guide.
 */
export const YMCA_CLASS_CATALOG: ClassCatalogEntry[] = [
  // ==========================================
  // MIND-BODY (Pages 1–2)
  // ==========================================
  {
    id: 'all-levels-yoga',
    title: 'All Levels Yoga',
    aliases: ['all levels yoga'],
    section: 'Mind-Body',
    shortSummary:
      'Yoga poses and variations for beginners alongside challenging options for advanced practice.',
    description:
      'Includes yoga poses and variations suitable for those new to yoga and also challenging poses for those with a more advanced practice.',
  },
  {
    id: 'ashtanga-flow',
    title: 'Ashtanga Flow',
    aliases: ['ashtanga flow', 'ashtanga yoga'],
    section: 'Mind-Body',
    shortSummary:
      'Athletic vinyasa practice of set sequences focusing on breath, postures, gazing points, and inner locks.',
    description:
      'Ashtanga translates to eight limbs. The classical, physical practice of Ashtanga yoga focuses on a couple of these limbs, the breath, the postures, as well as gazing points and inner locks. Ashtanga yoga is an athletic vinyasa practice that is made up of several set sequences.',
  },
  {
    id: 'bodybalance',
    title: 'BODYBALANCE™',
    aliases: ['bodybalance', 'bodybalance™', 'body balance'],
    section: 'Mind-Body',
    shortSummary:
      'Blends Yoga flexibility, Pilates core strengthening, and Tai Chi relaxation set to guiding music.',
    description:
      'BodyBalance merges flexibility and flow from Yoga, core strengthening from Pilates, and mood-boosting relaxation from Tai Chi, all set to music that guides the movements.',
  },
  {
    id: 'corefusion',
    title: 'CoreFusion',
    aliases: ['corefusion', 'core fusion'],
    section: 'Mind-Body',
    shortSummary:
      'High-energy blend of Pilates and yoga building core strength, endurance, balance, and flexibility.',
    description:
      'A high-energy class blending elements of Pilates and yoga. We focus on increasing strength, endurance, and flexibility through fluid, continuous movements. Core strength is highlighted alongside balance and cardiovascular elements.',
  },
  {
    id: 'core-power-yoga',
    title: 'Core Power Yoga',
    aliases: ['core power yoga', 'corepower yoga'],
    section: 'Mind-Body',
    shortSummary:
      'Physically challenging yoga targeting the entire core for balance, central strength, and stability.',
    description:
      'Designed to be physically challenging, Core Power Yoga works the entire core, building balance, central strength, and functional stability over time.',
  },
  {
    id: 'hatha-yoga',
    title: 'Hatha Yoga',
    aliases: ['hatha yoga'],
    section: 'Mind-Body',
    shortSummary:
      'Classic postures, breathing techniques, and meditation to stretch, align, and calm body and mind.',
    description:
      'Hatha Yoga is the most widely practiced form of yoga in America. Hatha Yoga uses bodily postures (asanas), breathing techniques (pranyayama), and meditation (dyana) with the goal of bring about a sound healthy body and clear, peaceful mind. Hatha Yoga postures also stretch and align the body, promoting balance and flexibility.',
  },
  {
    id: 'iyengar-yoga',
    title: 'Iyengar Yoga',
    aliases: ['iyengar yoga'],
    section: 'Mind-Body',
    shortSummary:
      'Gentle Hatha yoga focusing on precise posture alignment and breath control for strength and balance.',
    description:
      'A form of Hatha (or gentle) yoga created by world renowned yoga instructor B.K.S Iyengar, Iyengar yoga focuses on performing each asana (or posture) with attention to alignment and breath control. One of the world’s most widely practiced forms of yoga, Iyengar Yoga emphasizes alignment of body, breath, mind, and spirit within each pose. This precision builds strength and stamina, balance and flexibility, and provides a deep sense of well-being.',
  },
  {
    id: 'qigong',
    title: 'Qigong',
    aliases: ['qigong', 'qi gong'],
    section: 'Mind-Body',
    shortSummary:
      'Mind-body breathing and gentle motion to improve qi (energy) circulation for all levels.',
    description:
      'Qigong is mind-body exercise that uses breathing and motion to improve qi (energy) circulation. This class is designed to benefit both beginners and experienced students.',
  },
  {
    id: 'rocket-yoga',
    title: 'Rocket Yoga',
    aliases: ['rocket yoga'],
    section: 'Mind-Body',
    shortSummary:
      'Dynamic, fast-paced Ashtanga-inspired yoga that invigorates and challenges body and mind.',
    description:
      'Rocket Yoga is a dynamic and fast-paced style of yoga, inspired by Ashtanga Vinyasa Yoga. It is a powerful and invigorating practice that challenges both the body and mind.',
  },
  {
    id: 'tai-chi',
    title: 'Tai Chi',
    aliases: ['tai chi', 'taichi'],
    section: 'Mind-Body',
    shortSummary:
      'Graceful meditation in motion using gentle, flowing postures to reduce stress and promote serenity.',
    description:
      'Developed for self-defense, tai chi has evolved into a graceful form of exercise used for stress reduction and a variety of other health conditions. Often described as meditation in motion, tai chi promotes serenity through gentle, flowing postures and movements.',
  },
  {
    id: 'yoga-101',
    title: 'Yoga 101',
    aliases: ['yoga 101'],
    section: 'Mind-Body',
    shortSummary:
      'Learn yoga basics safely and in a fun way—ideal if you are new to yoga.',
    description:
      'Yoga 101 is a class designed to help you learn how to do yoga in a safe and fun way. Yoga is not just a workout, it can also help with many areas of your life, but it is also very important to learn the basics properly, especially if you are new to yoga.',
  },
  {
    id: 'vinyasa-flow-yoga',
    title: 'Vinyasa Flow Yoga',
    aliases: ['vinyasa flow yoga', 'vinyasa yoga', 'yoga flow'],
    section: 'Mind-Body',
    shortSummary:
      'Flowing sequence connecting posture to posture using synchronized breath and movement.',
    description:
      'A broad classification that encompasses many different types of yoga, Vinyasa Yoga connects one posture to the next using breath. This can be thought of as linking or flowing into postures. Vinyasa yoga is all about the movement and flow of energy as you sync the body and the mind together through motion and breath. This flow class strings poses together to make a sequence.',
  },

  // ==========================================
  // CARDIO (Pages 2–3)
  // ==========================================
  {
    id: 'aqua-aerobics',
    title: 'Aqua Aerobics',
    aliases: ['aqua aerobics', 'aqua fit (water aerobics)', 'aqua fit'],
    section: 'Cardio',
    shortSummary:
      'Low-impact water workout that builds muscle strength and endurance while staying easy on your joints.',
    description:
      "Take the plunge and try this low-impact workout that builds muscle strength and boosts your endurance. It’s fun, and it can be as challenging as you like. The buoyance of the water is easy on your joints. That makes water aerobics a good choice if you have joint problems, chronic pain, or are recovering from an injury.\n\n• Shallow water aerobics is done in water waist to chest deep, where your feet stay on the pool floor.\n• Deep water aerobics is done in water over your head, typically with a floatation belt. You’re suspended and don't touch the bottom.",
  },
  {
    id: 'shallow-water-aerobics',
    title: 'Shallow Water Aerobics',
    aliases: ['shallow water aerobics'],
    section: 'Cardio',
    shortSummary:
      'Low-impact waist-to-chest deep water workout that builds strength and endurance while easy on joints.',
    description:
      "Take the plunge and try this low-impact workout that builds muscle strength and boosts your endurance. It’s fun, and it can be as challenging as you like. The buoyance of the water is easy on your joints. That makes water aerobics a good choice if you have joint problems, chronic pain, or are recovering from an injury.\n\n• Shallow water aerobics is done in water waist to chest deep, where your feet stay on the pool floor.\n• Deep water aerobics is done in water over your head, typically with a floatation belt. You’re suspended and don't touch the bottom.",
  },
  {
    id: 'deep-water-aerobics',
    title: 'Deep Water Aerobics',
    aliases: ['deep water aerobics'],
    section: 'Cardio',
    shortSummary:
      'Suspended deep-water workout with a flotation belt—builds strength and endurance with zero joint impact.',
    description:
      "Take the plunge and try this low-impact workout that builds muscle strength and boosts your endurance. It’s fun, and it can be as challenging as you like. The buoyance of the water is easy on your joints. That makes water aerobics a good choice if you have joint problems, chronic pain, or are recovering from an injury.\n\n• Shallow water aerobics is done in water waist to chest deep, where your feet stay on the pool floor.\n• Deep water aerobics is done in water over your head, typically with a floatation belt. You’re suspended and don't touch the bottom.",
  },
  {
    id: 'bodypump',
    title: 'BODYPUMP™',
    aliases: ['bodypump', 'bodypump™', 'body pump'],
    section: 'Strength',
    shortSummary:
      'Fast-paced barbell workout with motivating music to tone muscles, build strength, and burn calories.',
    description:
      'BODYPUMP is a fast-paced, barbell-based workout that’s specifically designed to help you get lean, toned and fit. It uses a combination of motivating music, and scientifically proven moves to help you tone muscles, improve strength, endurance and burn calories during and after class by boosting your metabolism.',
  },
  {
    id: 'burn',
    title: 'BURN',
    aliases: ['burn'],
    section: 'Strength',
    shortSummary:
      'Challenging blend of weightlifting, cardio, and functional movements for strength, balance, and agility.',
    description:
      'This challenging class combines elements of weightlifting, cardiovascular training, and functional movements. The workout is designed to enhance different aspects of physical fitness, including strength, endurance, balance, and agility.',
  },
  {
    id: 'cardiolite',
    title: 'Cardiolite',
    aliases: ['cardiolite', 'cardio lite'],
    section: 'Cardio',
    shortSummary:
      'Low-impact cardio/dance followed by training for posture, balance, coordination, and muscle strength.',
    description:
      'This is a low impact cardio class. The cardio/dance portion is followed by training to improve posture, balance, coordination, range of motion, and muscle strength.',
  },
  {
    id: 'cycle',
    title: 'Cycle',
    aliases: ['cycle', 'cycle & spin', 'spin'],
    section: 'Cardio',
    shortSummary:
      'Indoor cycling across hills, flat roads, time trials, and intervals to sweat and burn calories.',
    description:
      'Tackle the terrain - hills, flat roads, mountain peaks, time trials and interval training. Discover your inner athlete as you sweat and burn calories to reach your endorphin high.',
  },
  {
    id: 'y-fusion-dance',
    title: 'Y-Fusion Dance',
    aliases: ['y-fusion dance', 'y fusion dance'],
    section: 'Cardio',
    shortSummary:
      'Choreographed aerobic dance combining traditional steps and modern moves for fun cardio.',
    description:
      'You will find traditional dance steps as well as modern dance moves in this choreographed aerobic dance class. Y-Fusion Dance is a fun and effective way to get your cardio exercise and make new friends at the Y!',
  },
  {
    id: 'zumba',
    title: 'Zumba',
    aliases: ['zumba'],
    section: 'Cardio',
    shortSummary:
      'Simple, heart-pumping dance moves set to alternating slow and fast Latin, International, and Salsa music.',
    description:
      'Zumba is a great fitness class that combines Latin, International, and Salsa music with some amazing and fun filled dance moves. There will be slow and fast rhythms alternating throughout so that you can keep burning calories. Zumba is not just for people who can dance. Anybody can join in! The steps are simple, heart-pumping and fun.',
  },

  // ==========================================
  // STRENGTH (Pages 3–4)
  // ==========================================
  {
    id: 'barre',
    title: 'Barre',
    aliases: ['barre'],
    section: 'Strength',
    shortSummary:
      'Pilates and yoga inspired by ballet barre exercises where you stretch, lift, and burn.',
    description:
      'A combination of Pilates and Yoga inspired by dance exercises. This class is focused around the “ballet barre,” where you will stretch, lift and burn!',
  },
  {
    id: 'body-weight-training',
    title: 'Body Weight Training',
    aliases: ['body weight training', 'bodyweight training'],
    section: 'Strength',
    shortSummary:
      'Total body workout using various exercises to target every muscle group.',
    description:
      'This total body workout uses various exercises to target every muscle group.',
  },
  {
    id: 'express-core',
    title: 'Express Core',
    aliases: ['express core'],
    section: 'Strength',
    shortSummary:
      '30-minute workout targeting stabilizer and core muscles to improve posture and strength.',
    description:
      'Core training is doing specific exercises to develop and strengthen the stabilizer muscles. Keeping cores muscles strong helps with posture and gives you more strength in other exercises. This 30-minute class is a great way to start your day off strong!',
  },
  {
    id: 'iron-warriors',
    title: 'Iron Warriors',
    aliases: ['iron warriors'],
    section: 'Strength',
    shortSummary:
      'Trainer-led circuit strength training with new monthly routines for strength, endurance, and flexibility.',
    description:
      'Iron Warriors is circuit strength training class that is open to everyone. Led by personal trainers, you will learn new routines monthly while building strength, endurance, and flexibility. This is a great small group training option.',
  },
  {
    id: 'strength-and-balance',
    title: 'Strength & Balance',
    aliases: ['strength & balance', 'strength and balance'],
    section: 'Strength',
    shortSummary:
      'Low-impact workout with chair support to improve strength, balance, flexibility, and independence.',
    description:
      'Becoming stronger and maintaining health and independence is the focus of this class. With a chair available, exercises to improve strength, balance and flexibility are incorporated in this low impact workout.',
  },
  {
    id: 'total-body-conditioning',
    title: 'Total Body Conditioning',
    aliases: ['total body conditioning'],
    section: 'Strength',
    shortSummary:
      'High-intensity interval workout combining strength and cardio to target every muscle group.',
    description:
      'Total Body Conditioning combines strength training and cardio to help improve muscular endurance. This total body workout uses various exercises in a high intensity interval format to target every muscle group.',
  },

  // ==========================================
  // SPECIALTY & BRANCH PROGRAMS
  // ==========================================
  {
    id: 'full-circle-health',
    title: 'Full Circle Health',
    aliases: ['full circle health'],
    section: 'Specialty & Aquatics',
    shortSummary:
      'Guided wellness and mobility protocol supporting recovery and functional independence (Reg Required).',
    description:
      'Targeted wellness and mobility protocol supporting chronic condition recovery, movement rehabilitation, and functional independence. Advance Registration Required.',
  },
  {
    id: 'pedaling-for-parkinsons',
    title: 'Pedaling for Parkinsons',
    aliases: ['pedaling for parkinsons', "pedaling for parkinson's"],
    section: 'Specialty & Aquatics',
    shortSummary:
      'Evidence-based indoor cycling supporting mobility and motor function for Parkinson’s (Reg Required).',
    description:
      'Evidence-based indoor cycling protocol for individuals living with Parkinson’s disease. Supported by the Davis Phinney Foundation. Advance Registration Required.',
  },
  {
    id: 'small-group-training',
    title: 'Small Group Training',
    aliases: ['small group training'],
    section: 'Strength',
    shortSummary:
      'Coached functional circuit intervals with personalized technique guidance (Reg Required).',
    description:
      'Guided functional conditioning and circuit intervals with personalized technique coaching. Advance Registration Required.',
  },
  {
    id: 'mat-pilates',
    title: 'Mat Pilates',
    aliases: ['mat pilates'],
    section: 'Mind-Body',
    shortSummary:
      'Floor-based core workout focusing on pelvic alignment, postural control, and abdominal stability.',
    description:
      'Core-strengthening floor exercise method focusing on pelvic alignment, postural control, and abdominal stability.',
  },
  {
    id: 'heat',
    title: 'HEAT',
    aliases: ['heat'],
    section: 'Cardio',
    shortSummary:
      'Fast-paced metabolic conditioning combining bodyweight drills, agility, and sprint intervals.',
    description:
      'High-Efficiency Athletic Training (HEAT): Fast-paced metabolic conditioning combining bodyweight drills, agility, and sprint intervals.',
  },
  {
    id: 'gentle-chair-yoga',
    title: 'Gentle Chair Yoga',
    aliases: ['gentle chair yoga'],
    section: 'Mind-Body',
    shortSummary:
      'Gentle seated and supported stretches designed for mobility, balance, and joint relief.',
    description:
      'Gentle seated and supported stretches designed for mobility, balance, and joint relief.',
  },
  {
    id: 'fit-well-seniors',
    title: 'Fit & Well Seniors',
    aliases: ['fit & well seniors'],
    section: 'Specialty & Aquatics',
    shortSummary:
      'Low-impact cardio, light hand weights, and stability drills for active older adults.',
    description:
      'Low-impact cardiovascular conditioning, light hand weights, and stability drills for active older adults.',
  },
  {
    id: 'aqua-arthritis',
    title: 'Aqua Arthritis Warm Water Therapy',
    aliases: ['aqua arthritis warm water therapy', 'aqua arthritis'],
    section: 'Specialty & Aquatics',
    shortSummary:
      'Gentle warm-water exercise proven to ease arthritis pain and improve joint mobility.',
    description:
      'Gentle soothing aquatic exercise proven to decrease arthritis pain and increase joint mobility in warm pool.',
  },
  {
    id: 'movement-for-parkinsons',
    title: "Movement for Parkinson's & Balance",
    aliases: ["movement for parkinson's & balance"],
    section: 'Specialty & Aquatics',
    shortSummary:
      'Functional movement targeting neuromuscular coordination, gait, and balance.',
    description:
      'Evidence-based functional movement class targeting neuromuscular coordination, gait, and balance.',
  },
];

export function getClassCatalogEntry(title: string): ClassCatalogEntry | undefined {
  const normalized = title.trim().toLowerCase();
  return (
    YMCA_CLASS_CATALOG.find((entry) => entry.aliases.includes(normalized)) ??
    YMCA_CLASS_CATALOG.find((entry) =>
      entry.aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized))
    )
  );
}

/**
 * Returns a concise 1-sentence summary for schedule cards so members get
 * helpful context at a glance without cluttering the schedule view.
 */
export function getClassShortSummary(
  item: Pick<ScheduleItem, 'title' | 'shortSummary' | 'description'>
): string {
  if (item.shortSummary && item.shortSummary.trim().length > 0) {
    return item.shortSummary.trim();
  }
  const entry = getClassCatalogEntry(item.title);
  if (entry) {
    return entry.shortSummary;
  }
  if (item.description && item.description.trim().length > 0) {
    const firstSentence = item.description.split(/(?<=[.!?])\s+/)[0] ?? item.description;
    return firstSentence.length > 115 ? `${firstSentence.slice(0, 112).trim()}...` : firstSentence;
  }
  return 'Drop-in group session led by a certified YMCA Silver Spring instructor.';
}

/**
 * Returns the full official YMCA class description for the detail modal.
 */
export function getClassFullDescription(
  item: Pick<ScheduleItem, 'title' | 'description'>
): string {
  const entry = getClassCatalogEntry(item.title);
  if (entry) {
    return entry.description;
  }
  if (item.description && item.description.trim().length > 0) {
    return item.description.trim();
  }
  return 'Join our certified YMCA Silver Spring instructor for this dynamic group fitness session designed to build functional strength, mobility, and cardiovascular health in a supportive community environment.';
}

/**
 * Determines whether a schedule item requires advance registration/booking.
 * Only classes explicitly flagged with `registrationRequired: true` require registration.
 * Standard drop-in classes do not require registration—members simply star them
 * to receive a notification when the class is happening.
 */
export function requiresAdvanceRegistration(
  item: Pick<ScheduleItem, 'registrationRequired'>
): boolean {
  return Boolean(item.registrationRequired);
}

