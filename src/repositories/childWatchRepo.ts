import { demoNow, validateSignIn } from '@/domain/childWatch';
import { getDemoToday } from '@/domain/demoClock';
import { ageOn, TEEN_MIN_AGE } from '@/domain/householdAccess';
import { createProtivityClient } from '@/protivity/createProtivityClient';
import type { ChildProfile, ChildWatchVisit, Member } from '@/domain/types';
import { streakRepo } from '@/repositories/streakRepo';
import { loadStore, saveStore } from '@/storage/demoStore';

function newPickupCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

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

  async allVisits(): Promise<ChildWatchVisit[]> {
    const state = await loadStore();
    return state.childWatchVisits;
  },

  async visitsForMember(memberId: string): Promise<ChildWatchVisit[]> {
    const state = await loadStore();
    return state.childWatchVisits.filter((v) => v.memberId === memberId);
  },

  async hasDeskCheckInToday(memberId: string): Promise<boolean> {
    const profile = await streakRepo.getStreakProfile(memberId);
    return profile.checkInDates.includes(getDemoToday());
  },

  async signIn(childId: string, by: string, now: Date = demoNow()): Promise<ChildWatchVisit> {
    const state = await loadStore();
    const childMember = state.members.find((m) => m.id === childId);
    if (!childMember || !childMember.householdId || !childMember.birthDate) throw new Error('Child not found.');
    const child = toProfile(childMember, childMember.householdId);
    // Any adult on the household who has checked in at the desk today can drop a child off.
    const adults = state.members.filter(
      (m) => m.householdId === childMember.householdId && (!m.birthDate || ageOn(m.birthDate, getDemoToday()) >= 18)
    );
    let parentCheckedInAtDesk = false;
    for (const a of adults) {
      if (await this.hasDeskCheckInToday(a.id)) {
        parentCheckedInAtDesk = true;
        break;
      }
    }
    const check = validateSignIn({ now, child, visits: state.childWatchVisits, parentCheckedInAtDesk });
    if (!check.ok) throw new Error(check.reason);

    const visit: ChildWatchVisit = {
      id: `cwv-${Date.now()}-${childId}`,
      childId,
      memberId: child.memberId,
      signedInAt: now.toISOString(),
      signedInBy: by,
      pickupCode: newPickupCode(),
    };
    state.childWatchVisits.push(visit);
    state.notifications.unshift({
      id: `notif-cw-${visit.id}`,
      userId: child.memberId,
      title: `${child.firstName} signed in to Child Watch`,
      body: `Pickup code: ${visit.pickupCode}. Remember: maximum of 2 hours per day, and parents must remain in the building.`,
      type: 'event',
      createdAt: new Date().toISOString(),
      read: false,
      relatedId: visit.id,
      link: '/(member)/child-watch',
    });
    await saveStore(state);
    return visit;
  },

  /** Staff must supply the pickup code; the member signing out their own child does not. */
  async signOut(
    visitId: string,
    by: string,
    options?: { pickupCode?: string; requireCode?: boolean; now?: Date }
  ): Promise<ChildWatchVisit> {
    const state = await loadStore();
    const visit = state.childWatchVisits.find((v) => v.id === visitId);
    if (!visit) throw new Error('Visit not found.');
    if (visit.signedOutAt) throw new Error('Already signed out.');
    if (options?.requireCode && options.pickupCode?.trim() !== visit.pickupCode) {
      throw new Error('Pickup code does not match.');
    }
    visit.signedOutAt = (options?.now ?? demoNow()).toISOString();
    visit.signedOutBy = by;
    await saveStore(state);
    return visit;
  },
};
