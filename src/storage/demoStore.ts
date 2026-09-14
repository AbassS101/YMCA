import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED } from '@/protivity/seed';
import type {
  CancelRequest,
  ClassRegistration,
  LessonSlot,
  Member,
  Membership,
  Message,
  PrivateLesson,
  SavedClass,
  ScheduleItem,
  Staff,
  Thread,
  TrainerAssignment,
  UserRole,
} from '@/domain/types';

const STORAGE_KEY = '@ymca/demo-state';

export type DemoState = {
  members: Member[];
  staff: Staff[];
  memberships: Membership[];
  schedules: ScheduleItem[];
  savedClasses: SavedClass[];
  classRegistrations: ClassRegistration[];
  lessonSlots: LessonSlot[];
  privateLessons: PrivateLesson[];
  assignments: TrainerAssignment[];
  threads: Thread[];
  messages: Message[];
  cancelRequests: CancelRequest[];
  credentials: { email: string; password: string; userId: string; role: UserRole }[];
};

function cloneSeed(): DemoState {
  return JSON.parse(JSON.stringify(SEED)) as DemoState;
}

function migrateState(raw: DemoState): DemoState {
  const seed = cloneSeed();
  const rawById = new Map((raw.schedules ?? []).map((s) => [s.id, s]));
  const mergedSchedules = seed.schedules.map((seedItem) => {
    const existing = rawById.get(seedItem.id);
    return {
      ...seedItem,
      ...existing,
      priceCents: seedItem.priceCents ?? existing?.priceCents ?? 0,
      seniorFriendly: seedItem.seniorFriendly ?? existing?.seniorFriendly ?? false,
      isSpecialEvent: seedItem.isSpecialEvent ?? existing?.isSpecialEvent ?? false,
      description: seedItem.description ?? existing?.description,
      capacity: existing?.capacity ?? seedItem.capacity ?? 20,
    };
  });
  return {
    ...seed,
    ...raw,
    staff: seed.staff,
    schedules: mergedSchedules,
    classRegistrations: raw.classRegistrations ?? [],
    lessonSlots: raw.lessonSlots ?? seed.lessonSlots,
    privateLessons: raw.privateLessons ?? [],
  };
}

export async function resetStore(): Promise<DemoState> {
  const state = cloneSeed();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

export async function saveStore(state: DemoState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function loadStore(): Promise<DemoState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw == null) {
    return resetStore();
  }
  const parsed = JSON.parse(raw) as DemoState;
  return migrateState(parsed);
}
