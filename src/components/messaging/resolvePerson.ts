import type { DirectParticipant } from '@/components/chat/chatSources';

export type ResolvedPerson = DirectParticipant & { subtitle: string };

/** Looks up a thread participant, who may be a member or a staff member. */
export async function resolvePerson(api: any, id: string): Promise<ResolvedPerson> {
  try {
    const m = await api.getMember(id);
    return {
      id: m.id,
      name: m.name,
      role: 'member',
      avatarUrl: m.avatarUrl,
      isStaff: false,
      subtitle: 'Member',
    };
  } catch {
    const s = await api.getStaff(id);
    return {
      id: s.id,
      name: s.name,
      role: s.staffRole ?? 'staff',
      avatarUrl: s.avatarUrl,
      isStaff: true,
      subtitle: s.roleLabel,
    };
  }
}
