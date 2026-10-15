import type {
  AvailabilityConflict,
  TrainerAvailability,
  TrainerAvailabilityInput,
  BookLessonOptions,
  BookableTime,
  CreateSessionRequestInput,
  LessonPricing,
  LessonSlot,
  LessonType,
  PrivateLesson,
  SessionRequest,
  SessionRequestFilter,
  SessionRequestResponse,
  SwimClassEnrollment,
} from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const lessonRepo = {
  listOpenSlots(
    api: ProtivityPort,
    staffId: string,
    from: string,
    to: string
  ): Promise<LessonSlot[]> {
    return api.listLessonSlots(staffId, from, to);
  },

  listMine(api: ProtivityPort, memberId: string): Promise<PrivateLesson[]> {
    return api.listMyLessons(memberId);
  },

  listStaffDay(api: ProtivityPort, staffId: string, date: string): Promise<PrivateLesson[]> {
    return api.listStaffLessons(staffId, date);
  },

  book(
    api: ProtivityPort,
    memberId: string,
    slotId: string,
    options?: BookLessonOptions
  ): Promise<PrivateLesson> {
    return api.bookPrivateLesson(memberId, slotId, options);
  },

  cancel(api: ProtivityPort, memberId: string, lessonId: string): Promise<PrivateLesson> {
    return api.cancelPrivateLesson(memberId, lessonId);
  },

  /** Cancel current lesson and book a different open slot with the same trainer. No new charge. */
  async change(
    api: ProtivityPort,
    memberId: string,
    lessonId: string,
    newSlotId: string
  ): Promise<PrivateLesson> {
    const mine = await api.listMyLessons(memberId);
    const old = mine.find((l) => l.id === lessonId);
    await api.cancelPrivateLesson(memberId, lessonId);
    const carry: BookLessonOptions | undefined = old
      ? {
          lessonType: old.lessonType,
          durationMin: (old.durationMin as 30 | 60 | undefined) ?? 60,
          swimmerName: old.swimmerName,
          stageCode: old.stageCode,
          notes: old.notes,
          carryOverPaidCents: old.paidAmountCents ?? 0,
          carryOverPaymentLast4: old.paymentLast4,
        }
      : undefined;
    return api.bookPrivateLesson(memberId, newSlotId, carry);
  },
};

export const sessionRequestRepo = {
  bookableTimes(
    api: ProtivityPort,
    memberId: string,
    q: { lessonType: LessonType; durationMin: 30 | 60; from: string; to: string; staffId?: string }
  ): Promise<BookableTime[]> {
    return api.listBookableTimes(memberId, q);
  },
  create(api: ProtivityPort, memberId: string, input: CreateSessionRequestInput): Promise<SessionRequest> {
    return api.createSessionRequest(memberId, input);
  },
  respond(
    api: ProtivityPort,
    requestId: string,
    staffId: string,
    response: SessionRequestResponse
  ): Promise<SessionRequest> {
    return api.respondToSessionRequest(requestId, staffId, response);
  },
  answerCounter(
    api: ProtivityPort,
    requestId: string,
    memberId: string,
    decision: 'accept' | 'decline'
  ): Promise<SessionRequest> {
    return api.respondToCounterOffer(requestId, memberId, decision);
  },
  cancel(api: ProtivityPort, requestId: string, userId: string): Promise<SessionRequest> {
    return api.cancelSessionRequest(requestId, userId);
  },
  list(api: ProtivityPort, filter?: SessionRequestFilter): Promise<SessionRequest[]> {
    return api.listSessionRequests(filter);
  },
  setInstantBooking(
    api: ProtivityPort,
    staffId: string,
    memberId: string,
    enabled: boolean,
    requesterUserId: string
  ) {
    return api.setInstantBooking(staffId, memberId, enabled, requesterUserId);
  },
};

export const pricingRepo = {
  get(api: ProtivityPort): Promise<LessonPricing> {
    return api.getLessonPricing();
  },
  update(api: ProtivityPort, updates: Partial<LessonPricing>, requesterUserId: string): Promise<LessonPricing> {
    return api.updateLessonPricing(updates, requesterUserId);
  },
};

export const swimClassRepo = {
  enroll(
    api: ProtivityPort,
    memberId: string,
    classId: string,
    participantName?: string
  ): Promise<SwimClassEnrollment> {
    return api.enrollInSwimClass(memberId, classId, participantName);
  },
  cancel(api: ProtivityPort, memberId: string, enrollmentId: string): Promise<SwimClassEnrollment> {
    return api.cancelSwimEnrollment(memberId, enrollmentId);
  },
  listMine(api: ProtivityPort, memberId: string): Promise<SwimClassEnrollment[]> {
    return api.listMySwimEnrollments(memberId);
  },
  listForClass(api: ProtivityPort, classId: string): Promise<SwimClassEnrollment[]> {
    return api.listSwimClassEnrollments(classId);
  },
};

export const availabilityRepo = {
  get(api: ProtivityPort, staffId: string, requesterUserId: string): Promise<TrainerAvailability> {
    return api.getTrainerAvailability(staffId, requesterUserId);
  },
  save(
    api: ProtivityPort,
    staffId: string,
    input: TrainerAvailabilityInput,
    requesterUserId: string
  ): Promise<{ availability: TrainerAvailability; conflicts: AvailabilityConflict[] }> {
    return api.saveTrainerAvailability(staffId, input, requesterUserId);
  },
  listWindows(api: ProtivityPort, staffId: string, from: string, to: string): Promise<LessonSlot[]> {
    return api.listAvailabilityWindows(staffId, from, to);
  },
};
