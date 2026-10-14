import type {
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
    monthlyAmountCents: number,
    requesterUserId?: string
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
    waiveEnrollmentFee?: boolean;
    campaignId?: string;
    birthDate?: string;
    householdMembers?: HouseholdMemberInput[];
  }): Promise<{ member: Member; membership: Membership }>;
  getHousehold(memberId: string): Promise<HouseholdView>;
  addHouseholdMember(primaryId: string, input: HouseholdMemberInput): Promise<Member>;
  updateHouseholdMember(
    primaryId: string,
    memberId: string,
    updates: Partial<Pick<HouseholdMemberInput, 'name' | 'birthDate' | 'allergies' | 'notes'>>
  ): Promise<Member>;
  removeHouseholdMember(primaryId: string, memberId: string): Promise<void>;
  /** Trainer/admin only; member must be 13-17. */
  recordGymOrientation(memberId: string, staffId: string): Promise<Member>;
  submitCancelNotice(
    memberId: string,
    input: { reason: string; requestedAt: string }
  ): Promise<CancelRequest>;
  rescindCancelNotice(memberId: string, requesterUserId?: string): Promise<Member>;
  approveCancelRequest(memberId: string, requesterUserId: string): Promise<CancelRequest>;
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
  bookPrivateLesson(
    memberId: string,
    slotId: string,
    options?: BookLessonOptions
  ): Promise<PrivateLesson>;
  // Private session requests (PT and swim)
  listBookableTimes(
    memberId: string,
    q: { lessonType: LessonType; durationMin: 30 | 60; from: string; to: string; staffId?: string }
  ): Promise<BookableTime[]>;
  createSessionRequest(memberId: string, input: CreateSessionRequestInput): Promise<SessionRequest>;
  respondToSessionRequest(
    requestId: string,
    staffId: string,
    response: SessionRequestResponse
  ): Promise<SessionRequest>;
  respondToCounterOffer(
    requestId: string,
    memberId: string,
    decision: 'accept' | 'decline'
  ): Promise<SessionRequest>;
  cancelSessionRequest(requestId: string, userId: string): Promise<SessionRequest>;
  listSessionRequests(filter?: SessionRequestFilter): Promise<SessionRequest[]>;
  setInstantBooking(
    staffId: string,
    memberId: string,
    enabled: boolean,
    requesterUserId?: string
  ): Promise<Staff>;
  getLessonPricing(): Promise<LessonPricing>;
  updateLessonPricing(updates: Partial<LessonPricing>): Promise<LessonPricing>;
  enrollInSwimClass(
    memberId: string,
    classId: string,
    participantName?: string
  ): Promise<SwimClassEnrollment>;
  cancelSwimEnrollment(memberId: string, enrollmentId: string): Promise<SwimClassEnrollment>;
  listMySwimEnrollments(memberId: string): Promise<SwimClassEnrollment[]>;
  listSwimClassEnrollments(classId: string): Promise<SwimClassEnrollment[]>;
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
  deleteMemberAccount(memberId: string, requesterUserId?: string): Promise<void>;
  updateMemberAdmin(memberId: string, updates: Partial<Member>, requesterUserId?: string): Promise<Member>;
  updateMembershipAdmin(
    memberId: string,
    updates: Partial<Membership>,
    requesterUserId?: string
  ): Promise<Membership>;
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

  // Trainer: Attendance & Session Operations
  getClassRegistrations(scheduleItemId: string): Promise<ClassRegistration[]>;
  markClassAttendance(
    scheduleItemId: string,
    memberId: string,
    attendanceStatus: AttendanceStatus
  ): Promise<void>;
  addWalkInRegistration(
    scheduleItemId: string,
    memberId: string
  ): Promise<ClassRegistration>;
  markLessonStatus(
    lessonId: string,
    status: 'booked' | 'completed' | 'no_show',
    notes?: string
  ): Promise<PrivateLesson>;
  bookLessonForMember(
    staffId: string,
    memberId: string,
    slotIdOrCustom: string | { start: string; end: string; location: string }
  ): Promise<PrivateLesson>;

  // Trainer: Client Workout Logs & Progression
  listClientWorkoutLogs(memberId: string): Promise<ClientWorkoutLog[]>;
  logClientWorkout(
    input: Omit<ClientWorkoutLog, 'id' | 'createdAt'>
  ): Promise<ClientWorkoutLog>;
  updateClientWorkoutLog(
    logId: string,
    updates: Partial<ClientWorkoutLog>
  ): Promise<ClientWorkoutLog>;
  deleteClientWorkoutLog(logId: string): Promise<void>;

  // Trainer: Client Fitness Goals
  getClientFitnessGoal(memberId: string): Promise<ClientFitnessGoal | null>;
  saveClientFitnessGoal(goal: ClientFitnessGoal): Promise<ClientFitnessGoal>;

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
    campaignId?: string;
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
    mentionedUserIds?: string[];
    mentionedUserNames?: string[];
    replyToId?: string;
    replyToAuthorName?: string;
    replyToExcerpt?: string;
  }): Promise<ClassForumPost>;
  toggleClassForumPostReaction(postId: string, userId: string, emoji: string): Promise<ClassForumPost>;
  editClassForumPost(postId: string, userId: string, content: string): Promise<ClassForumPost>;
  deleteClassForumPost(postId: string, requesterUserId: string): Promise<void>;
  togglePinClassForumPost(postId: string, requesterUserId: string): Promise<ClassForumPost>;
  listRecentlyChattedClassIds(userId: string): Promise<string[]>;

  // Dedicated Community Forum
  listForumTopics(filter?: {
    category?: ForumTopicCategory;
    categories?: ForumTopicCategory[];
    staffMentioned?: boolean;
    authorId?: string;
    interestedUserId?: string;
    chattedByUserId?: string;
    chattedOrCreatedByUserId?: string;
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
    mentionedUserIds?: string[];
    mentionedUserNames?: string[];
  }): Promise<ForumTopic>;
  deleteForumTopic(topicId: string, requesterUserId: string): Promise<void>;
  togglePinForumTopic(topicId: string, requesterUserId: string): Promise<ForumTopic>;
  toggleLikeForumTopic(topicId: string, userId: string): Promise<ForumTopic>;
  toggleInterestedForumTopic(topicId: string, userId: string): Promise<ForumTopic>;

  getForumInterests(userId: string): Promise<UserForumInterests>;
  updateForumInterests(
    userId: string,
    updates: Partial<Omit<UserForumInterests, 'userId'>>
  ): Promise<UserForumInterests>;
  toggleInterestedForumCategory(
    userId: string,
    category: ForumTopicCategory
  ): Promise<UserForumInterests>;
  toggleInterestedClassForum(
    userId: string,
    classId: string
  ): Promise<UserForumInterests>;

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
    mentionedUserIds?: string[];
    mentionedUserNames?: string[];
    replyToId?: string;
    replyToAuthorName?: string;
    replyToExcerpt?: string;
  }): Promise<ForumReply>;
  toggleForumReplyReaction(replyId: string, userId: string, emoji: string): Promise<ForumReply>;
  editForumReply(replyId: string, userId: string, content: string): Promise<ForumReply>;
  deleteForumReply(replyId: string, requesterUserId: string): Promise<void>;
  toggleLikeForumReply(replyId: string, userId: string): Promise<ForumReply>;
  reportForumContent(
    input: ForumContentReportInput
  ): Promise<{ ticket: SupportTicket; thread: Thread; initialMessage: Message }>;

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

  // Member Surveys & Polls
  listSurveys(branchId?: string, onlyActive?: boolean): Promise<Survey[]>;
  getSurvey(id: string): Promise<Survey | null>;
  createSurvey(input: Omit<Survey, 'id' | 'createdAt' | 'totalResponses'>): Promise<Survey>;
  updateSurveyStatus(id: string, isActive: boolean): Promise<Survey>;
  deleteSurvey(id: string): Promise<void>;
  listSurveyResponses(surveyId: string): Promise<SurveyResponse[]>;
  submitSurveyResponse(input: Omit<SurveyResponse, 'id' | 'submittedAt'>): Promise<SurveyResponse>;
  getMemberSurveyResponses(memberId: string): Promise<SurveyResponse[]>;
  // Arrivals, billing issues, contacts, leads, campaigns (front desk)
  recordArrival(
    memberId: string,
    options?: { source?: ArrivalSource; staffId?: string; date?: string }
  ): Promise<ArrivalResult>;
  listArrivals(branchId: string, date: string): Promise<ArrivalRecord[]>;
  listBillingIssues(branchId: string, requesterUserId?: string): Promise<BillingIssueRow[]>;
  resolveBillingIssue(
    memberId: string,
    payment: { brand: string; last4: string },
    requesterUserId: string
  ): Promise<Membership>;
  listMemberContacts(filter?: { memberId?: string; leadId?: string; staffId?: string }): Promise<MemberContact[]>;
  logMemberContact(
    input: Omit<MemberContact, 'id' | 'createdAt' | 'staffId' | 'staffName'>,
    requesterUserId: string
  ): Promise<MemberContact>;
  listLeads(requesterUserId?: string): Promise<Lead[]>;
  createLead(
    input: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: Lead['status'] },
    requesterUserId: string
  ): Promise<Lead>;
  updateLead(id: string, updates: Partial<Lead>, requesterUserId: string): Promise<Lead>;
  convertLeadToMember(
    leadId: string,
    input: { planId: string; payment: { brand: string; last4: string }; password?: string },
    requesterUserId: string
  ): Promise<{ member: Member; membership: Membership; enrollmentFeeCents: number; campaign: EnrollmentCampaign | null }>;
  listCampaigns(): Promise<EnrollmentCampaign[]>;
  getActiveCampaign(date: string, planId?: string): Promise<EnrollmentCampaign | null>;
  saveCampaign(
    input: Omit<EnrollmentCampaign, 'id' | 'createdByStaffId'> & { id?: string },
    requesterUserId: string
  ): Promise<EnrollmentCampaign>;
  deleteCampaign(id: string, requesterUserId: string): Promise<void>;
}
