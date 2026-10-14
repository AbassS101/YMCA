import type { AppConfig, AppConfigPatch, AppConfigSection, ConfigAuditEntry } from '@/domain/appConfig';
import type {
  AvailabilityConflict,
  TrainerAvailability,
  TrainerAvailabilityInput,
  ArrivalRecord,
  ArrivalResult,
  ArrivalSource,
  BillingIssueRow,
  EnrollmentCampaign,
  Lead,
  MemberContact,
  HouseholdMemberInput,
  HouseholdView,
  Announcement,
  AppNotification,
  AttendanceStatus,
  CancelRequest,
  ClassForumPost,
  ClassRegistration,
  ClientFitnessGoal,
  ClientWorkoutLog,
  ComplaintSuggestion,
  Donation,
  FeedbackStatus,
  ForumContentReportInput,
  ForumReply,
  ForumTopic,
  ForumTopicCategory,
  BookLessonOptions,
  BookableTime,
  CreateSessionRequestInput,
  LessonType,
  SessionRequest,
  SessionRequestFilter,
  SessionRequestResponse,
  LessonPricing,
  SwimClassEnrollment,
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
  Survey,
  SurveyResponse,
  Thread,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketType,
  UserForumInterests,
  ChildWatchAuditAction,
  ChildWatchAuditEntry,
  ChildWatchAuthorizedPickup,
  ChildWatchDropOffResult,
  ChildWatchHeadcount,
  ChildWatchIncident,
  ChildWatchIncidentType,
  ChildWatchShift,
  ChildWatchVisit,
  UserRole,
} from '@/domain/types';
import type { ChildWatchAuditFilter, ProtivityPort } from '@/protivity/ProtivityPort';
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
    _monthlyAmountCents: number,
    _requesterUserId?: string
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
    replyToId?: string;
    replyToAuthorName?: string;
    replyToExcerpt?: string;
  }): Promise<Message> {
    throw new ProtivityNotConnected();
  }

  async editMessage(_messageId: string, _userId: string, _body: string): Promise<Message> {
    throw new ProtivityNotConnected();
  }

  async toggleMessageReaction(
    _messageId: string,
    _userId: string,
    _emoji: string
  ): Promise<Message> {
    throw new ProtivityNotConnected();
  }

  async deleteMessage(_messageId: string, _userId: string): Promise<void> {
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

  async bookPrivateLesson(
    _memberId: string,
    _slotId: string,
    _options?: BookLessonOptions
  ): Promise<PrivateLesson> {
    throw new ProtivityNotConnected();
  }

  async listBookableTimes(
    _memberId: string,
    _q: { lessonType: LessonType; durationMin: 30 | 60; from: string; to: string; staffId?: string }
  ): Promise<BookableTime[]> {
    throw new ProtivityNotConnected();
  }

  async createSessionRequest(_memberId: string, _input: CreateSessionRequestInput): Promise<SessionRequest> {
    throw new ProtivityNotConnected();
  }

  async respondToSessionRequest(
    _requestId: string,
    _staffId: string,
    _response: SessionRequestResponse
  ): Promise<SessionRequest> {
    throw new ProtivityNotConnected();
  }

  async respondToCounterOffer(
    _requestId: string,
    _memberId: string,
    _decision: 'accept' | 'decline'
  ): Promise<SessionRequest> {
    throw new ProtivityNotConnected();
  }

  async cancelSessionRequest(_requestId: string, _userId: string): Promise<SessionRequest> {
    throw new ProtivityNotConnected();
  }

  async listSessionRequests(_filter?: SessionRequestFilter): Promise<SessionRequest[]> {
    throw new ProtivityNotConnected();
  }

  async setInstantBooking(
    _staffId: string,
    _memberId: string,
    _enabled: boolean,
    _requesterUserId?: string
  ): Promise<Staff> {
    throw new ProtivityNotConnected();
  }

  async getLessonPricing(): Promise<LessonPricing> {
    throw new ProtivityNotConnected();
  }

  async updateLessonPricing(_updates: Partial<LessonPricing>, _requesterUserId: string): Promise<LessonPricing> {
    throw new ProtivityNotConnected();
  }

  async enrollInSwimClass(
    _memberId: string,
    _classId: string,
    _participantName?: string
  ): Promise<SwimClassEnrollment> {
    throw new ProtivityNotConnected();
  }

  async cancelSwimEnrollment(_memberId: string, _enrollmentId: string): Promise<SwimClassEnrollment> {
    throw new ProtivityNotConnected();
  }

  async listMySwimEnrollments(_memberId: string): Promise<SwimClassEnrollment[]> {
    throw new ProtivityNotConnected();
  }

  async listSwimClassEnrollments(_classId: string): Promise<SwimClassEnrollment[]> {
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
    waiveEnrollmentFee?: boolean;
    birthDate?: string;
    householdMembers?: HouseholdMemberInput[];
  }): Promise<{ member: Member; membership: Membership }> {
    throw new ProtivityNotConnected();
  }

  async getHousehold(_memberId: string): Promise<HouseholdView> {
    throw new ProtivityNotConnected();
  }

  async addHouseholdMember(_primaryId: string, _input: HouseholdMemberInput): Promise<Member> {
    throw new ProtivityNotConnected();
  }

  async updateHouseholdMember(
    _primaryId: string,
    _memberId: string,
    _updates: Partial<Pick<HouseholdMemberInput, 'name' | 'birthDate' | 'allergies' | 'notes'>>
  ): Promise<Member> {
    throw new ProtivityNotConnected();
  }

  async removeHouseholdMember(_primaryId: string, _memberId: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async recordGymOrientation(_memberId: string, _staffId: string): Promise<Member> {
    throw new ProtivityNotConnected();
  }

  async rescindCancelNotice(_memberId: string, _requesterUserId?: string): Promise<Member> {
    throw new ProtivityNotConnected();
  }

  async approveCancelRequest(_memberId: string, _requesterUserId: string): Promise<CancelRequest> {
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

  async deleteMemberAccount(_memberId: string, _requesterUserId?: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async updateMemberAdmin(
    _memberId: string,
    _updates: Partial<Member>,
    _requesterUserId?: string
  ): Promise<Member> {
    throw new ProtivityNotConnected();
  }

  async updateMembershipAdmin(
    _memberId: string,
    _updates: Partial<Membership>,
    _requesterUserId?: string
  ): Promise<Membership> {
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

  async addLessonSlot(_slot: Omit<LessonSlot, 'id'>, _requesterUserId?: string): Promise<LessonSlot> {
    throw new ProtivityNotConnected();
  }

  async deleteLessonSlot(_slotId: string, _requesterUserId?: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async getTrainerAvailability(_staffId: string, _requesterUserId: string): Promise<TrainerAvailability> {
    throw new ProtivityNotConnected();
  }

  async saveTrainerAvailability(
    _staffId: string,
    _input: TrainerAvailabilityInput,
    _requesterUserId: string
  ): Promise<{ availability: TrainerAvailability; conflicts: AvailabilityConflict[] }> {
    throw new ProtivityNotConnected();
  }

  async listAvailabilityWindows(_staffId: string, _from: string, _to: string): Promise<LessonSlot[]> {
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

  async listRecentlyChattedClassIds(_userId: string): Promise<string[]> {
    throw new ProtivityNotConnected();
  }

  async listForumTopics(_filter?: {
    category?: ForumTopicCategory;
    categories?: ForumTopicCategory[];
    staffMentioned?: boolean;
    authorId?: string;
    interestedUserId?: string;
    chattedByUserId?: string;
    chattedOrCreatedByUserId?: string;
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
    mentionedUserIds?: string[];
    mentionedUserNames?: string[];
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

  async toggleInterestedForumTopic(_topicId: string, _userId: string): Promise<ForumTopic> {
    throw new ProtivityNotConnected();
  }

  async getForumInterests(_userId: string): Promise<UserForumInterests> {
    throw new ProtivityNotConnected();
  }

  async updateForumInterests(
    _userId: string,
    _updates: Partial<Omit<UserForumInterests, 'userId'>>
  ): Promise<UserForumInterests> {
    throw new ProtivityNotConnected();
  }

  async toggleInterestedForumCategory(
    _userId: string,
    _category: ForumTopicCategory
  ): Promise<UserForumInterests> {
    throw new ProtivityNotConnected();
  }

  async toggleInterestedClassForum(
    _userId: string,
    _classId: string
  ): Promise<UserForumInterests> {
    throw new ProtivityNotConnected();
  }

  async toggleForumReplyReaction(
    _replyId: string,
    _userId: string,
    _emoji: string
  ): Promise<ForumReply> {
    throw new ProtivityNotConnected();
  }

  async editForumReply(_replyId: string, _userId: string, _content: string): Promise<ForumReply> {
    throw new ProtivityNotConnected();
  }

  async toggleClassForumPostReaction(
    _postId: string,
    _userId: string,
    _emoji: string
  ): Promise<ClassForumPost> {
    throw new ProtivityNotConnected();
  }

  async editClassForumPost(
    _postId: string,
    _userId: string,
    _content: string
  ): Promise<ClassForumPost> {
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
    mentionedUserIds?: string[];
    mentionedUserNames?: string[];
  }): Promise<ForumReply> {
    throw new ProtivityNotConnected();
  }

  async deleteForumReply(_replyId: string, _requesterUserId: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async toggleLikeForumReply(_replyId: string, _userId: string): Promise<ForumReply> {
    throw new ProtivityNotConnected();
  }

  async reportForumContent(
    _input: ForumContentReportInput
  ): Promise<{ ticket: SupportTicket; thread: Thread; initialMessage: Message }> {
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

  async getClassRegistrations(_scheduleItemId: string): Promise<ClassRegistration[]> {
    throw new ProtivityNotConnected();
  }

  async markClassAttendance(
    _scheduleItemId: string,
    _memberId: string,
    _attendanceStatus: AttendanceStatus
  ): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async addWalkInRegistration(
    _scheduleItemId: string,
    _memberId: string
  ): Promise<ClassRegistration> {
    throw new ProtivityNotConnected();
  }

  async markLessonStatus(
    _lessonId: string,
    _status: 'booked' | 'completed' | 'no_show',
    _notes?: string
  ): Promise<PrivateLesson> {
    throw new ProtivityNotConnected();
  }

  async bookLessonForMember(
    _staffId: string,
    _memberId: string,
    _slotIdOrCustom: string | { start: string; end: string; location: string }
  ): Promise<PrivateLesson> {
    throw new ProtivityNotConnected();
  }

  async listClientWorkoutLogs(_memberId: string): Promise<ClientWorkoutLog[]> {
    throw new ProtivityNotConnected();
  }

  async logClientWorkout(
    _input: Omit<ClientWorkoutLog, 'id' | 'createdAt'>
  ): Promise<ClientWorkoutLog> {
    throw new ProtivityNotConnected();
  }

  async updateClientWorkoutLog(
    _logId: string,
    _updates: Partial<ClientWorkoutLog>
  ): Promise<ClientWorkoutLog> {
    throw new ProtivityNotConnected();
  }

  async deleteClientWorkoutLog(_logId: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async getClientFitnessGoal(_memberId: string): Promise<ClientFitnessGoal | null> {
    throw new ProtivityNotConnected();
  }

  async saveClientFitnessGoal(_goal: ClientFitnessGoal): Promise<ClientFitnessGoal> {
    throw new ProtivityNotConnected();
  }

  // Member Surveys & Polls
  async listSurveys(_branchId?: string, _onlyActive?: boolean): Promise<Survey[]> {
    throw new ProtivityNotConnected();
  }

  async getSurvey(_id: string): Promise<Survey | null> {
    throw new ProtivityNotConnected();
  }

  async createSurvey(
    _input: Omit<Survey, 'id' | 'createdAt' | 'totalResponses'>
  ): Promise<Survey> {
    throw new ProtivityNotConnected();
  }

  async updateSurveyStatus(_id: string, _isActive: boolean): Promise<Survey> {
    throw new ProtivityNotConnected();
  }

  async deleteSurvey(_id: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async listSurveyResponses(_surveyId: string): Promise<SurveyResponse[]> {
    throw new ProtivityNotConnected();
  }

  async submitSurveyResponse(
    _input: Omit<SurveyResponse, 'id' | 'submittedAt'>
  ): Promise<SurveyResponse> {
    throw new ProtivityNotConnected();
  }

  async getMemberSurveyResponses(_memberId: string): Promise<SurveyResponse[]> {
    throw new ProtivityNotConnected();
  }
  async recordArrival(
    _memberId: string,
    _options?: { source?: ArrivalSource; staffId?: string; date?: string }
  ): Promise<ArrivalResult> {
    throw new ProtivityNotConnected();
  }

  async listArrivals(_branchId: string, _date: string): Promise<ArrivalRecord[]> {
    throw new ProtivityNotConnected();
  }

  async listBillingIssues(_branchId: string, _requesterUserId?: string): Promise<BillingIssueRow[]> {
    throw new ProtivityNotConnected();
  }

  async resolveBillingIssue(
    _memberId: string,
    _payment: { brand: string; last4: string },
    _requesterUserId: string
  ): Promise<Membership> {
    throw new ProtivityNotConnected();
  }

  async listMemberContacts(_filter?: { memberId?: string; leadId?: string; staffId?: string }): Promise<MemberContact[]> {
    throw new ProtivityNotConnected();
  }

  async logMemberContact(
    _input: Omit<MemberContact, 'id' | 'createdAt' | 'staffId' | 'staffName'>,
    _requesterUserId: string
  ): Promise<MemberContact> {
    throw new ProtivityNotConnected();
  }

  async listLeads(_requesterUserId?: string): Promise<Lead[]> {
    throw new ProtivityNotConnected();
  }

  async createLead(
    _input: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: Lead['status'] },
    _requesterUserId: string
  ): Promise<Lead> {
    throw new ProtivityNotConnected();
  }

  async updateLead(_id: string, _updates: Partial<Lead>, _requesterUserId: string): Promise<Lead> {
    throw new ProtivityNotConnected();
  }

  async convertLeadToMember(
    _leadId: string,
    _input: { planId: string; payment: { brand: string; last4: string }; password?: string },
    _requesterUserId: string
  ): Promise<{ member: Member; membership: Membership; enrollmentFeeCents: number; campaign: EnrollmentCampaign | null }> {
    throw new ProtivityNotConnected();
  }

  async listCampaigns(): Promise<EnrollmentCampaign[]> {
    throw new ProtivityNotConnected();
  }

  async getActiveCampaign(_date: string, _planId?: string): Promise<EnrollmentCampaign | null> {
    throw new ProtivityNotConnected();
  }

  async saveCampaign(
    _input: Omit<EnrollmentCampaign, 'id' | 'createdByStaffId'> & { id?: string },
    _requesterUserId: string
  ): Promise<EnrollmentCampaign> {
    throw new ProtivityNotConnected();
  }

  async deleteCampaign(_id: string, _requesterUserId: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async getAppConfig(): Promise<AppConfig> {
    throw new ProtivityNotConnected();
  }

  async updateAppConfig<S extends AppConfigSection>(
    _section: S,
    _patch: AppConfigPatch<S>,
    _requesterUserId: string
  ): Promise<AppConfig> {
    throw new ProtivityNotConnected();
  }

  async resetAppConfigSection(_section: AppConfigSection, _requesterUserId: string): Promise<AppConfig> {
    throw new ProtivityNotConnected();
  }

  async listConfigAudit(_requesterUserId: string): Promise<ConfigAuditEntry[]> {
    throw new ProtivityNotConnected();
  }

  // --- Child Watch (not connected yet) ---
  async listChildWatchVisits(
    _filter: { date?: string; activeOnly?: boolean; householdId?: string },
    _requesterUserId: string
  ): Promise<ChildWatchVisit[]> {
    throw new ProtivityNotConnected();
  }

  async childWatchDropOff(_input: {
    childId: string;
    requesterUserId: string;
    deskCheckInConfirmed: boolean;
    notes?: string;
    emergencyPhone?: string;
    now?: Date;
  }): Promise<ChildWatchDropOffResult> {
    throw new ProtivityNotConnected();
  }

  async childWatchPickUp(_input: {
    visitId: string;
    requesterUserId: string;
    pickupCode?: string;
    guardianId?: string;
    idVerified?: boolean;
    overrideReason?: string;
    now?: Date;
  }): Promise<ChildWatchVisit> {
    throw new ProtivityNotConnected();
  }

  async listAuthorizedPickups(_householdId: string, _requesterUserId: string): Promise<ChildWatchAuthorizedPickup[]> {
    throw new ProtivityNotConnected();
  }

  async addAuthorizedPickup(
    _input: Pick<ChildWatchAuthorizedPickup, 'householdId' | 'name' | 'relationship' | 'phone'> &
      Partial<Pick<ChildWatchAuthorizedPickup, 'photoUrl' | 'idType' | 'idLast4' | 'expiresOn'>>,
    _requesterUserId: string
  ): Promise<ChildWatchAuthorizedPickup> {
    throw new ProtivityNotConnected();
  }

  async reviewAuthorizedPickup(
    _id: string,
    _decision: 'approved' | 'revoked',
    _requesterUserId: string
  ): Promise<ChildWatchAuthorizedPickup> {
    throw new ProtivityNotConnected();
  }

  async logChildWatchIncident(
    _input: {
      visitId?: string;
      childId: string;
      type: ChildWatchIncidentType;
      severity: ChildWatchIncident['severity'];
      description: string;
      actionTaken: string;
      now?: Date;
    },
    _requesterUserId: string
  ): Promise<ChildWatchIncident> {
    throw new ProtivityNotConnected();
  }

  async listChildWatchIncidents(
    _filter: { childId?: string; householdId?: string; status?: ChildWatchIncident['status'] },
    _requesterUserId: string
  ): Promise<ChildWatchIncident[]> {
    throw new ProtivityNotConnected();
  }

  async acknowledgeChildWatchIncident(_id: string, _memberId: string): Promise<ChildWatchIncident> {
    throw new ProtivityNotConnected();
  }

  async reviewChildWatchIncident(_id: string, _note: string, _requesterUserId: string): Promise<ChildWatchIncident> {
    throw new ProtivityNotConnected();
  }

  async recordChildWatchHeadcount(
    _input: { counted: number; expected?: number; note?: string; now?: Date },
    _requesterUserId: string
  ): Promise<ChildWatchHeadcount> {
    throw new ProtivityNotConnected();
  }

  async listChildWatchHeadcounts(_date: string, _requesterUserId: string): Promise<ChildWatchHeadcount[]> {
    throw new ProtivityNotConnected();
  }

  async listChildWatchShifts(_date: string, _requesterUserId: string): Promise<ChildWatchShift[]> {
    throw new ProtivityNotConnected();
  }

  async saveChildWatchShift(
    _input: Omit<ChildWatchShift, 'id'> & { id?: string },
    _requesterUserId: string
  ): Promise<ChildWatchShift> {
    throw new ProtivityNotConnected();
  }

  async deleteChildWatchShift(_id: string, _requesterUserId: string): Promise<void> {
    throw new ProtivityNotConnected();
  }

  async listChildWatchAudit(_filter: ChildWatchAuditFilter, _requesterUserId: string): Promise<ChildWatchAuditEntry[]> {
    throw new ProtivityNotConnected();
  }
}

