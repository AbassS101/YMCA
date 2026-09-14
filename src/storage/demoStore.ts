import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED } from '@/protivity/seed';
import type {
  CancelRequest,
  Member,
  Membership,
  Message,
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
  assignments: TrainerAssignment[];
  threads: Thread[];
  messages: Message[];
  cancelRequests: CancelRequest[];
  credentials: { email: string; password: string; userId: string; role: UserRole }[];
};

function cloneSeed(): DemoState {
  return JSON.parse(JSON.stringify(SEED)) as DemoState;
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
  return JSON.parse(raw) as DemoState;
}
