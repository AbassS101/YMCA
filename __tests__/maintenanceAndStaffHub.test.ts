jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { coachDiscipline, splitCoachesByDiscipline } from '@/domain/availabilityAccess';
import {
  ageLabel,
  filterMaintenanceQueue,
  sortMaintenanceQueue,
  summarizeMaintenance,
  ticketSource,
} from '@/domain/maintenanceTickets';
import { capabilitiesForRole, hasCapability, personaForRole } from '@/domain/staffCapabilities';
import type { ComplaintSuggestion, Staff } from '@/domain/types';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { complaintSuggestionRepo } from '@/repositories/complaintSuggestionRepo';
import { resetStore } from '@/storage/demoStore';

const coach = (id: string, staffRole: Staff['staffRole'], lessonTypes?: Staff['lessonTypes']) => ({ id, staffRole, lessonTypes });

describe('coach schedule split', () => {
  it('classifies by lesson types, then by role', () => {
    expect(coachDiscipline(coach('a', 'trainer', ['training']))).toBe('training');
    expect(coachDiscipline(coach('b', 'swim_instructor', ['swim']))).toBe('swim');
    expect(coachDiscipline(coach('c', 'swim_instructor'))).toBe('swim');
    expect(coachDiscipline(coach('d', 'aquatics_director'))).toBe('swim');
    expect(coachDiscipline(coach('e', 'wellness_director'))).toBe('training');
    expect(coachDiscipline(coach('f', undefined))).toBe('training');
    expect(coachDiscipline(coach('g', 'trainer', ['training', 'swim']))).toBe('training');
  });

  it('splits a roster into trainers and swim instructors and keeps order', () => {
    const roster = [coach('pt1', 'trainer', ['training']), coach('sw1', 'swim_instructor', ['swim']), coach('pt2', 'wellness_director'), coach('sw2', 'aquatics_director', ['swim'])];
    const { trainers, swim } = splitCoachesByDiscipline(roster);
    expect(trainers.map((c) => c.id)).toEqual(['pt1', 'pt2']);
    expect(swim.map((c) => c.id)).toEqual(['sw1', 'sw2']);
  });
});

describe('maintenance role', () => {
  it('has its own persona and only the maintenance and broadcast capabilities', () => {
    expect(personaForRole('maintenance')).toBe('maintenance');
    expect([...capabilitiesForRole('maintenance')].sort()).toEqual(['broadcast', 'manageMaintenance']);
  });

  it('keeps the queue away from trainers, swim instructors and the front desk', () => {
    for (const role of ['trainer', 'swim_instructor', 'desk', 'staff', 'membership_director', 'wellness_director']) {
      expect(hasCapability(role, 'manageMaintenance')).toBe(false);
    }
    expect(hasCapability('staff_admin', 'manageMaintenance')).toBe(true);
    expect(hasCapability('it_admin', 'manageMaintenance')).toBe(true);
  });
});

const ticket = (over: Partial<ComplaintSuggestion>): ComplaintSuggestion => ({
  id: 't',
  type: 'complaint',
  title: 't',
  details: 'details here',
  category: 'maint_other',
  branchId: 'silver-spring',
  department: 'maintenance',
  status: 'submitted',
  createdAt: '2026-10-10T12:00:00Z',
  ...over,
});

describe('maintenance queue helpers', () => {
  const now = new Date('2026-10-14T12:00:00Z');
  const items = [
    ticket({ id: 'old', createdAt: '2026-10-08T12:00:00Z' }),
    ticket({ id: 'new', createdAt: '2026-10-13T12:00:00Z' }),
    ticket({ id: 'urgent', urgency: 'urgent', createdAt: '2026-10-12T12:00:00Z' }),
    ticket({ id: 'done', status: 'resolved', createdAt: '2026-10-01T12:00:00Z', updatedAt: '2026-10-12T12:00:00Z' }),
    ticket({ id: 'staff', submittedByStaffId: 'staff-sarah', submittedByStaffName: 'Jane', createdAt: '2026-10-11T12:00:00Z' }),
  ];

  it('sorts urgent first, then oldest, resolved last', () => {
    expect(sortMaintenanceQueue(items).map((i) => i.id)).toEqual(['urgent', 'old', 'staff', 'new', 'done']);
  });

  it('filters by status and by who filed it', () => {
    expect(filterMaintenanceQueue(items, 'urgent').map((i) => i.id)).toEqual(['urgent']);
    expect(filterMaintenanceQueue(items, 'resolved').map((i) => i.id)).toEqual(['done']);
    expect(filterMaintenanceQueue(items, 'open', 'staff').map((i) => i.id)).toEqual(['staff']);
    expect(ticketSource(items[4])).toBe('staff');
    expect(ticketSource(items[0])).toBe('member');
  });

  it('summarizes open, urgent and resolved-this-week counts', () => {
    const s = summarizeMaintenance(items, now);
    expect(s.open).toBe(4);
    expect(s.urgent).toBe(1);
    expect(s.resolvedThisWeek).toBe(1);
    expect(s.avgOpenAgeDays).toBeGreaterThan(0);
    expect(summarizeMaintenance([], now).avgOpenAgeDays).toBe(0);
  });

  it('labels ticket age', () => {
    expect(ageLabel('2026-10-14T11:30:00Z', now)).toBe('30m ago');
    expect(ageLabel('2026-10-14T06:00:00Z', now)).toBe('6h ago');
    expect(ageLabel('2026-10-11T12:00:00Z', now)).toBe('3d ago');
  });
});

describe('maintenance tickets in the store', () => {
  let adapter: MockProtivityAdapter;

  beforeEach(async () => {
    await resetStore();
    adapter = new MockProtivityAdapter();
  });

  it('keeps maintenance tickets out of the default member-services list', async () => {
    const services = await complaintSuggestionRepo.list(adapter, 'silver-spring');
    expect(services.some((i) => i.department === 'maintenance')).toBe(false);
    const maint = await complaintSuggestionRepo.list(adapter, 'silver-spring', undefined, 'maintenance');
    expect(maint.length).toBeGreaterThanOrEqual(4);
    expect(maint.every((i) => i.department === 'maintenance')).toBe(true);
    const all = await complaintSuggestionRepo.list(adapter, 'silver-spring', undefined, 'all');
    expect(all.length).toBe(services.length + maint.length);
  });

  it('lets a member file a maintenance report and notifies the maintenance lead', async () => {
    const created = await complaintSuggestionRepo.create(adapter, {
      type: 'complaint',
      category: 'maint_plumbing',
      title: 'Shower 3 has no hot water',
      details: 'No hot water in shower 3 since this morning.',
      branchId: 'silver-spring',
      department: 'maintenance',
      urgency: 'normal',
      location: "Men's locker room",
      memberId: 'member-jordan',
      isAnonymous: false,
    });
    expect(created.status).toBe('submitted');
    const mine = await complaintSuggestionRepo.list(adapter, 'silver-spring', 'member-jordan', 'maintenance');
    expect(mine.map((i) => i.id)).toContain(created.id);
    const notes = await adapter.listNotifications('staff-maint');
    expect(notes.some((n) => n.title.includes('Shower 3'))).toBe(true);
  });

  it('files staff reports under the staff member and alerts admins when urgent', async () => {
    const created = await complaintSuggestionRepo.create(adapter, {
      type: 'complaint',
      category: 'maint_safety',
      title: 'Broken tile on pool deck',
      details: 'A cracked tile is sharp near lane 2.',
      branchId: 'silver-spring',
      department: 'maintenance',
      urgency: 'urgent',
      submittedByStaffId: 'staff-sarah',
      submittedByStaffName: 'Jane Doe',
    });
    const byStaff = await complaintSuggestionRepo.listMaintenanceByStaff(adapter, 'silver-spring', 'staff-sarah');
    expect(byStaff.map((i) => i.id)).toContain(created.id);
    const none = await complaintSuggestionRepo.listMaintenanceByStaff(adapter, 'silver-spring', 'staff-alex');
    expect(none.map((i) => i.id)).not.toContain(created.id);
    const admin = await adapter.listNotifications('staff-admin');
    expect(admin.some((n) => n.title.startsWith('URGENT maintenance report'))).toBe(true);
  });

  it('lets maintenance reply and resolve', async () => {
    const [first] = await complaintSuggestionRepo.list(adapter, 'silver-spring', undefined, 'maintenance');
    const updated = await complaintSuggestionRepo.updateStatus(adapter, first.id, 'resolved', 'Fixed.', 'staff-maint', 'Marcus');
    expect(updated.status).toBe('resolved');
    expect(updated.staffResponse).toBe('Fixed.');
  });

  it('seeds a maintenance staff account that can sign in', async () => {
    const session = await adapter.login('maintenance@silverspring.ymca', 'ymca-demo');
    expect(session.role).toBe('maintenance');
    expect(session.userId).toBe('staff-maint');
  });
});
