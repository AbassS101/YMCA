import type {
  AttendanceStatus,
  ClassRegistration,
  ClientFitnessGoal,
  ClientWorkoutLog,
  PrivateLesson,
} from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const trainerRepo = {
  getClassRegistrations(api: ProtivityPort, scheduleItemId: string): Promise<ClassRegistration[]> {
    return api.getClassRegistrations(scheduleItemId);
  },

  markClassAttendance(
    api: ProtivityPort,
    scheduleItemId: string,
    memberId: string,
    status: AttendanceStatus
  ): Promise<void> {
    return api.markClassAttendance(scheduleItemId, memberId, status);
  },

  addWalkIn(
    api: ProtivityPort,
    scheduleItemId: string,
    memberId: string
  ): Promise<ClassRegistration> {
    return api.addWalkInRegistration(scheduleItemId, memberId);
  },

  markLessonStatus(
    api: ProtivityPort,
    lessonId: string,
    status: 'booked' | 'completed' | 'no_show',
    notes?: string
  ): Promise<PrivateLesson> {
    return api.markLessonStatus(lessonId, status, notes);
  },

  bookLessonForMember(
    api: ProtivityPort,
    staffId: string,
    memberId: string,
    slotIdOrCustom: string | { start: string; end: string; location: string }
  ): Promise<PrivateLesson> {
    return api.bookLessonForMember(staffId, memberId, slotIdOrCustom);
  },

  listClientWorkoutLogs(api: ProtivityPort, memberId: string): Promise<ClientWorkoutLog[]> {
    return api.listClientWorkoutLogs(memberId);
  },

  logClientWorkout(
    api: ProtivityPort,
    input: Omit<ClientWorkoutLog, 'id' | 'createdAt'>
  ): Promise<ClientWorkoutLog> {
    return api.logClientWorkout(input);
  },

  deleteClientWorkoutLog(api: ProtivityPort, logId: string): Promise<void> {
    return api.deleteClientWorkoutLog(logId);
  },

  updateClientWorkoutLog(
    api: ProtivityPort,
    logId: string,
    updates: Partial<ClientWorkoutLog>
  ): Promise<ClientWorkoutLog> {
    return api.updateClientWorkoutLog(logId, updates);
  },

  getClientFitnessGoal(api: ProtivityPort, memberId: string): Promise<ClientFitnessGoal | null> {
    return api.getClientFitnessGoal(memberId);
  },

  saveClientFitnessGoal(api: ProtivityPort, goal: ClientFitnessGoal): Promise<ClientFitnessGoal> {
    return api.saveClientFitnessGoal(goal);
  },
};
