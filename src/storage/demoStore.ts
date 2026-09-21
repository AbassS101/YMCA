import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED } from '@/protivity/seed';
import type {
  Announcement,
  AppNotification,
  CancelRequest,
  ClassForumPost,
  ClassRegistration,
  Donation,
  ForumReply,
  ForumTopic,
  LessonSlot,
  Member,
  Membership,
  Message,
  NotificationPreferences,
  PrivateLesson,
  SavedClass,
  ScheduleItem,
  Staff,
  SupportTicket,
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
  announcements: Announcement[];
  notifications: AppNotification[];
  donations: Donation[];
  credentials: { email: string; password: string; userId: string; role: UserRole }[];
  classForumPosts: ClassForumPost[];
  forumTopics: ForumTopic[];
  forumReplies: ForumReply[];
  notificationPreferences: Record<string, NotificationPreferences>;
  supportTickets: SupportTicket[];
};

function cloneSeed(): DemoState {
  return JSON.parse(JSON.stringify(SEED)) as DemoState;
}

function migrateState(raw: DemoState): DemoState {
  const seed = cloneSeed();

  let schedules = raw.schedules;
  if (!schedules) {
    schedules = seed.schedules;
  } else {
    schedules = schedules.map((item) => ({
      ...item,
      priceCents: item.priceCents ?? 0,
      seniorFriendly: item.seniorFriendly ?? false,
      isSpecialEvent: item.isSpecialEvent ?? false,
      capacity: item.capacity ?? 20,
    }));
  }

  let mergedStaff = raw.staff ?? seed.staff;
  if (!mergedStaff.some((s) => s.id === 'staff-admin')) {
    const adminStaff = seed.staff.find((s) => s.id === 'staff-admin');
    if (adminStaff) {
      mergedStaff = [adminStaff, ...mergedStaff];
    }
  }
  if (!mergedStaff.some((s) => s.id === 'staff-itadmin')) {
    const itStaff = seed.staff.find((s) => s.id === 'staff-itadmin');
    if (itStaff) {
      mergedStaff = [itStaff, ...mergedStaff];
    }
  }

  let mergedCreds = (raw.credentials ?? seed.credentials).map((c) => {
    const seedCred = seed.credentials.find((sc) => sc.email === c.email);
    return seedCred ? { ...c, role: seedCred.role } : c;
  });
  if (!mergedCreds.some((c) => c.email === 'admin@silverspring.ymca')) {
    const adminCred = seed.credentials.find((c) => c.email === 'admin@silverspring.ymca');
    if (adminCred) {
      mergedCreds = [adminCred, ...mergedCreds];
    }
  }
  if (!mergedCreds.some((c) => c.email === 'itadmin@silverspring.ymca')) {
    const itCred = seed.credentials.find((c) => c.email === 'itadmin@silverspring.ymca');
    if (itCred) {
      mergedCreds = [itCred, ...mergedCreds];
    }
  }

  return {
    ...seed,
    ...raw,
    members: raw.members ?? seed.members,
    staff: mergedStaff,
    schedules,
    classRegistrations: raw.classRegistrations ?? [],
    lessonSlots: raw.lessonSlots ?? seed.lessonSlots,
    privateLessons: raw.privateLessons ?? [],
    announcements: raw.announcements ?? seed.announcements,
    notifications: raw.notifications ?? seed.notifications,
    donations: raw.donations ?? seed.donations,
    credentials: mergedCreds,
    classForumPosts: raw.classForumPosts ?? seed.classForumPosts ?? [],
    forumTopics: raw.forumTopics ?? seed.forumTopics ?? [],
    forumReplies: raw.forumReplies ?? seed.forumReplies ?? [],
    notificationPreferences: raw.notificationPreferences ?? seed.notificationPreferences ?? {},
    supportTickets: raw.supportTickets ?? seed.supportTickets ?? [],
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
