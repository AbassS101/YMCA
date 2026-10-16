import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { InteractionManager } from 'react-native';

import { useSession } from '@/context/SessionContext';
import { getDemoToday } from '@/domain/demoClock';
import type { ClientFitnessGoal, Member, PrivateLesson, ScheduleItem, Staff } from '@/domain/types';
import { lessonRepo } from '@/repositories/lessonRepo';
import { registrationRepo } from '@/repositories/registrationRepo';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import { trainerRepo } from '@/repositories/trainerRepo';

import { BRANCH_ID } from './format';

export type ClassWithRoster = { item: ScheduleItem; roster: Member[] };
export type ClientWithGoal = { member: Member; goal: ClientFitnessGoal | null };

export type TrainerDay = {
  profile: Staff | null;
  classes: ClassWithRoster[];
  lessons: PrivateLesson[];
  lessonMembers: Record<string, Member>;
  clients: ClientWithGoal[];
  /** memberId -> ISO arrival time, for today's arrivals among this staff member's clients and lessons. */
  arrivedAt: Record<string, string>;
  error: boolean;
  /** False until the first load finishes, so screens can show a loading state. */
  loaded: boolean;
  reload: () => Promise<void>;
};

export function useTrainerDay(staffId: string): TrainerDay {
  const { api } = useSession();
  const [profile, setProfile] = useState<Staff | null>(null);
  const [classes, setClasses] = useState<ClassWithRoster[]>([]);
  const [lessons, setLessons] = useState<PrivateLesson[]>([]);
  const [lessonMembers, setLessonMembers] = useState<Record<string, Member>>({});
  const [clients, setClients] = useState<ClientWithGoal[]>([]);
  const [arrivedAt, setArrivedAt] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (staffId === '') return;
    try {
      setError(false);
      const today = getDemoToday();
      const [nextProfile, dayClasses, dayLessons, assigned] = await Promise.all([
        api.getStaff(staffId).catch(() => null),
        scheduleRepo.getStaffDay(api, staffId, today),
        lessonRepo.listStaffDay(api, staffId, today),
        api.listAssignedMembers(staffId).catch(() => []),
      ]);
      dayClasses.sort((a, b) => a.start.localeCompare(b.start));
      dayLessons.sort((a, b) => a.start.localeCompare(b.start));

      const arrivalsPromise = api.listArrivals(BRANCH_ID, today).catch(() => []);
      const [withRosters, memberList, withGoals] = await Promise.all([
        Promise.all(dayClasses.map(async (item) => ({ item, roster: await registrationRepo.roster(api, item.id) }))),
        Promise.all([...new Set(dayLessons.map((l) => l.memberId))].map((id) => api.getMember(id))),
        Promise.all(
          assigned.map(async (member) => ({
            member,
            goal: await trainerRepo.getClientFitnessGoal(api, member.id).catch(() => null),
          }))
        ),
      ]);

      const byId: Record<string, Member> = {};
      for (const m of memberList) byId[m.id] = m;

      const todaysArrivals = await arrivalsPromise;
      const relevant = new Set<string>([...assigned.map((m) => m.id), ...Object.keys(byId)]);
      const arrived: Record<string, string> = {};
      for (const a of todaysArrivals) {
        if (relevant.has(a.memberId)) arrived[a.memberId] = a.at;
      }

      setArrivedAt(arrived);
      setProfile(nextProfile);
      setClasses(withRosters);
      setLessons(dayLessons);
      setLessonMembers(byId);
      setClients(withGoals);
    } catch {
      setError(true);
    } finally {
      setLoaded(true);
    }
  }, [api, staffId]);

  useFocusEffect(
    useCallback(() => {
      const handle = InteractionManager.runAfterInteractions(() => {
        void reload();
      });
      return () => handle.cancel();
    }, [reload])
  );

  return { profile, classes, lessons, lessonMembers, clients, arrivedAt, error, loaded, reload };
}
