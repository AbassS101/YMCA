import type { ComplaintSuggestion, FeedbackStatus } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const complaintSuggestionRepo = {
  async list(api: ProtivityPort, branchId?: string, memberId?: string): Promise<ComplaintSuggestion[]> {
    const items = await api.listComplaintsSuggestions(branchId, memberId);
    // Resolve names from the live staff/member records so replies always show
    // the current configured names rather than stale stored copies.
    const staffList = await api.listStaff().catch(() => []);
    const staffById = new Map(staffList.map((s) => [s.id, s]));
    const memberCache = new Map<string, string | null>();
    const memberName = async (id: string): Promise<string | null> => {
      if (!memberCache.has(id)) {
        memberCache.set(id, await api.getMember(id).then((m) => m.name).catch(() => null));
      }
      return memberCache.get(id) ?? null;
    };
    return Promise.all(
      items.map(async (item) => {
        const next = { ...item };
        const staff = item.respondedByStaffId ? staffById.get(item.respondedByStaffId) : undefined;
        if (staff) {
          next.respondedByStaffName = staff.roleLabel ? `${staff.name} (${staff.roleLabel})` : staff.name;
        }
        if (!item.isAnonymous && item.memberId) {
          const name = await memberName(item.memberId);
          if (name) next.memberName = name;
        }
        return next;
      })
    );
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
