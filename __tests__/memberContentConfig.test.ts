jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyConfigPatch, defaultAppConfig, normalizeAppConfig } from '@/domain/appConfig';
import { DEFAULT_AMENITIES, DEFAULT_BUSY_TIMES, visibleItems } from '@/domain/branchContent';
import { getBusyHours } from '@/domain/busyness';
import { findOpenLapSwimSlots, getPoolSlots, INDOOR_POOL_SLOTS } from '@/domain/poolScheduleData';
import { canEditConfigSection, hasCapability, type ConfigSection } from '@/domain/staffCapabilities';
import { WELLNESS_FEEDBACK_CATEGORIES } from '@/domain/types';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { configRepo } from '@/repositories/configRepo';
import { supportTicketRepo } from '@/repositories/supportTicketRepo';
import { resetStore } from '@/storage/demoStore';
import { copyPoolDay } from '@/domain/poolScheduleEditor';

const api = new MockProtivityAdapter();
const IT = 'staff-itadmin';
const ADMIN = 'staff-admin';
const WELLNESS = 'staff-celine';
const AQUATICS = 'staff-alek';
const FRONT_DESK = 'staff-frontdesk';

const CONTENT: ConfigSection[] = ['about', 'amenities', 'programs', 'busyTimes', 'poolSchedule', 'aquaticsSession'];

beforeEach(async () => {
  await AsyncStorage.clear();
  await resetStore();
});

describe('member content defaults', () => {
  it('fills the new sections from defaults when saved config predates them', () => {
    const cfg = normalizeAppConfig({ branding: { branchName: 'Test Y' } });
    expect(cfg.amenities.map((a) => a.id)).toEqual(DEFAULT_AMENITIES.map((a) => a.id));
    expect(cfg.busyTimes.byDay).toEqual(DEFAULT_BUSY_TIMES.byDay);
    expect(cfg.poolSchedule).toEqual({ facilityNotices: {}, slotOverrides: {} });
    expect(cfg.about.email).toBe('silverspring@ymcadc.org');
  });

  it('keeps busy times identical to the old hard-coded chart', () => {
    expect(getBusyHours(1)).toEqual(getBusyHours(1, defaultAppConfig().busyTimes.byDay));
    expect(getBusyHours(1)[0]).toMatchObject({ hour: 5, value: 45 });
  });
});

describe('member content validation', () => {
  const cfg = defaultAppConfig();

  it('rejects malformed busy times', () => {
    const rows = cfg.busyTimes.byDay;
    expect(() => applyConfigPatch(cfg, 'busyTimes', { byDay: rows.slice(0, 6) })).toThrow('seven days');
    expect(() => applyConfigPatch(cfg, 'busyTimes', { byDay: [rows[0].slice(1), ...rows.slice(1)] })).toThrow('hourly values');
    expect(() => applyConfigPatch(cfg, 'busyTimes', { byDay: [rows[0].map(() => 101), ...rows.slice(1)] })).toThrow('0 to 100');
  });

  it('rejects a bad About email and unknown pool slots', () => {
    expect(() => applyConfigPatch(cfg, 'about', { email: 'not-an-email' })).toThrow('valid contact email');
    expect(() => applyConfigPatch(cfg, 'poolSchedule', { slotOverrides: { 'no-such-slot': { isClosed: true } } })).toThrow(
      'no longer exists'
    );
  });

  it('hides an amenity instead of deleting it', () => {
    const next = applyConfigPatch(
      cfg,
      'amenities',
      cfg.amenities.map((a, i) => (i === 0 ? { ...a, hidden: true } : a))
    );
    expect(next).toHaveLength(cfg.amenities.length);
    expect(visibleItems(next)).toHaveLength(cfg.amenities.length - 1);
  });
});

describe('pool overrides', () => {
  it('closes a slot, zeroes its lanes, and drops it from the lap lane finder', () => {
    const slot = INDOOR_POOL_SLOTS.find((s) => !s.isClosed && s.lapLanes >= 3)!;
    const cfg = { facilityNotices: {}, slotOverrides: { [slot.id]: { isClosed: true, title: 'Repairs', note: 'Back Monday' } } };
    const changed = getPoolSlots('indoor', slot.day, cfg).find((s) => s.id === slot.id)!;
    expect(changed).toMatchObject({ isClosed: true, lapLanes: 0, title: 'Repairs', notes: 'Back Monday' });
    expect(findOpenLapSwimSlots('indoor', 3, cfg).map((s) => s.id)).not.toContain(slot.id);
    expect(findOpenLapSwimSlots('indoor', 3).map((s) => s.id)).toContain(slot.id);
  });
});

describe('who edits member content', () => {
  it('persists recurring pool days for the Aquatics Director and rejects other departments', async () => {
    const schedule = copyPoolDay(defaultAppConfig().poolSchedule, 'indoor', 'monday', ['tuesday', 'thursday']);
    await configRepo.update(api, 'poolSchedule', schedule, AQUATICS);
    const reloaded = await configRepo.get(api);
    expect(reloaded.poolSchedule.weeklyDays).toEqual(schedule.weeklyDays);
    await expect(configRepo.update(api, 'poolSchedule', schedule, WELLNESS)).rejects.toThrow('not permitted');
    await expect(configRepo.update(api, 'poolSchedule', schedule, FRONT_DESK)).rejects.toThrow('not permitted');
  });
  it('lets Staff Admin and IT edit every content section', () => {
    for (const role of ['staff_admin', 'it_admin']) {
      for (const s of CONTENT) expect(canEditConfigSection(role, s)).toBe(true);
    }
  });

  it('limits directors to their area', () => {
    expect(canEditConfigSection('aquatics_director', 'poolSchedule')).toBe(true);
    expect(canEditConfigSection('aquatics_director', 'aquaticsSession')).toBe(true);
    expect(canEditConfigSection('aquatics_director', 'about')).toBe(false);
    expect(canEditConfigSection('membership_director', 'busyTimes')).toBe(true);
    expect(canEditConfigSection('wellness_director', 'programs')).toBe(true);
    expect(canEditConfigSection('wellness_director', 'amenities')).toBe(false);
    for (const s of CONTENT) expect(canEditConfigSection('desk', s)).toBe(false);
  });

  it('enforces the same rules when saving', async () => {
    await expect(configRepo.update(api, 'poolSchedule', { facilityNotices: { indoor: 'Lanes 5-6 closed' } }, AQUATICS)).resolves.toBeTruthy();
    await expect(configRepo.update(api, 'about', { association: 'X' }, AQUATICS)).rejects.toThrow('not permitted');
    await expect(configRepo.update(api, 'about', { association: 'YMCA DC' }, ADMIN)).resolves.toMatchObject({
      about: expect.objectContaining({ association: 'YMCA DC' }),
    });
  });
});

describe('admin feedback access', () => {
  it('gives the support ticket inbox to Staff Admin and IT only', () => {
    expect(hasCapability('staff_admin', 'manageSupportTickets')).toBe(true);
    expect(hasCapability('it_admin', 'manageSupportTickets')).toBe(true);
    expect(hasCapability('wellness_director', 'manageSupportTickets')).toBe(false);
    expect(hasCapability('desk', 'manageSupportTickets')).toBe(false);
  });

  it('keeps the Wellness Director on wellness complaints only', () => {
    expect(hasCapability('wellness_director', 'manageComplaints')).toBe(false);
    expect(hasCapability('wellness_director', 'manageWellnessComplaints')).toBe(true);
    expect(WELLNESS_FEEDBACK_CATEGORIES).toContain('wellness_training');
  });

  it('checks the requester when listing or updating every ticket', async () => {
    const { ticket } = await supportTicketRepo.createTicket(api, {
      userId: 'member-jordan',
      userName: 'Jordan Hale',
      userEmail: 'jordan@silverspring.ymca',
      userRole: 'member',
      type: 'problem_report',
      title: 'Card will not scan',
      description: 'The barcode is blank',
      category: 'app_bug',
      priority: 'normal',
    });
    await expect(supportTicketRepo.listAllTickets(api, FRONT_DESK)).rejects.toThrow('not permitted');
    await expect(supportTicketRepo.listAllTickets(api, WELLNESS)).rejects.toThrow('not permitted');
    await expect(supportTicketRepo.listAllTickets(api, ADMIN)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ticket.id })])
    );
    await expect(supportTicketRepo.updateStatus(api, ticket.id, 'resolved', FRONT_DESK)).rejects.toThrow('not permitted');
    await expect(supportTicketRepo.updateStatus(api, ticket.id, 'resolved', IT)).resolves.toMatchObject({ status: 'resolved' });
    // The member still sees their own tickets without a staff check.
    await expect(supportTicketRepo.listUserTickets(api, 'member-jordan')).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ticket.id })])
    );
  });
});
