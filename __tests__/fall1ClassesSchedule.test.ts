jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { resetStore } from '@/storage/demoStore';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import { registrationRepo } from '@/repositories/registrationRepo';
import { savedClassesRepo } from '@/repositories/savedClassesRepo';
import { notificationRepo } from '@/repositories/notificationRepo';
import {
  YMCA_CLASS_CATALOG,
  getClassCatalogEntry,
  getClassShortSummary,
  getClassFullDescription,
  requiresAdvanceRegistration,
} from '@/domain/classCatalog';
import {
  buildGoogleCalendarUrl,
  buildIcsContent,
  toIcsTimestamp,
} from '@/utils/calendarExport';

describe('Official YMCA Silver Spring Fall 1 Group Exercise Schedule', () => {
  let adapter: MockProtivityAdapter;

  beforeEach(async () => {
    await AsyncStorage.clear();
    await resetStore();
    adapter = new MockProtivityAdapter();
  });

  describe('Monday Schedule Accuracy (Aug 24 - Nov 11)', () => {
    it('contains all official Monday classes with exact times, instructors, and locations', async () => {
      const mondayClasses = await scheduleRepo.list(adapter, {
        branchId: 'silver-spring',
        from: '2026-09-14',
        to: '2026-09-14',
      });

      expect(mondayClasses.length).toBeGreaterThanOrEqual(12);

      // 7:00am–7:30am Express Core (Chris, Gym)
      const core = mondayClasses.find((c) => c.title === 'Express Core' && c.start.includes('07:00'));
      expect(core).toBeDefined();
      expect(core?.instructorName).toBe('Chris');
      expect(core?.location).toBe('Gym');

      // 7:45am–8:45am Full Circle Health (Ryanne, Free Weight 2, Registration Required)
      const fullCircle = mondayClasses.find((c) => c.title === 'Full Circle Health');
      expect(fullCircle).toBeDefined();
      expect(fullCircle?.instructorName).toBe('Ryanne');
      expect(fullCircle?.location).toBe('Free Weight 2');
      expect(fullCircle?.registrationRequired).toBe(true);

      // 8:00am–9:00am Qigong (Bob, Gym)
      const qigong = mondayClasses.find((c) => c.title === 'Qigong');
      expect(qigong).toBeDefined();
      expect(qigong?.instructorName).toBe('Bob');
      expect(qigong?.location).toBe('Gym');

      // 9:00am–10:00am Iyengar Yoga (Dian, Studio)
      const iyengar = mondayClasses.find((c) => c.title === 'Iyengar Yoga');
      expect(iyengar).toBeDefined();
      expect(iyengar?.instructorName).toBe('Dian');
      expect(iyengar?.location).toBe('Studio');

      // 9:00am–9:45am Deep Water Aerobics (Cherry, Indoor Pool)
      const deepWater1 = mondayClasses.find((c) => c.title === 'Deep Water Aerobics' && c.start.includes('09:00'));
      expect(deepWater1).toBeDefined();
      expect(deepWater1?.instructorName).toBe('Cherry');
      expect(deepWater1?.location).toBe('Indoor Pool');

      // 9:15am–10:15am Tai Chi (Bob, Gym)
      const taiChi = mondayClasses.find((c) => c.title === 'Tai Chi' && c.start.includes('09:15'));
      expect(taiChi).toBeDefined();
      expect(taiChi?.instructorName).toBe('Bob');
      expect(taiChi?.location).toBe('Gym');

      // 10:00am–10:45am Deep Water Aerobics (Cherry, Indoor Pool)
      const deepWater2 = mondayClasses.find((c) => c.title === 'Deep Water Aerobics' && c.start.includes('10:00'));
      expect(deepWater2).toBeDefined();
      expect(deepWater2?.instructorName).toBe('Cherry');
      expect(deepWater2?.location).toBe('Indoor Pool');

      // 10:15am–11:15am Cardiolite (Sue, Gym)
      const cardiolite = mondayClasses.find((c) => c.title === 'Cardiolite');
      expect(cardiolite).toBeDefined();
      expect(cardiolite?.instructorName).toBe('Sue');
      expect(cardiolite?.location).toBe('Gym');

      // 11:30am–12:15pm Strength & Balance (Jill, Gym)
      const strength = mondayClasses.find((c) => c.title === 'Strength & Balance' && c.start.includes('11:30'));
      expect(strength).toBeDefined();
      expect(strength?.instructorName).toBe('Jill');
      expect(strength?.location).toBe('Gym');

      // 5:00pm–5:45pm Cycle (Tayah, Gym)
      const cycle = mondayClasses.find((c) => c.title === 'Cycle' && c.start.includes('17:00'));
      expect(cycle).toBeDefined();
      expect(cycle?.instructorName).toBe('Tayah');
      expect(cycle?.location).toBe('Gym');

      // 6:00pm–7:00pm BodyPump (Gym)
      const bodyPump = mondayClasses.find((c) => c.title === 'BodyPump' && c.start.includes('18:00'));
      expect(bodyPump).toBeDefined();
      expect(bodyPump?.location).toBe('Gym');

      // 6:00pm–7:00pm BodyBalance (Jennifer, Studio)
      const bodyBalance = mondayClasses.find((c) => c.title === 'BodyBalance' && c.start.includes('18:00'));
      expect(bodyBalance).toBeDefined();
      expect(bodyBalance?.instructorName).toBe('Jennifer');
      expect(bodyBalance?.location).toBe('Studio');
    });
  });

  describe('Tuesday Schedule Accuracy (Aug 24 - Nov 11)', () => {
    it('contains all official Tuesday classes with exact times, instructors, and locations', async () => {
      const tuesdayClasses = await scheduleRepo.list(adapter, {
        branchId: 'silver-spring',
        from: '2026-09-15',
        to: '2026-09-15',
      });

      // 6:00am–6:45am BodyPump (Sarah, Gym)
      const bp = tuesdayClasses.find((c) => c.title === 'BodyPump' && c.start.includes('06:00'));
      expect(bp).toBeDefined();
      expect(bp?.instructorName).toBe('Jane Doe');
      expect(bp?.location).toBe('Gym');

      // 7:00am–8:00am Vinyasa Flow Yoga (Jim, Gym)
      const vinyasa = tuesdayClasses.find((c) => c.title === 'Vinyasa Flow Yoga' && c.start.includes('07:00'));
      expect(vinyasa).toBeDefined();
      expect(vinyasa?.instructorName).toBe('Jim');
      expect(vinyasa?.location).toBe('Gym');

      // 8:30am–9:30am Pedaling for Parkinsons (Chris, Gym, Registration Required)
      const parkinsons = tuesdayClasses.find((c) => c.title === 'Pedaling for Parkinsons');
      expect(parkinsons).toBeDefined();
      expect(parkinsons?.instructorName).toBe('Chris');
      expect(parkinsons?.location).toBe('Gym');
      expect(parkinsons?.registrationRequired).toBe(true);

      // 9:00am–9:45am Shallow Water Aerobics (Sandy, Indoor Pool)
      const shallow1 = tuesdayClasses.find((c) => c.title === 'Shallow Water Aerobics' && c.start.includes('09:00'));
      expect(shallow1).toBeDefined();
      expect(shallow1?.instructorName).toBe('Sandy');
      expect(shallow1?.location).toBe('Indoor Pool');

      // 9:30am–10:30am Iron Warriors (Celine, Free Weight 2)
      const iron = tuesdayClasses.find((c) => c.title === 'Iron Warriors');
      expect(iron).toBeDefined();
      expect(iron?.instructorName).toBe('Celine');
      expect(iron?.location).toBe('Free Weight 2');

      // 10:00am–10:45am Shallow Water Aerobics (Sandy, Indoor Pool)
      const shallow2 = tuesdayClasses.find((c) => c.title === 'Shallow Water Aerobics' && c.start.includes('10:00'));
      expect(shallow2).toBeDefined();
      expect(shallow2?.instructorName).toBe('Sandy');
      expect(shallow2?.location).toBe('Indoor Pool');

      // 11:00am–12:00pm Y-Fusion Dance (Sue, Gym)
      const yfusion = tuesdayClasses.find((c) => c.title === 'Y-Fusion Dance');
      expect(yfusion).toBeDefined();
      expect(yfusion?.instructorName).toBe('Sue');
      expect(yfusion?.location).toBe('Gym');

      // 1:00pm–2:30pm Small Group Training (Staff, Studio/Circuit Room, Registration Required)
      const smallGroup = tuesdayClasses.find((c) => c.title === 'Small Group Training');
      expect(smallGroup).toBeDefined();
      expect(smallGroup?.location).toBe('Studio/Circuit Room');
      expect(smallGroup?.registrationRequired).toBe(true);

      // 5:00pm–5:45pm Mat Pilates (Mikayla, Gym)
      const pilates = tuesdayClasses.find((c) => c.title === 'Mat Pilates');
      expect(pilates).toBeDefined();
      expect(pilates?.instructorName).toBe('Mikayla');
      expect(pilates?.location).toBe('Gym');

      // 6:00pm–7:00pm Vinyasa Flow Yoga (Lisa, Studio)
      const vinyasaEvening = tuesdayClasses.find((c) => c.title === 'Vinyasa Flow Yoga' && c.start.includes('18:00'));
      expect(vinyasaEvening).toBeDefined();
      expect(vinyasaEvening?.instructorName).toBe('Lisa');
      expect(vinyasaEvening?.location).toBe('Studio');

      // 6:15pm–7:15pm Zumba (Katherine, Gym)
      const zumba = tuesdayClasses.find((c) => c.title === 'Zumba');
      expect(zumba).toBeDefined();
      expect(zumba?.instructorName).toBe('Katherine');
      expect(zumba?.location).toBe('Gym');
    });
  });

  describe('Wednesday Schedule Accuracy (Aug 24 - Nov 11)', () => {
    it('contains all official Wednesday classes with exact times, instructors, and locations', async () => {
      const wednesdayClasses = await scheduleRepo.list(adapter, {
        branchId: 'silver-spring',
        from: '2026-09-16',
        to: '2026-09-16',
      });

      // 6:00am–6:45am HEAT (Simone, Gym)
      const heat = wednesdayClasses.find((c) => c.title === 'HEAT');
      expect(heat).toBeDefined();
      expect(heat?.instructorName).toBe('Simone');
      expect(heat?.location).toBe('Gym');

      // 7:00am–7:30am Express Core (Chris, Gym)
      const core = wednesdayClasses.find((c) => c.title === 'Express Core' && c.start.includes('07:00'));
      expect(core).toBeDefined();
      expect(core?.instructorName).toBe('Chris');
      expect(core?.location).toBe('Gym');

      // 7:30am–8:30am CoreFusion (Sarah, Studio)
      const coreFusion = wednesdayClasses.find((c) => c.title === 'CoreFusion');
      expect(coreFusion).toBeDefined();
      expect(coreFusion?.instructorName).toBe('Jane Doe');
      expect(coreFusion?.location).toBe('Studio');

      // 7:45am–8:45am Cardiolite (Sue, Gym)
      const cardiolite = wednesdayClasses.find((c) => c.title === 'Cardiolite');
      expect(cardiolite).toBeDefined();
      expect(cardiolite?.instructorName).toBe('Sue');
      expect(cardiolite?.location).toBe('Gym');

      // 9:00am–10:00am Yoga 101 (Danielle, Gym)
      const yoga101 = wednesdayClasses.find((c) => c.title === 'Yoga 101');
      expect(yoga101).toBeDefined();
      expect(yoga101?.instructorName).toBe('Danielle');
      expect(yoga101?.location).toBe('Gym');

      // 9:00am–9:45am Deep Water Aerobics (Cherry, Indoor Pool)
      const deepWater1 = wednesdayClasses.find((c) => c.title === 'Deep Water Aerobics' && c.start.includes('09:00'));
      expect(deepWater1).toBeDefined();
      expect(deepWater1?.instructorName).toBe('Cherry');
      expect(deepWater1?.location).toBe('Indoor Pool');

      // 9:15am–10:15am Tai Chi (Bob, Studio)
      const taiChi = wednesdayClasses.find((c) => c.title === 'Tai Chi');
      expect(taiChi).toBeDefined();
      expect(taiChi?.instructorName).toBe('Bob');
      expect(taiChi?.location).toBe('Studio');

      // 10:00am–10:45am Deep Water Aerobics (Cherry, Indoor Pool)
      const deepWater2 = wednesdayClasses.find((c) => c.title === 'Deep Water Aerobics' && c.start.includes('10:00'));
      expect(deepWater2).toBeDefined();
      expect(deepWater2?.instructorName).toBe('Cherry');
      expect(deepWater2?.location).toBe('Indoor Pool');

      // 10:15am–11:00am Burn (Schuyler, Gym)
      const burn = wednesdayClasses.find((c) => c.title === 'Burn');
      expect(burn).toBeDefined();
      expect(burn?.instructorName).toBe('Schuyler');
      expect(burn?.location).toBe('Gym');

      // 11:30am–12:15pm Strength & Balance (Simone, Gym)
      const strength = wednesdayClasses.find((c) => c.title === 'Strength & Balance' && c.start.includes('11:30'));
      expect(strength).toBeDefined();
      expect(strength?.instructorName).toBe('Simone');
      expect(strength?.location).toBe('Gym');

      // 12:30pm–1:30pm Aqua Arthritis (Carol, Indoor Pool)
      const aquaArthritis = wednesdayClasses.find((c) => c.title.includes('Aqua Arthritis'));
      expect(aquaArthritis).toBeDefined();
      expect(aquaArthritis?.instructorName).toBe('Carol');
      expect(aquaArthritis?.location).toBe('Indoor Pool');

      // 6:00pm–7:00pm BodyPump (Sandrine, Gym)
      const bodyPump = wednesdayClasses.find((c) => c.title === 'BodyPump' && c.start.includes('18:00'));
      expect(bodyPump).toBeDefined();
      expect(bodyPump?.instructorName).toBe('Sandrine');
      expect(bodyPump?.location).toBe('Gym');

      // 6:00pm–7:00pm Full Circle Health (Jill, Free Weight 2, Registration Required)
      const fullCircle = wednesdayClasses.find((c) => c.title === 'Full Circle Health' && c.start.includes('18:00'));
      expect(fullCircle).toBeDefined();
      expect(fullCircle?.instructorName).toBe('Jill');
      expect(fullCircle?.location).toBe('Free Weight 2');
      expect(fullCircle?.registrationRequired).toBe(true);

      // 6:15pm–7:15pm Vinyasa Flow Yoga (Anne, Studio)
      const vinyasa = wednesdayClasses.find((c) => c.title === 'Vinyasa Flow Yoga' && c.start.includes('18:15'));
      expect(vinyasa).toBeDefined();
      expect(vinyasa?.instructorName).toBe('Anne');
      expect(vinyasa?.location).toBe('Studio');

      // 7:15pm–8:00pm Total Body Conditioning (Jill, Gym)
      const totalBody = wednesdayClasses.find((c) => c.title === 'Total Body Conditioning');
      expect(totalBody).toBeDefined();
      expect(totalBody?.instructorName).toBe('Jill');
      expect(totalBody?.location).toBe('Gym');
    });
  });

  describe('Official YMCA Class Descriptions & Short Schedule Summaries', () => {
    it('contains all 25+ official YMCA class catalog entries from the Mind-Body, Cardio, and Strength PDF', () => {
      const pdfTitles = [
        'All Levels Yoga',
        'Ashtanga Flow',
        'BodyBalance',
        'CoreFusion',
        'Core Power Yoga',
        'Hatha Yoga',
        'Iyengar Yoga',
        'Qigong',
        'Rocket Yoga',
        'Tai Chi',
        'Yoga 101',
        'Vinyasa Flow Yoga',
        'Aqua Aerobics',
        'BodyPump',
        'Burn',
        'Cardiolite',
        'Cycle',
        'Y-Fusion Dance',
        'Zumba',
        'Barre',
        'Body Weight Training',
        'Express Core',
        'Iron Warriors',
        'Strength & Balance',
        'Total Body Conditioning',
      ];

      expect(YMCA_CLASS_CATALOG.length).toBeGreaterThanOrEqual(25);
      for (const title of pdfTitles) {
        const entry = getClassCatalogEntry(title);
        expect(entry).toBeDefined();
        expect(entry?.shortSummary.length).toBeGreaterThan(15);
        expect(entry?.shortSummary.length).toBeLessThanOrEqual(140);
        expect(entry?.description.length).toBeGreaterThanOrEqual(entry!.shortSummary.length);
      }
    });

    it('enriches every schedule item with a concise shortSummary and full description', async () => {
      const allClasses = await scheduleRepo.listAll(adapter, 'silver-spring');
      expect(allClasses.length).toBeGreaterThan(0);

      for (const item of allClasses) {
        const shortSummary = getClassShortSummary(item);
        const fullDesc = getClassFullDescription(item);
        expect(shortSummary.length).toBeGreaterThan(10);
        expect(fullDesc.length).toBeGreaterThan(20);
      }
    });

    it('distinguishes advance-registration classes from drop-in star-only classes', async () => {
      const mondayClasses = await scheduleRepo.list(adapter, {
        branchId: 'silver-spring',
        from: '2026-09-14',
        to: '2026-09-14',
      });

      const fullCircle = mondayClasses.find((c) => c.title === 'Full Circle Health')!;
      const bodyPump = mondayClasses.find((c) => c.title === 'BodyPump')!;

      expect(requiresAdvanceRegistration(fullCircle)).toBe(true);
      expect(requiresAdvanceRegistration(bodyPump)).toBe(false);

      const allClasses = await scheduleRepo.listAll(adapter, 'silver-spring');
      for (const cls of allClasses) {
        expect(requiresAdvanceRegistration(cls)).toBe(Boolean(cls.registrationRequired));
      }
    });
  });

  describe('Calendar Export (.ICS & Google Calendar)', () => {
    it('generates valid RFC 5545 .ics calendar invite content and Google Calendar URLs', () => {
      const event = {
        title: 'BodyPump',
        startIso: '2026-09-14T18:00:00-04:00',
        endIso: '2026-09-14T19:00:00-04:00',
        location: 'Gym',
        description: 'Barbell resistance training for total body strength.',
        instructorName: 'Alex Rivera',
      };

      const stamp = toIcsTimestamp(event.startIso);
      expect(stamp).toMatch(/^\d{8}T\d{6}Z$/);

      const ics = buildIcsContent(event);
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('SUMMARY:YMCA: BodyPump');
      expect(ics).toContain('LOCATION:YMCA Silver Spring (Gym)');
      expect(ics).toContain('Instructor: Alex Rivera');
      expect(ics).toContain('BEGIN:VALARM');
      expect(ics).toContain('END:VCALENDAR');

      const gcalUrl = buildGoogleCalendarUrl(event);
      expect(gcalUrl).toContain('https://calendar.google.com/calendar/render?');
      expect(gcalUrl).toContain('action=TEMPLATE');
      expect(gcalUrl).toContain('BodyPump');
    });
  });

  describe('Member Booking & Star-to-Notify Workflow', () => {
    it('allows member to register for a Registration Required class and verify booking', async () => {
      const reg = await registrationRepo.register(adapter, 'member-jordan', 'sched-mon-fullcircle-0745');
      expect(reg.id).toBeDefined();
      expect(reg.status).toBe('registered');

      const mine = await registrationRepo.listMine(adapter, 'member-jordan');
      expect(mine.some((r) => r.scheduleItemId === 'sched-mon-fullcircle-0745')).toBe(true);
    });

    it('creates an in-app notification reminder when starring a drop-in class and removes it when unstarred', async () => {
      const isSaved = await savedClassesRepo.toggle('member-jordan', 'sched-tue-zumba-1815');
      expect(isSaved).toBe(true);

      let saved = await savedClassesRepo.list('member-jordan');
      expect(saved.some((s) => s.scheduleItemId === 'sched-tue-zumba-1815')).toBe(true);

      let notifs = await notificationRepo.list(adapter, 'member-jordan');
      const starNotif = notifs.find((n) => n.id === 'notif-star-member-jordan-sched-tue-zumba-1815');
      expect(starNotif).toBeDefined();
      expect(starNotif?.title).toContain('Class saved: Zumba');
      expect(starNotif?.body).toContain('You will be notified when this class is happening!');

      const unSaved = await savedClassesRepo.toggle('member-jordan', 'sched-tue-zumba-1815');
      expect(unSaved).toBe(false);

      saved = await savedClassesRepo.list('member-jordan');
      expect(saved.some((s) => s.scheduleItemId === 'sched-tue-zumba-1815')).toBe(false);

      notifs = await notificationRepo.list(adapter, 'member-jordan');
      expect(notifs.some((n) => n.id === 'notif-star-member-jordan-sched-tue-zumba-1815')).toBe(false);
    });
  });
});


