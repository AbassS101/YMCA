import { demoNow } from '@/domain/childWatch';
import { getDemoToday } from '@/domain/demoClock';
import { ageOn, TEEN_MIN_AGE } from '@/domain/householdAccess';
import { createProtivityClient } from '@/protivity/createProtivityClient';
import type { ChildProfile, ChildWatchAuthorizedPickup, ChildWatchDropOffResult, ChildWatchVisit, Member } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';
import { streakRepo } from '@/repositories/streakRepo';
import { loadStore } from '@/storage/demoStore';

const api = createProtivityClient();

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

function toProfile(m: Member, primaryId: string): ChildProfile {
  const { firstName, lastName } = splitName(m.name);
  return {
    id: m.id,
    memberId: primaryId,
    firstName,
    lastName,
    birthDate: m.birthDate ?? '',
    allergies: m.allergies,
    notes: m.notes,
  };
}

/** Child Watch kids are the household's dependents under 13. */
function childrenOf(members: Member[], primaryId: string, today: string): ChildProfile[] {
  return members
    .filter((m) => m.id !== primaryId && m.birthDate && ageOn(m.birthDate, today) < TEEN_MIN_AGE)
    .map((m) => toProfile(m, primaryId));
}

export const childWatchRepo = {
  /** Under-13 dependents on the household of any member (primary or other adult). */
  async listChildren(memberId: string): Promise<ChildProfile[]> {
    const state = await loadStore();
    const me = state.members.find((m) => m.id === memberId);
    const primaryId = me?.householdId ?? memberId;
    const members = state.members.filter((m) => m.householdId === primaryId);
    return childrenOf(members, primaryId, getDemoToday());
  },

  async saveChild(profile: Omit<ChildProfile, 'id'> & { id?: string }): Promise<ChildProfile> {
    if (ageOn(profile.birthDate, getDemoToday()) >= TEEN_MIN_AGE) {
      throw new Error('Child Watch is for children under 13. Teens are added from the Family screen.');
    }
    const household = await api.getHousehold(profile.memberId);
    const primaryId = household.primary.id;
    const name = `${profile.firstName} ${profile.lastName}`.trim();
    const saved = profile.id
      ? await api.updateHouseholdMember(primaryId, profile.id, {
          name,
          birthDate: profile.birthDate,
          allergies: profile.allergies ?? '',
          notes: profile.notes ?? '',
        })
      : await api.addHouseholdMember(primaryId, {
          name,
          birthDate: profile.birthDate,
          allergies: profile.allergies,
          notes: profile.notes,
        });
    return toProfile(saved, primaryId);
  },

  async removeChild(childId: string): Promise<void> {
    const state = await loadStore();
    const child = state.members.find((m) => m.id === childId);
    if (!child?.householdId) throw new Error('Child not found.');
    await api.removeHouseholdMember(child.householdId, childId);
  },
  async activeVisits(): Promise<ChildWatchVisit[]> {
    const state = await loadStore();
    return state.childWatchVisits.filter((v) => !v.signedOutAt);
  },

  /** Every visit as the viewer may see it: pickup codes are stripped unless the viewer is a guardian of the child. */
  async visitsForViewer(requesterId: string): Promise<ChildWatchVisit[]> {
    return api.listChildWatchVisits({}, requesterId);
  },

  async visitsForMember(memberId: string): Promise<ChildWatchVisit[]> {
    const state = await loadStore();
    return state.childWatchVisits.filter((v) => v.memberId === memberId);
  },

  async hasDeskCheckInToday(memberId: string): Promise<boolean> {
    const profile = await streakRepo.getStreakProfile(memberId);
    return profile.checkInDates.includes(getDemoToday());
  },

  /**
   * Drops a child off and returns the visit plus the plain pickup code. The code is shown once:
   * the stored visit only keeps a hash. Any adult on the household who checked in at the desk today
   * counts as the parent being checked in.
   */
  async dropOff(
    childId: string,
    by: string,
    options?: { now?: Date; notes?: string; emergencyPhone?: string }
  ): Promise<ChildWatchDropOffResult> {
    const state = await loadStore();
    const childMember = state.members.find((m) => m.id === childId);
    let parentCheckedInAtDesk = false;
    if (childMember?.householdId) {
      const adults = state.members.filter(
        (m) => m.householdId === childMember.householdId && (!m.birthDate || ageOn(m.birthDate, getDemoToday()) >= 18)
      );
      for (const a of adults) {
        if (await this.hasDeskCheckInToday(a.id)) {
          parentCheckedInAtDesk = true;
          break;
        }
      }
    }
    return api.childWatchDropOff({
      childId,
      requesterUserId: by,
      deskCheckInConfirmed: parentCheckedInAtDesk,
      notes: options?.notes,
      emergencyPhone: options?.emergencyPhone,
      now: options?.now ?? demoNow(),
    });
  },

  /** Drops a child off and returns the visit; the returned copy carries the plain pickup code (it is not stored). */
  async signIn(childId: string, by: string, now: Date = demoNow()): Promise<ChildWatchVisit> {
    const { visit, pickupCode } = await this.dropOff(childId, by, { now });
    return { ...visit, pickupCode };
  },

  /**
   * Household adults can sign out their own child without a code (when the config allows it);
   * staff must supply the pickup code. `requireCode` is kept for older callers: staff always need the code now.
   */
  async signOut(
    visitId: string,
    by: string,
    options?: {
      pickupCode?: string;
      requireCode?: boolean;
      now?: Date;
      guardianId?: string;
      idVerified?: boolean;
      overrideReason?: string;
    }
  ): Promise<ChildWatchVisit> {
    return api.childWatchPickUp({
      visitId,
      requesterUserId: by,
      pickupCode: options?.pickupCode,
      guardianId: options?.guardianId,
      idVerified: options?.idVerified,
      overrideReason: options?.overrideReason,
      now: options?.now ?? demoNow(),
    });
  },

  // --- Authorized pickup people -------------------------------------------------------------------
  listAuthorizedPickups(householdId: string, requesterId: string): Promise<ChildWatchAuthorizedPickup[]> {
    return api.listAuthorizedPickups(householdId, requesterId);
  },

  /** Approved, unexpired pickup people: the ones staff may release a child to. */
  async approvedPickups(householdId: string, requesterId: string): Promise<ChildWatchAuthorizedPickup[]> {
    const today = getDemoToday();
    const all = await api.listAuthorizedPickups(householdId, requesterId);
    return all.filter((p) => p.status === 'approved' && (!p.expiresOn || p.expiresOn >= today));
  },

  addAuthorizedPickup(
    input: Parameters<ProtivityPort['addAuthorizedPickup']>[0],
    requesterId: string
  ): Promise<ChildWatchAuthorizedPickup> {
    return api.addAuthorizedPickup(input, requesterId);
  },

  reviewAuthorizedPickup(
    id: string,
    decision: 'approved' | 'revoked',
    requesterId: string
  ): Promise<ChildWatchAuthorizedPickup> {
    return api.reviewAuthorizedPickup(id, decision, requesterId);
  },

  // --- Incidents ----------------------------------------------------------------------------------
  logIncident(input: Parameters<ProtivityPort['logChildWatchIncident']>[0], requesterId: string) {
    return api.logChildWatchIncident(input, requesterId);
  },

  incidents(filter: Parameters<ProtivityPort['listChildWatchIncidents']>[0], requesterId: string) {
    return api.listChildWatchIncidents(filter, requesterId);
  },

  acknowledgeIncident(id: string, memberId: string) {
    return api.acknowledgeChildWatchIncident(id, memberId);
  },

  reviewIncident(id: string, note: string, requesterId: string) {
    return api.reviewChildWatchIncident(id, note, requesterId);
  },

  // --- Headcounts, shifts, audit ------------------------------------------------------------------
  recordHeadcount(input: Parameters<ProtivityPort['recordChildWatchHeadcount']>[0], requesterId: string) {
    return api.recordChildWatchHeadcount(input, requesterId);
  },

  headcounts(date: string, requesterId: string) {
    return api.listChildWatchHeadcounts(date, requesterId);
  },

  shifts(date: string, requesterId: string) {
    return api.listChildWatchShifts(date, requesterId);
  },

  saveShift(input: Parameters<ProtivityPort['saveChildWatchShift']>[0], requesterId: string) {
    return api.saveChildWatchShift(input, requesterId);
  },

  deleteShift(id: string, requesterId: string) {
    return api.deleteChildWatchShift(id, requesterId);
  },

  // --- Range queries (stats and export) -----------------------------------------------------------
  visitsInRange(from: string, to: string, requesterId: string) {
    return api.listChildWatchVisits({ from, to }, requesterId);
  },

  incidentsInRange(from: string, to: string, requesterId: string) {
    return api.listChildWatchIncidents({ from, to }, requesterId);
  },

  headcountsInRange(from: string, to: string, requesterId: string) {
    return api.listChildWatchHeadcountsRange(from, to, requesterId);
  },

  shiftsInRange(from: string, to: string, requesterId: string) {
    return api.listChildWatchShiftsRange(from, to, requesterId);
  },

  pendingPickups(requesterId: string) {
    return api.listPendingAuthorizedPickups(requesterId);
  },

  recordExport(detail: string, requesterId: string) {
    return api.recordChildWatchExport(detail, requesterId);
  },

  audit(filter: Parameters<ProtivityPort['listChildWatchAudit']>[0], requesterId: string) {
    return api.listChildWatchAudit(filter, requesterId);
  },
};
