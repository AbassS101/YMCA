import type {
  Announcement,
  AppNotification,
  CancelRequest,
  ClassForumPost,
  ClassRegistration,
  ComplaintSuggestion,
  Donation,
  FeedbackStatus,
  ForumReply,
  ForumTopic,
  ForumTopicCategory,
  LessonSlot,
  Member,
  Membership,
  Message,
  NotificationPreferences,
  PrivateLesson,
  ScheduleCategory,
  ScheduleItem,
  Staff,
  SupportTicket,
  Thread,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketType,
  UserRole,
} from '@/domain/types';

export interface ProtivityPort {
  login(email: string, password: string): Promise<{ userId: string; role: UserRole }>;
  getMember(id: string): Promise<Member>;
  updateMemberProfile(
    memberId: string,
    updates: { name?: string; phone?: string; avatarUrl?: string }
  ): Promise<Member>;
  getStaff(id: string): Promise<Staff>;
  getMembership(memberId: string): Promise<Membership>;
  getSchedules(q: {
    branchId: string;
    from: string;
    to: string;
    category?: ScheduleCategory;
  }): Promise<ScheduleItem[]>;
  getStaffDay(staffId: string, date: string): Promise<ScheduleItem[]>;
  listAssignedMembers(staffId: string): Promise<Member[]>;
  getAssignedTrainer(memberId: string): Promise<Staff | null>;
  setAssignedTrainer(memberId: string, staffId: string): Promise<void>;
  listStaff(branchId?: string): Promise<Staff[]>;
  updatePaymentMethod(
    memberId: string,
    payment: { brand: string; last4: string }
  ): Promise<Membership>;
  changeMembership(
    memberId: string,
    planName: string,
    monthlyAmountCents: number
  ): Promise<Membership>;
  scheduleMembershipChange(
    memberId: string,
    planName: string,
    monthlyAmountCents: number,
    effectiveDate: string
  ): Promise<Membership>;
  cancelScheduledChange(memberId: string): Promise<Membership>;
  buyMembership(input: {
    name: string;
    email: string;
    phone: string;
    address: string;
    planId: string;
    payment: { brand: string; last4: string };
    donationCents?: number;
    password?: string;
  }): Promise<{ member: Member; membership: Membership }>;
  submitCancelNotice(
    memberId: string,
    input: { reason: string; requestedAt: string }
  ): Promise<CancelRequest>;
  rescindCancelNotice(memberId: string): Promise<Member>;
  listPendingCancels(branchId: string): Promise<CancelRequest[]>;
  listMessages(threadId: string): Promise<Message[]>;
  listThreads(userId: string): Promise<Thread[]>;
  getOrCreateThread(memberId: string, staffId: string): Promise<Thread>;
  sendMessage(input: {
    threadId: string;
    fromId: string;
    body: string;
  }): Promise<Message>;

  registerForClass(memberId: string, scheduleItemId: string): Promise<ClassRegistration>;
  cancelClassRegistration(memberId: string, scheduleItemId: string): Promise<ClassRegistration>;
  listMyRegistrations(memberId: string): Promise<ClassRegistration[]>;
  listClassRoster(scheduleItemId: string): Promise<Member[]>;

  listLessonSlots(staffId: string, from: string, to: string): Promise<LessonSlot[]>;
  bookPrivateLesson(memberId: string, slotId: string): Promise<PrivateLesson>;
  cancelPrivateLesson(memberId: string, lessonId: string): Promise<PrivateLesson>;
  listMyLessons(memberId: string): Promise<PrivateLesson[]>;
  listStaffLessons(staffId: string, date: string): Promise<PrivateLesson[]>;

  // Announcements & Events
  listAnnouncements(branchId?: string): Promise<Announcement[]>;
  createAnnouncement(input: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement>;
  updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;

  // Notifications
  listNotifications(userId: string): Promise<AppNotification[]>;
  markNotificationRead(notificationId: string, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  createNotification(
    notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
  ): Promise<AppNotification>;
  getNotificationPreferences(userId: string): Promise<NotificationPreferences>;
  updateNotificationPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences>;

  // Donations
  createDonation(
    donation: Omit<Donation, 'id' | 'createdAt' | 'taxDeductibleId' | 'receiptNumber'>
  ): Promise<Donation>;
  listDonations(memberId?: string): Promise<Donation[]>;

  // Admin: Member Management
  listAllMembers(branchId?: string): Promise<Member[]>;
  deleteMemberAccount(memberId: string): Promise<void>;
  updateMemberAdmin(memberId: string, updates: Partial<Member>): Promise<Member>;
  updateMembershipAdmin(memberId: string, updates: Partial<Membership>): Promise<Membership>;
  listMemberRegistrations(memberId: string): Promise<(ClassRegistration & { scheduleItem?: ScheduleItem })[]>;
  listMemberLessons(memberId: string): Promise<PrivateLesson[]>;

  // Admin & Trainer: Schedules & Events CRUD
  createScheduleItem(item: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem>;
  updateScheduleItem(id: string, updates: Partial<ScheduleItem>): Promise<ScheduleItem>;
  deleteScheduleItem(id: string, notifyReason?: string): Promise<void>;
  listAllSchedules(branchId?: string): Promise<ScheduleItem[]>;

  // Trainer Operations
  listTrainerSchedule(staffId: string): Promise<ScheduleItem[]>;
  cancelClassAndNotify(scheduleItemId: string, reason: string): Promise<void>;
  cancelLessonAndNotify(lessonId: string, reason: string): Promise<PrivateLesson>;
  rescheduleLesson(
    lessonId: string,
    newStart: string,
    newEnd: string,
    newLocation?: string
  ): Promise<PrivateLesson>;
  addLessonSlot(slot: Omit<LessonSlot, 'id'>): Promise<LessonSlot>;
  deleteLessonSlot(slotId: string): Promise<void>;

  // Admin: Staff & Trainer Management
  createStaff(input: Omit<Staff, 'id'> & { password: string }): Promise<Staff>;
  updateStaff(id: string, updates: Partial<Staff>): Promise<Staff>;
  deleteStaff(id: string): Promise<void>;

  // Admin: Password Management
  changeUserPassword(email: string, newPassword: string): Promise<void>;

  // Admin: Member Creation
  createMemberAdmin(input: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    planId: string;
    password?: string;
    homeBranchId?: string;
  }): Promise<{ member: Member; membership: Membership }>;

  // Class Community Forum & Chat
  listClassForumPosts(classId: string): Promise<ClassForumPost[]>;
  createClassForumPost(input: {
    classId: string;
    authorId: string;
    authorName: string;
    authorRole: UserRole | string;
    authorAvatarUrl?: string;
    content: string;
    pinned?: boolean;
  }): Promise<ClassForumPost>;
  deleteClassForumPost(postId: string, requesterUserId: string): Promise<void>;
  togglePinClassForumPost(postId: string, requesterUserId: string): Promise<ClassForumPost>;

  // Dedicated Community Forum
  listForumTopics(filter?: {
    category?: ForumTopicCategory;
    staffMentioned?: boolean;
    authorId?: string;
    searchQuery?: string;
  }): Promise<ForumTopic[]>;
  getForumTopic(topicId: string): Promise<ForumTopic | null>;
  createForumTopic(input: {
    title: string;
    content: string;
    category: ForumTopicCategory;
    authorId: string;
    authorName: string;
    authorRole: UserRole | string;
    authorAvatarUrl?: string;
    pinned?: boolean;
    mentionedStaffIds?: string[];
    mentionedStaffNames?: string[];
  }): Promise<ForumTopic>;
  deleteForumTopic(topicId: string, requesterUserId: string): Promise<void>;
  togglePinForumTopic(topicId: string, requesterUserId: string): Promise<ForumTopic>;
  toggleLikeForumTopic(topicId: string, userId: string): Promise<ForumTopic>;

  listForumReplies(topicId: string): Promise<ForumReply[]>;
  createForumReply(input: {
    topicId: string;
    content: string;
    authorId: string;
    authorName: string;
    authorRole: UserRole | string;
    authorAvatarUrl?: string;
    isStaffReply: boolean;
    mentionedStaffIds?: string[];
  }): Promise<ForumReply>;
  deleteForumReply(replyId: string, requesterUserId: string): Promise<void>;
  toggleLikeForumReply(replyId: string, userId: string): Promise<ForumReply>;

  // Support Tickets & IT Systems Chat
  createSupportTicket(input: {
    userId: string;
    userName: string;
    userEmail: string;
    userRole: UserRole | string;
    type: TicketType;
    title: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    deviceInfo?: string;
  }): Promise<{ ticket: SupportTicket; thread: Thread; initialMessage: Message }>;
  listSupportTickets(userId?: string): Promise<SupportTicket[]>;
  getSupportTicket(ticketId: string): Promise<SupportTicket | null>;
  updateSupportTicketStatus(ticketId: string, status: TicketStatus): Promise<SupportTicket>;

  // Complaints & Suggestions
  listComplaintsSuggestions(branchId?: string, memberId?: string): Promise<ComplaintSuggestion[]>;
  createComplaintSuggestion(input: Omit<ComplaintSuggestion, 'id' | 'createdAt' | 'status'>): Promise<ComplaintSuggestion>;
  updateComplaintSuggestionStatus(
    id: string,
    status: FeedbackStatus,
    staffResponse?: string,
    staffId?: string,
    staffName?: string
  ): Promise<ComplaintSuggestion>;
}

