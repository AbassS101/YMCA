import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED } from '@/protivity/seed';
import type {
  Announcement,
  AppNotification,
  CancelRequest,
  ClassForumPost,
  ClassRegistration,
  ComplaintSuggestion,
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
  Survey,
  SurveyResponse,
  Thread,
  TrainerAssignment,
  ClientFitnessGoal,
  ClientWorkoutLog,
  UserForumInterests,
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
  forumInterests?: Record<string, UserForumInterests>;
  notificationPreferences: Record<string, NotificationPreferences>;
  supportTickets: SupportTicket[];
  complaintsSuggestions: ComplaintSuggestion[];
  workoutLogs: ClientWorkoutLog[];
  clientGoals: Record<string, ClientFitnessGoal>;
  surveys: Survey[];
  surveyResponses: SurveyResponse[];
};

function cloneSeed(): DemoState {
  return JSON.parse(JSON.stringify(SEED)) as DemoState;
}

function migrateState(raw: DemoState): DemoState {
  const seed = cloneSeed();

  let schedules = raw.schedules;
  if (!schedules || schedules.length === 0) {
    schedules = seed.schedules;
  } else {
    const existingIds = new Set(schedules.map((s) => s.id));
    const missingSeed = seed.schedules.filter((s) => !existingIds.has(s.id));
    schedules = [...schedules, ...missingSeed].map((item) => ({
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

  let mergedMembers = raw.members ?? seed.members;
  if (!mergedMembers.some((m) => m.id === 'guest-taylor')) {
    const guestMember = seed.members.find((m) => m.id === 'guest-taylor');
    if (guestMember) {
      mergedMembers = [...mergedMembers, guestMember];
    }
  }

  let mergedMemberships = raw.memberships ?? seed.memberships;
  if (!mergedMemberships.some((m) => m.memberId === 'guest-taylor')) {
    const guestMembership = seed.memberships.find((m) => m.memberId === 'guest-taylor');
    if (guestMembership) {
      mergedMemberships = [...mergedMemberships, guestMembership];
    }
  }

  let mergedCreds = (raw.credentials ?? seed.credentials).map((c) => {
    const seedCred = seed.credentials.find((sc) => sc.email === c.email);
    return seedCred ? { ...c, role: c.role ?? seedCred.role } : c;
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
  if (!mergedCreds.some((c) => c.email === 'guest@silverspring.ymca')) {
    const guestCred = seed.credentials.find((c) => c.email === 'guest@silverspring.ymca');
    if (guestCred) {
      mergedCreds = [...mergedCreds, guestCred];
    }
  }

  const forumReplies = raw.forumReplies ?? seed.forumReplies ?? [];
  const forumInterests = raw.forumInterests ?? seed.forumInterests ?? {};
  const rawTopics = raw.forumTopics ?? seed.forumTopics ?? [];

  const forumTopics = rawTopics.map((topic) => {
    const seedTopic = seed.forumTopics.find((st) => st.id === topic.id);
    const topicReplies = forumReplies
      .filter((r) => r.topicId === topic.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const participantSet = new Set<string>(topic.participantIds ?? seedTopic?.participantIds ?? []);
    const lastChattedAtBy: Record<string, string> = {
      ...(seedTopic?.lastChattedAtBy ?? {}),
      ...(topic.lastChattedAtBy ?? {}),
    };

    for (const r of topicReplies) {
      participantSet.add(r.authorId);
      const prev = lastChattedAtBy[r.authorId];
      if (!prev || r.createdAt > prev) {
        lastChattedAtBy[r.authorId] = r.createdAt;
      }
    }

    const interestedSet = new Set<string>(topic.interestedBy ?? seedTopic?.interestedBy ?? []);
    for (const [uid, prefs] of Object.entries(forumInterests)) {
      if (prefs?.topicIds?.includes(topic.id)) {
        interestedSet.add(uid);
      }
    }

    return {
      ...topic,
      interestedBy: Array.from(interestedSet),
      participantIds: Array.from(participantSet),
      lastChattedAtBy,
    };
  });

  return {
    ...seed,
    ...raw,
    members: mergedMembers,
    memberships: mergedMemberships,
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
    forumTopics,
    forumReplies,
    forumInterests,
    notificationPreferences: raw.notificationPreferences ?? seed.notificationPreferences ?? {},
    supportTickets: raw.supportTickets ?? seed.supportTickets ?? [],
    complaintsSuggestions: raw.complaintsSuggestions ?? seed.complaintsSuggestions ?? [],
    workoutLogs: raw.workoutLogs ?? seed.workoutLogs ?? [],
    clientGoals: raw.clientGoals ?? seed.clientGoals ?? {},
    surveys: raw.surveys ?? seed.surveys ?? [],
    surveyResponses: raw.surveyResponses ?? seed.surveyResponses ?? [],
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
