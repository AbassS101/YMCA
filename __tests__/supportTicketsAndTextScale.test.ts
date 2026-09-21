jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { supportTicketRepo } from '@/repositories/supportTicketRepo';
import { notificationRepo } from '@/repositories/notificationRepo';
import { messageRepo } from '@/repositories/messageRepo';
import { resetStore } from '@/storage/demoStore';
import {
  extractMentionQuery,
  applyMentionToText,
  DEFAULT_MENTION_CANDIDATES,
} from '@/components/MentionAutocomplete';

describe('Support Ticket System, IT Chat & Mention Autocomplete', () => {
  let adapter: MockProtivityAdapter;

  beforeEach(async () => {
    await AsyncStorage.clear();
    await resetStore();
    adapter = new MockProtivityAdapter();
  });

  describe('1. Support Ticket Creation & Automatic IT Chat Linking', () => {
    it('creates a feature request ticket, creates IT thread, and generates automated IT acknowledgment', async () => {
      const result = await supportTicketRepo.createTicket(adapter, {
        userId: 'member-jordan',
        userName: 'Jordan Hale',
        userEmail: 'jordan@silverspring.ymca',
        userRole: 'member',
        type: 'feature_request',
        title: 'Barcode scan shortcut on home lock screen',
        description: 'Need a lock screen widget for one-tap pool check-in',
        category: 'feature_idea',
        priority: 'normal',
        deviceInfo: 'iOS 18 · Text Scale: Larger',
      });

      expect(result.ticket).toBeDefined();
      expect(result.ticket.ticketNumber).toMatch(/^YMCA-IT-\d+$/);
      expect(result.ticket.status).toBe('open');
      expect(result.ticket.title).toBe('Barcode scan shortcut on home lock screen');
      expect(result.ticket.category).toBe('feature_idea');
      expect(result.ticket.threadId).toBeDefined();

      // Check thread messages
      const messages = await messageRepo.listMessages(adapter, result.thread.id);
      expect(messages.length).toBeGreaterThanOrEqual(2);

      // Message 1 from user
      const userMsg = messages[0];
      expect(userMsg.fromId).toBe('member-jordan');
      expect(userMsg.body).toContain(result.ticket.ticketNumber);
      expect(userMsg.body).toContain('Barcode scan shortcut');

      // Message 2 automated reply from IT Admin David Chen
      const itMsg = messages[1];
      expect(itMsg.fromId).toBe('staff-itadmin');
      expect(itMsg.body).toContain('David Chen');
      expect(itMsg.body).toContain('YMCA IT Systems');
      expect(itMsg.body).toContain(result.ticket.ticketNumber);

      // Check user received in-app notification
      const notifs = await notificationRepo.list(adapter, 'member-jordan');
      const ticketNotif = notifs.find((n) => n.title.includes(result.ticket.ticketNumber));
      expect(ticketNotif).toBeDefined();
      expect(ticketNotif?.body).toContain('David Chen from YMCA IT responded');
    });

    it('creates a problem report ticket with high priority', async () => {
      const result = await supportTicketRepo.createTicket(adapter, {
        userId: 'staff-alex',
        userName: 'Alex Rivera',
        userEmail: 'alex@silverspring.ymca',
        userRole: 'trainer',
        type: 'problem_report',
        title: 'Studio A microphone audio disconnect',
        description: 'Bluetooth mic cut out during 10am BodyPump class',
        category: 'facility_tech',
        priority: 'high',
      });

      expect(result.ticket.type).toBe('problem_report');
      expect(result.ticket.priority).toBe('high');
      expect(result.ticket.category).toBe('facility_tech');
      expect(result.ticket.userId).toBe('staff-alex');

      const messages = await messageRepo.listMessages(adapter, result.thread.id);
      expect(messages[0].body).toContain('Priority: HIGH');
      expect(messages[1].body).toContain('HIGH priority');
    });

    it('lists user tickets and updates ticket status', async () => {
      const ticket1 = (
        await supportTicketRepo.createTicket(adapter, {
          userId: 'member-jordan',
          userName: 'Jordan Hale',
          userEmail: 'jordan@silverspring.ymca',
          userRole: 'member',
          type: 'feature_request',
          title: 'Idea 1',
          description: 'Description 1',
          category: 'feature_idea',
          priority: 'normal',
        })
      ).ticket;

      const userTickets = await supportTicketRepo.listUserTickets(adapter, 'member-jordan');
      expect(userTickets.some((t) => t.id === ticket1.id)).toBe(true);

      // Transition status to in_progress
      const updated = await supportTicketRepo.updateStatus(adapter, ticket1.id, 'in_progress');
      expect(updated.status).toBe('in_progress');

      // Transition to resolved
      const resolved = await supportTicketRepo.updateStatus(adapter, ticket1.id, 'resolved');
      expect(resolved.status).toBe('resolved');

      const fetched = await supportTicketRepo.getTicket(adapter, ticket1.id);
      expect(fetched?.status).toBe('resolved');
    });
  });

  describe('2. Discord-Style @ Mention Extraction & Auto-Completion', () => {
    it('extracts mention queries from string inputs', () => {
      expect(extractMentionQuery('@')).toBe('');
      expect(extractMentionQuery('Hello @')).toBe('');
      expect(extractMentionQuery('Hello @alex')).toBe('alex');
      expect(extractMentionQuery('Hey @All Staff')).toBe('All Staff');
      expect(extractMentionQuery('no mention here')).toBeNull();
      expect(extractMentionQuery('contact us at info@ymca.org')).toBeNull();
    });

    it('replaces active mention query with completed tag and trailing space', () => {
      const original = 'Can someone at @all';
      const applied = applyMentionToText(original, 'All Staff Desk');
      expect(applied).toBe('Can someone at @All Staff Desk ');

      const solo = '@';
      const appliedSolo = applyMentionToText(solo, 'Alex Rivera');
      expect(appliedSolo).toBe('@Alex Rivera ');
    });

    it('includes key staff and front desk in default mention candidates', () => {
      const ids = DEFAULT_MENTION_CANDIDATES.map((c) => c.id);
      expect(ids).toContain('staff-all');
      expect(ids).toContain('staff-alex');
      expect(ids).toContain('staff-sarah');
      expect(ids).toContain('staff-desk');
      expect(ids).toContain('staff-itadmin');
      expect(ids).toContain('staff-admin');
    });
  });
});
