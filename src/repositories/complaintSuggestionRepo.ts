import type { ComplaintSuggestion, FeedbackStatus } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const complaintSuggestionRepo = {
  async list(api: ProtivityPort, branchId?: string, memberId?: string): Promise<ComplaintSuggestion[]> {
    return api.listComplaintsSuggestions(branchId, memberId);
  },

  async create(
    api: ProtivityPort,
    input: Omit<ComplaintSuggestion, 'id' | 'createdAt' | 'status'>
  ): Promise<ComplaintSuggestion> {
    return api.createComplaintSuggestion(input);
  },

  async updateStatus(
    api: ProtivityPort,
    id: string,
    status: FeedbackStatus,
    staffResponse?: string,
    staffId?: string,
    staffName?: string
  ): Promise<ComplaintSuggestion> {
    return api.updateComplaintSuggestionStatus(id, status, staffResponse, staffId, staffName);
  },
};
