import { getDemoToday } from '@/domain/demoClock';
import type { ArrivalRecord, ArrivalResult, ArrivalSource, MemberStreakProfile } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';
import { streakRepo } from '@/repositories/streakRepo';

export type CheckInResult = {
  streakProfile: MemberStreakProfile;
  isNewCheckIn: boolean;
  arrival: ArrivalRecord | null;
  /** Staff (trainers / instructors) alerted by this check-in. */
  notifiedStaffNames: string[];
};

/** Single entry point for check-ins: updates the streak and alerts the member's trainers. */
export const arrivalRepo = {
  async checkIn(
    api: ProtivityPort,
    memberId: string,
    options?: { source?: ArrivalSource; staffId?: string; note?: string }
  ): Promise<CheckInResult> {
    const source = options?.source ?? 'desk';
    const streak = await streakRepo.recordCheckIn(memberId, {
      source: source === 'scanner' ? 'optical_scanner' : source === 'class' ? 'class_attendance' : 'manual',
      note: options?.note,
    });

    let arrival: ArrivalResult | null = null;
    try {
      arrival = await api.recordArrival(memberId, { source, staffId: options?.staffId });
    } catch (err) {
      // A permission failure must surface; any other failure should not undo the check-in.
      if (err instanceof Error && err.message.includes('not permitted')) throw err;
    }

    return {
      streakProfile: streak.profile,
      isNewCheckIn: streak.isNewCheckIn,
      arrival: arrival?.arrival ?? null,
      notifiedStaffNames: arrival?.notifiedStaff.map((s) => s.name) ?? [],
    };
  },

  /** For flows that already recorded the streak check-in (member self check-in): alert trainers only. Never throws. */
  async notifyArrival(api: ProtivityPort, memberId: string, source: ArrivalSource): Promise<void> {
    try {
      await api.recordArrival(memberId, { source });
    } catch {
      // Arrival alerts are best-effort for member self check-in.
    }
  },

  async arrivedMemberIds(api: ProtivityPort, branchId: string, date: string = getDemoToday()): Promise<Set<string>> {
    const list = await api.listArrivals(branchId, date);
    return new Set(list.map((a) => a.memberId));
  },
};
