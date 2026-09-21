import type {
  SupportTicket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketType,
  UserRole,
  Thread,
  Message,
} from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const supportTicketRepo = {
  createTicket(
    api: ProtivityPort,
    input: {
      userId: string;
      userName: string;
      userEmail: string;
      userRole: UserRole | string;
      type: TicketType;
      title: string;
      description: string;
      category: TicketCategory;
      priority: TicketPriority;
      deviceInfo?: string;
    }
  ): Promise<{ ticket: SupportTicket; thread: Thread; initialMessage: Message }> {
    return api.createSupportTicket(input);
  },

  listUserTickets(api: ProtivityPort, userId: string): Promise<SupportTicket[]> {
    return api.listSupportTickets(userId);
  },

  listAllTickets(api: ProtivityPort): Promise<SupportTicket[]> {
    return api.listSupportTickets();
  },

  getTicket(api: ProtivityPort, ticketId: string): Promise<SupportTicket | null> {
    return api.getSupportTicket(ticketId);
  },

  updateStatus(
    api: ProtivityPort,
    ticketId: string,
    status: TicketStatus
  ): Promise<SupportTicket> {
    return api.updateSupportTicketStatus(ticketId, status);
  },
};
