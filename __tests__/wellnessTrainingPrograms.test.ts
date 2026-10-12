import {
  WELLNESS_AREAS_OF_EXPERTISE,
  WELLNESS_CONTACT_INFO,
  WELLNESS_PACKAGE_INCLUSIONS,
  WELLNESS_TRAINING_PROGRAMS,
  calculateMemberSavings,
  formatWellnessPrice,
} from '@/domain/wellnessPrograms';

describe('YMCA Silver Spring - Wellness Training Programs Domain', () => {
  describe('Official Contact & Facility Details', () => {
    it('contains authoritative YMCA Silver Spring contact and wellness desk channels', () => {
      expect(WELLNESS_CONTACT_INFO.branchName).toBe('YMCA Silver Spring');
      expect(WELLNESS_CONTACT_INFO.phone).toBe('301.585.2120');
      expect(WELLNESS_CONTACT_INFO.phoneRaw).toBe('3015852120');
      expect(WELLNESS_CONTACT_INFO.email).toBe('YSS.Wellness@ymcadc.org');
      expect(WELLNESS_CONTACT_INFO.inBranchPrompt).toContain('Speak with a wellness team member in the branch');
    });
  });

  describe('Core Package Inclusions (Every Package)', () => {
    it('includes all 4 core components from the official wellness training flyer', () => {
      expect(WELLNESS_PACKAGE_INCLUSIONS.length).toBe(4);

      const titles = WELLNESS_PACKAGE_INCLUSIONS.map((inc) => inc.title.toLowerCase());
      expect(titles).toContain('full functional assessment');
      expect(titles).toContain('goal planning & behavior modification');
      expect(titles).toContain('custom program plan');
      expect(titles).toContain('post-functional assessment');
    });

    it('each inclusion provides detailed description and visual icon', () => {
      for (const inclusion of WELLNESS_PACKAGE_INCLUSIONS) {
        expect(inclusion.id).toBeTruthy();
        expect(inclusion.title).toBeTruthy();
        expect(inclusion.subtitle).toBeTruthy();
        expect(inclusion.description.length).toBeGreaterThan(20);
        expect(inclusion.icon).toBeTruthy();
      }
    });
  });

  describe('Trainer Areas of Expertise', () => {
    it('covers all official wellness expertise domains', () => {
      expect(WELLNESS_AREAS_OF_EXPERTISE.length).toBe(5);

      const expertiseTitles = WELLNESS_AREAS_OF_EXPERTISE.map((e) => e.title.toLowerCase());
      expect(expertiseTitles).toContain('general health and fitness');
      expect(expertiseTitles).toContain('weight loss & body composition');
      expect(expertiseTitles).toContain('chronic disease management');
      expect(expertiseTitles).toContain('corrective exercise & post-rehab');
      expect(expertiseTitles).toContain('sport specific athletic training');
    });
  });

  describe('Personal Wellness Training (60-Minute)', () => {
    const program60 = WELLNESS_TRAINING_PROGRAMS.find((p) => p.id === 'personal-60');

    it('defines 60-minute duration and single trainer format', () => {
      expect(program60).toBeDefined();
      expect(program60?.durationMinutes).toBe(60);
      expect(program60?.participants).toBe('1-on-1');
      expect(program60?.tagline).toBe('Workout with one trainer');
    });

    it('matches exact flyer pricing for 1, 4, 8, and 12 sessions', () => {
      const tiers = program60!.tiers;
      expect(tiers.length).toBe(4);

      // 1 session: $60 branch member | $65 community member
      const tier1 = tiers.find((t) => t.sessions === 1)!;
      expect(tier1.branchMemberPrice).toBe(60);
      expect(tier1.communityMemberPrice).toBe(65);
      expect(tier1.branchMemberPerSession).toBe(60);
      expect(tier1.communityMemberPerSession).toBe(65);

      // 4 sessions: $220 branch member ($55/session) | $240 community member ($60/session)
      const tier4 = tiers.find((t) => t.sessions === 4)!;
      expect(tier4.branchMemberPrice).toBe(220);
      expect(tier4.communityMemberPrice).toBe(240);
      expect(tier4.branchMemberPerSession).toBe(55);
      expect(tier4.communityMemberPerSession).toBe(60);

      // 8 sessions: $440 branch member ($55/session) | $480 community member ($60/session)
      const tier8 = tiers.find((t) => t.sessions === 8)!;
      expect(tier8.branchMemberPrice).toBe(440);
      expect(tier8.communityMemberPrice).toBe(480);
      expect(tier8.branchMemberPerSession).toBe(55);
      expect(tier8.communityMemberPerSession).toBe(60);

      // 12 sessions: $600 branch member ($50/session) | $720 community member ($60/session)
      const tier12 = tiers.find((t) => t.sessions === 12)!;
      expect(tier12.branchMemberPrice).toBe(600);
      expect(tier12.communityMemberPrice).toBe(720);
      expect(tier12.branchMemberPerSession).toBe(50);
      expect(tier12.communityMemberPerSession).toBe(60);
      expect(tier12.badge).toBe('Best Value');
    });
  });

  describe('Personal Wellness Training (30-Minute)', () => {
    const program30 = WELLNESS_TRAINING_PROGRAMS.find((p) => p.id === 'personal-30');

    it('defines 30-minute duration and express format', () => {
      expect(program30).toBeDefined();
      expect(program30?.durationMinutes).toBe(30);
      expect(program30?.participants).toBe('1-on-1');
    });

    it('matches exact flyer pricing for 1, 4, 8, and 12 sessions', () => {
      const tiers = program30!.tiers;

      // 1 session: $35 branch member | $40 community member
      const tier1 = tiers.find((t) => t.sessions === 1)!;
      expect(tier1.branchMemberPrice).toBe(35);
      expect(tier1.communityMemberPrice).toBe(40);
      expect(tier1.branchMemberPerSession).toBe(35);
      expect(tier1.communityMemberPerSession).toBe(40);

      // 4 sessions: $140 branch member | $160 community member
      const tier4 = tiers.find((t) => t.sessions === 4)!;
      expect(tier4.branchMemberPrice).toBe(140);
      expect(tier4.communityMemberPrice).toBe(160);
      expect(tier4.branchMemberPerSession).toBe(35);
      expect(tier4.communityMemberPerSession).toBe(40);

      // 8 sessions: $280 branch member | $320 community member
      const tier8 = tiers.find((t) => t.sessions === 8)!;
      expect(tier8.branchMemberPrice).toBe(280);
      expect(tier8.communityMemberPrice).toBe(320);
      expect(tier8.branchMemberPerSession).toBe(35);
      expect(tier8.communityMemberPerSession).toBe(40);

      // 12 sessions: $420 branch member | $480 community member
      const tier12 = tiers.find((t) => t.sessions === 12)!;
      expect(tier12.branchMemberPrice).toBe(420);
      expect(tier12.communityMemberPrice).toBe(480);
      expect(tier12.branchMemberPerSession).toBe(35);
      expect(tier12.communityMemberPerSession).toBe(40);
    });
  });

  describe('Partner Wellness Training', () => {
    const programPartner = WELLNESS_TRAINING_PROGRAMS.find((p) => p.id === 'partner');

    it('defines 2 participants format and friend workout tagline', () => {
      expect(programPartner).toBeDefined();
      expect(programPartner?.participants).toBe('2-on-1 (Partner)');
      expect(programPartner?.tagline).toBe('Workout with a friend and one trainer');
    });

    it('matches exact flyer pricing and per-person breakdown', () => {
      const tiers = programPartner!.tiers;

      // 1 session: $90 branch ($45/ea) | $100 community ($50/ea)
      const tier1 = tiers.find((t) => t.sessions === 1)!;
      expect(tier1.branchMemberPrice).toBe(90);
      expect(tier1.communityMemberPrice).toBe(100);
      expect(tier1.branchMemberPerPersonPerSession).toBe(45);
      expect(tier1.communityMemberPerPersonPerSession).toBe(50);

      // 4 sessions: $340 branch ($42.50/ea) | $400 community ($50/ea)
      const tier4 = tiers.find((t) => t.sessions === 4)!;
      expect(tier4.branchMemberPrice).toBe(340);
      expect(tier4.communityMemberPrice).toBe(400);
      expect(tier4.branchMemberPerPersonPerSession).toBe(42.5);
      expect(tier4.communityMemberPerPersonPerSession).toBe(50);

      // 8 sessions: $680 branch ($42.50/ea) | $800 community ($50/ea)
      const tier8 = tiers.find((t) => t.sessions === 8)!;
      expect(tier8.branchMemberPrice).toBe(680);
      expect(tier8.communityMemberPrice).toBe(800);
      expect(tier8.branchMemberPerPersonPerSession).toBe(42.5);
      expect(tier8.communityMemberPerPersonPerSession).toBe(50);

      // 12 sessions: $900 branch ($37.50/ea) | $1,080 community ($45/ea)
      const tier12 = tiers.find((t) => t.sessions === 12)!;
      expect(tier12.branchMemberPrice).toBe(900);
      expect(tier12.communityMemberPrice).toBe(1080);
      expect(tier12.branchMemberPerPersonPerSession).toBe(37.5);
      expect(tier12.communityMemberPerPersonPerSession).toBe(45);
      expect(tier12.badge).toBe('Best Value');
    });
  });

  describe('Calculation Helpers', () => {
    it('calculates member savings accurately across all tiers', () => {
      // 60-min: 12 sessions saves $720 - $600 = $120
      expect(calculateMemberSavings('personal-60', 12)).toBe(120);
      expect(calculateMemberSavings('personal-60', 4)).toBe(20);
      expect(calculateMemberSavings('personal-60', 1)).toBe(5);

      // Partner: 12 sessions saves $1080 - $900 = $180
      expect(calculateMemberSavings('partner', 12)).toBe(180);
      expect(calculateMemberSavings('partner', 4)).toBe(60);

      // Unknown program or session count returns 0
      expect(calculateMemberSavings('personal-60', 99)).toBe(0);
    });

    it('formats price correctly with or without cents', () => {
      expect(formatWellnessPrice(60)).toBe('$60');
      expect(formatWellnessPrice(42.5)).toBe('$42.50');
      expect(formatWellnessPrice(37.5)).toBe('$37.50');
      expect(formatWellnessPrice(1080)).toBe('$1080');
    });
  });
});
