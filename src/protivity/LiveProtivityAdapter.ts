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
import type { ProtivityPort } from '@/protivity/ProtivityPort';
import { ProtivityNotConnected } from '@/protivity/ProtivityNotConnected';

export class LiveProtivityAdapter implements ProtivityPort {
  async login(_email: string, _password: string): Promise<{ userId: string; role: UserRole }> {
    throw new ProtivityNotConnected();
  }

  async getMember(_id: string): Promise<Member> {
    throw new ProtivityNotConnected();
  }

  async updateMemberProfile(
    _memberId: string,
    _updates: { name?: string; phone?: string }
  ): Promise<Member> {
    throw new ProtivityNotConnected();
  }

  async getStaff(_id: string): Promise<Staff> {
    throw new ProtivityNotConnected();
  }

  async getMembership(_memberId: string): Promise<Membership> {
    throw new ProtivityNotConnected();
  }

  async getSchedules(_q: {
    branchId: string;
    from: string;
    to: string;
    category?: ScheduleCategory;
  }): Promise<ScheduleItem[]> {
    throw new ProtivityNotConnected();
  }

  async getStaffDay(_staffId: string, _date: string): Promise<ScheduleItem[]> {
    throw new ProtivityNotConnected();
  }

  async listAssignedMembers(_staffId: string): Promise<Member[]> {
    throw new ProtivityNotConnected();
  }

  async getAssignedTrainer(_memberId: string): Promise<Staff | null> {
    throw new ProtivityNotConnected();
  }

  async setAssignedTrainer(_memberId: string, _staffId: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async listStaff(_branchId?: string): Promise<Staff[]> {
    throw new ProtivityNotConnected();
  }

  async updatePaymentMethod(
    _memberId: string,
    _payment: { brand: string; last4: string }
  ): Promise<Membership> {
    throw new ProtivityNotConnected();
  }

  async changeMembership(
    _memberId: string,
    _planName: string,
    _monthlyAmountCents: number
  ): Promise<Membership> {
    throw new ProtivityNotConnected();
  }

  async submitCancelNotice(
    _memberId: string,
    _input: { reason: string; requestedAt: string }
  ): Promise<CancelRequest> {
    throw new ProtivityNotConnected();
  }

  async listPendingCancels(_branchId: string): Promise<CancelRequest[]> {
    throw new ProtivityNotConnected();
  }

  async listMessages(_threadId: string): Promise<Message[]> {
    throw new ProtivityNotConnected();
  }

  async listThreads(_userId: string): Promise<Thread[]> {
    throw new ProtivityNotConnected();
  }

  async getOrCreateThread(_memberId: string, _staffId: string): Promise<Thread> {
    throw new ProtivityNotConnected();
  }

  async sendMessage(_input: {
    threadId: string;
    fromId: string;
    body: string;
  }): Promise<Message> {
    throw new ProtivityNotConnected();
  }

  async registerForClass(
    _memberId: string,
    _scheduleItemId: string
  ): Promise<ClassRegistration> {
    throw new ProtivityNotConnected();
  }

  async cancelClassRegistration(
    _memberId: string,
    _scheduleItemId: string
  ): Promise<ClassRegistration> {
    throw new ProtivityNotConnected();
  }

  async listMyRegistrations(_memberId: string): Promise<ClassRegistration[]> {
    throw new ProtivityNotConnected();
  }

  async listClassRoster(_scheduleItemId: string): Promise<Member[]> {
    throw new ProtivityNotConnected();
  }

  async listLessonSlots(
    _staffId: string,
    _from: string,
    _to: string
  ): Promise<LessonSlot[]> {
    throw new ProtivityNotConnected();
  }

  async bookPrivateLesson(_memberId: string, _slotId: string): Promise<PrivateLesson> {
    throw new ProtivityNotConnected();
  }

  async cancelPrivateLesson(_memberId: string, _lessonId: string): Promise<PrivateLesson> {
    throw new ProtivityNotConnected();
  }

  async listMyLessons(_memberId: string): Promise<PrivateLesson[]> {
    throw new ProtivityNotConnected();
  }

  async listStaffLessons(_staffId: string, _date: string): Promise<PrivateLesson[]> {
    throw new ProtivityNotConnected();
  }

  async scheduleMembershipChange(
    _memberId: string,
    _planName: string,
    _monthlyAmountCents: number,
    _effectiveDate: string
  ): Promise<Membership> {
    throw new ProtivityNotConnected();
  }

  async cancelScheduledChange(_memberId: string): Promise<Membership> {
    throw new ProtivityNotConnected();
  }

  async buyMembership(_input: {
    name: string;
    email: string;
    phone: string;
    address: string;
    planId: string;
    payment: { brand: string; last4: string };
    donationCents?: number;
    password?: string;
  }): Promise<{ member: Member; membership: Membership }> {
    throw new ProtivityNotConnected();
  }

  async rescindCancelNotice(_memberId: string): Promise<Member> {
    throw new ProtivityNotConnected();
  }

  async listAnnouncements(_branchId?: string): Promise<Announcement[]> {
    throw new ProtivityNotConnected();
  }

  async createAnnouncement(_input: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement> {
    throw new ProtivityNotConnected();
  }

  async listNotifications(_userId: string): Promise<AppNotification[]> {
    throw new ProtivityNotConnected();
  }

  async markNotificationRead(_notificationId: string, _userId: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async markAllNotificationsRead(_userId: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async createNotification(
    _notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
  ): Promise<AppNotification> {
    throw new ProtivityNotConnected();
  }

  async getNotificationPreferences(_userId: string): Promise<NotificationPreferences> {
    throw new ProtivityNotConnected();
  }

  async updateNotificationPreferences(
    _userId: string,
    _updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    throw new ProtivityNotConnected();
  }

  async createDonation(
    _donation: Omit<Donation, 'id' | 'createdAt' | 'taxDeductibleId' | 'receiptNumber'>
  ): Promise<Donation> {
    throw new ProtivityNotConnected();
  }

  async listDonations(_memberId?: string): Promise<Donation[]> {
    throw new ProtivityNotConnected();
  }

  async updateAnnouncement(_id: string, _updates: Partial<Announcement>): Promise<Announcement> {
    throw new ProtivityNotConnected();
  }

  async deleteAnnouncement(_id: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async listAllMembers(_branchId?: string): Promise<Member[]> {
    throw new ProtivityNotConnected();
  }

  async deleteMemberAccount(_memberId: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async updateMemberAdmin(_memberId: string, _updates: Partial<Member>): Promise<Member> {
    throw new ProtivityNotConnected();
  }

  async updateMembershipAdmin(_memberId: string, _updates: Partial<Membership>): Promise<Membership> {
    throw new ProtivityNotConnected();
  }

  async listMemberRegistrations(_memberId: string): Promise<(ClassRegistration & { scheduleItem?: ScheduleItem })[]> {
    throw new ProtivityNotConnected();
  }

  async listMemberLessons(_memberId: string): Promise<PrivateLesson[]> {
    throw new ProtivityNotConnected();
  }

  async createScheduleItem(_item: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem> {
    throw new ProtivityNotConnected();
  }

  async updateScheduleItem(_id: string, _updates: Partial<ScheduleItem>): Promise<ScheduleItem> {
    throw new ProtivityNotConnected();
  }

  async deleteScheduleItem(_id: string, _notifyReason?: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async listAllSchedules(_branchId?: string): Promise<ScheduleItem[]> {
    throw new ProtivityNotConnected();
  }

  async listTrainerSchedule(_staffId: string): Promise<ScheduleItem[]> {
    throw new ProtivityNotConnected();
  }

  async cancelClassAndNotify(_scheduleItemId: string, _reason: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async cancelLessonAndNotify(_lessonId: string, _reason: string): Promise<PrivateLesson> {
    throw new ProtivityNotConnected();
  }

  async rescheduleLesson(
    _lessonId: string,
    _newStart: string,
    _newEnd: string,
    _newLocation?: string
  ): Promise<PrivateLesson> {
    throw new ProtivityNotConnected();
  }

  async addLessonSlot(_slot: Omit<LessonSlot, 'id'>): Promise<LessonSlot> {
    throw new ProtivityNotConnected();
  }

  async deleteLessonSlot(_slotId: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async createStaff(_input: Omit<Staff, 'id'> & { password: string }): Promise<Staff> {
    throw new ProtivityNotConnected();
  }

  async updateStaff(_id: string, _updates: Partial<Staff>): Promise<Staff> {
    throw new ProtivityNotConnected();
  }

  async deleteStaff(_id: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async changeUserPassword(_email: string, _newPassword: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async createMemberAdmin(_input: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    planId: string;
    password?: string;
    homeBranchId?: string;
  }): Promise<{ member: Member; membership: Membership }> {
    throw new ProtivityNotConnected();
  }

  async listClassForumPosts(_classId: string): Promise<ClassForumPost[]> {
    throw new ProtivityNotConnected();
  }

  async createClassForumPost(_input: {
    classId: string;
    authorId: string;
    authorName: string;
    authorRole: UserRole | string;
    authorAvatarUrl?: string;
    content: string;
    pinned?: boolean;
  }): Promise<ClassForumPost> {
    throw new ProtivityNotConnected();
  }

  async deleteClassForumPost(_postId: string, _requesterUserId: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async togglePinClassForumPost(_postId: string, _requesterUserId: string): Promise<ClassForumPost> {
    throw new ProtivityNotConnected();
  }

  async listForumTopics(_filter?: {
    category?: ForumTopicCategory;
    staffMentioned?: boolean;
    authorId?: string;
    searchQuery?: string;
  }): Promise<ForumTopic[]> {
    throw new ProtivityNotConnected();
  }

  async getForumTopic(_topicId: string): Promise<ForumTopic | null> {
    throw new ProtivityNotConnected();
  }

  async createForumTopic(_input: {
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
  }): Promise<ForumTopic> {
    throw new ProtivityNotConnected();
  }

  async deleteForumTopic(_topicId: string, _requesterUserId: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async togglePinForumTopic(_topicId: string, _requesterUserId: string): Promise<ForumTopic> {
    throw new ProtivityNotConnected();
  }

  async toggleLikeForumTopic(_topicId: string, _userId: string): Promise<ForumTopic> {
    throw new ProtivityNotConnected();
  }

  async listForumReplies(_topicId: string): Promise<ForumReply[]> {
    throw new ProtivityNotConnected();
  }

  async createForumReply(_input: {
    topicId: string;
    content: string;
    authorId: string;
    authorName: string;
    authorRole: UserRole | string;
    authorAvatarUrl?: string;
    isStaffReply: boolean;
    mentionedStaffIds?: string[];
  }): Promise<ForumReply> {
    throw new ProtivityNotConnected();
  }

  async deleteForumReply(_replyId: string, _requesterUserId: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async toggleLikeForumReply(_replyId: string, _userId: string): Promise<ForumReply> {
    throw new ProtivityNotConnected();
  }

  async createSupportTicket(_input: {
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
  }): Promise<{ ticket: SupportTicket; thread: Thread; initialMessage: Message }> {
    throw new ProtivityNotConnected();
  }

  async listSupportTickets(_userId?: string): Promise<SupportTicket[]> {
    throw new ProtivityNotConnected();
  }

  async getSupportTicket(_ticketId: string): Promise<SupportTicket | null> {
    throw new ProtivityNotConnected();
  }

  async updateSupportTicketStatus(
    _ticketId: string,
    _status: TicketStatus
  ): Promise<SupportTicket> {
    throw new ProtivityNotConnected();
  }

  async listComplaintsSuggestions(
    _branchId?: string,
    _memberId?: string
  ): Promise<ComplaintSuggestion[]> {
    throw new ProtivityNotConnected();
  }

  async createComplaintSuggestion(
    _input: Omit<ComplaintSuggestion, 'id' | 'createdAt' | 'status'>
  ): Promise<ComplaintSuggestion> {
    throw new ProtivityNotConnected();
  }

  async updateComplaintSuggestionStatus(
    _id: string,
    _status: FeedbackStatus,
    _staffResponse?: string,
    _staffId?: string,
    _staffName?: string
  ): Promise<ComplaintSuggestion> {
    throw new ProtivityNotConnected();
  }
}

