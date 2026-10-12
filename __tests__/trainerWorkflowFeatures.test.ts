jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { trainerRepo } from '@/repositories/trainerRepo';
import { resetStore } from '@/storage/demoStore';

describe('Trainer Workflow & Capabilities', () => {
  let adapter: MockProtivityAdapter;

  beforeEach(async () => {
    await AsyncStorage.clear();
    await resetStore();
    adapter = new MockProtivityAdapter();
  });

  describe('1. Class Attendance & Walk-In Registration', () => {
    it('allows trainer to track attendance and register walk-ins', async () => {
      // Register member for BodyPump
      await adapter.registerForClass('member-jordan', 'sched-bodypump-mon');

      // Check initial attendance status
      let regs = await trainerRepo.getClassRegistrations(adapter, 'sched-bodypump-mon');
      expect(regs).toHaveLength(1);
      expect(regs[0].attendanceStatus).toBeUndefined();

      // Mark attended
      await trainerRepo.markClassAttendance(adapter, 'sched-bodypump-mon', 'member-jordan', 'attended');
      regs = await trainerRepo.getClassRegistrations(adapter, 'sched-bodypump-mon');
      expect(regs[0].attendanceStatus).toBe('attended');
      expect(regs[0].checkedInAt).toBeDefined();

      // Mark no-show
      await trainerRepo.markClassAttendance(adapter, 'sched-bodypump-mon', 'member-jordan', 'no_show');
      regs = await trainerRepo.getClassRegistrations(adapter, 'sched-bodypump-mon');
      expect(regs[0].attendanceStatus).toBe('no_show');

      // Add walk-in attendee
      const walkIn = await trainerRepo.addWalkIn(adapter, 'sched-bodypump-mon', 'guest-taylor');
      expect(walkIn.status).toBe('registered');
      expect(walkIn.attendanceStatus).toBe('attended');

      regs = await trainerRepo.getClassRegistrations(adapter, 'sched-bodypump-mon');
      expect(regs).toHaveLength(2);
    });
  });

  describe('2. Private Lesson Completion & Status Updates', () => {
    it('allows trainer to mark lesson completed or no-show and record session notes', async () => {
      // Book a slot
      const lesson = await adapter.bookPrivateLesson('member-jordan', 'slot-alex-tue-1000');
      expect(lesson.status).toBe('booked');

      // Mark completed with session debrief
      const completed = await trainerRepo.markLessonStatus(
        adapter,
        lesson.id,
        'completed',
        'Focused on kettlebell deadlifts and thoracic spine mobility.'
      );
      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeDefined();
      expect(completed.notes).toContain('kettlebell deadlifts');

      // Verify listStaffLessons still includes completed lessons for the day
      const staffLessons = await adapter.listStaffLessons('staff-alex', '2026-09-15');
      expect(staffLessons.some((l) => l.id === lesson.id)).toBe(true);
    });

    it('allows trainer to book private session directly for a client with custom timing', async () => {
      const booked = await trainerRepo.bookLessonForMember(adapter, 'staff-alex', 'member-jordan', {
        start: '2026-09-16T15:00:00-04:00',
        end: '2026-09-16T16:00:00-04:00',
        location: 'Wellness Studio B',
      });
      expect(booked.id).toBeDefined();
      expect(booked.status).toBe('booked');
      expect(booked.location).toBe('Wellness Studio B');

      // Verify notification sent to member
      const notifs = await adapter.listNotifications('member-jordan');
      const found = notifs.find((n) => n.title.includes('New Private Session Booked'));
      expect(found).toBeDefined();
    });
  });

  describe('3. Client Workout Logs & Progressive Overload Tracking', () => {
    it('logs workout sessions with exercises and retrieves client history', async () => {
      const initialLogs = await trainerRepo.listClientWorkoutLogs(adapter, 'member-jordan');
      expect(initialLogs.length).toBeGreaterThan(0);

      const created = await trainerRepo.logClientWorkout(adapter, {
        memberId: 'member-jordan',
        trainerId: 'staff-alex',
        trainerName: 'Alex Rivera',
        date: '2026-09-14',
        sessionType: 'strength',
        title: 'Bench Press & Core Strength',
        notes: 'Great bar path on bench press today. Client completed all reps without shoulder strain.',
        exercises: [
          { name: 'Barbell Flat Bench Press', sets: 4, reps: '8', weight: '135 lbs' },
          { name: 'Dumbbell Hammer Curls', sets: 3, reps: '12', weight: '30 lbs ea' },
          { name: 'Cable Woodchoppers', sets: 3, reps: '15/side', weight: '35 lbs' },
        ],
        rpe: 8,
        clientFeedback: 'Felt very energized, bench press was smooth.',
      });

      expect(created.id).toBeDefined();
      expect(created.title).toBe('Bench Press & Core Strength');

      const updatedLogs = await trainerRepo.listClientWorkoutLogs(adapter, 'member-jordan');
      expect(updatedLogs[0].id).toBe(created.id);
      expect(updatedLogs[0].exercises).toHaveLength(3);

      // Delete log
      await trainerRepo.deleteClientWorkoutLog(adapter, created.id);
      const afterDelete = await trainerRepo.listClientWorkoutLogs(adapter, 'member-jordan');
      expect(afterDelete.some((l) => l.id === created.id)).toBe(false);
    });

    it('allows members to self-log workouts and update reflections on coach logs', async () => {
      // 1. Member logs their own self-directed workout
      const selfLog = await trainerRepo.logClientWorkout(adapter, {
        memberId: 'member-jordan',
        date: '2026-09-15',
        sessionType: 'self-directed',
        title: 'Morning 5K Treadmill & Ab Circuit',
        notes: 'Felt great! Completed 5K in 27:30.',
        exercises: [
          { name: 'Treadmill Incline Run', sets: 1, reps: '5K', weight: '27:30' },
          { name: 'Hanging Leg Raises', sets: 3, reps: '15', weight: 'Bodyweight' },
        ],
        rpe: 7,
        loggedBy: 'member',
        clientFeedback: 'Good aerobic stamina today.',
      });

      expect(selfLog.id).toBeDefined();
      expect(selfLog.loggedBy).toBe('member');

      // 2. Member updates reflection on self-logged workout
      const updatedSelfLog = await trainerRepo.updateClientWorkoutLog(adapter, selfLog.id, {
        clientFeedback: 'Legs were slightly tired in final kilometer, otherwise strong pace.',
        rpe: 8,
      });

      expect(updatedSelfLog.clientFeedback).toContain('final kilometer');
      expect(updatedSelfLog.rpe).toBe(8);

      // 3. Member adds a reflection to an existing coach-led session
      const logs = await trainerRepo.listClientWorkoutLogs(adapter, 'member-jordan');
      const coachLog = logs.find((l) => l.trainerId === 'staff-alex');
      expect(coachLog).toBeDefined();

      if (coachLog) {
        const updatedCoachLog = await trainerRepo.updateClientWorkoutLog(adapter, coachLog.id, {
          clientFeedback: 'Squats felt stable; lower back felt 100% fine the next morning!',
        });
        expect(updatedCoachLog.clientFeedback).toContain('lower back felt 100% fine');
      }
    });

    it('allows trainers to edit workout log exercises, loads, and coaching debrief', async () => {
      const logs = await trainerRepo.listClientWorkoutLogs(adapter, 'member-jordan');
      const targetLog = logs[0];
      expect(targetLog).toBeDefined();

      const updated = await trainerRepo.updateClientWorkoutLog(adapter, targetLog.id, {
        title: 'Updated Heavy Squat & Hamstring Session',
        notes: 'Increased back squat working weight from 155 lbs to 165 lbs with pristine depth.',
        exercises: [
          { name: 'Barbell Back Squat', sets: 4, reps: '6-8', weight: '165 lbs' },
          { name: 'Romanian Deadlift', sets: 3, reps: '10', weight: '50 lbs ea' },
        ],
        rpe: 9,
      });

      expect(updated.title).toBe('Updated Heavy Squat & Hamstring Session');
      expect(updated.exercises?.[0].weight).toBe('165 lbs');
      expect(updated.rpe).toBe(9);
    });
  });

  describe('4. Client Fitness Goals & Coaching Assessments', () => {
    it('manages client fitness goals, target dates, and medical/injury notes', async () => {
      const goal = await trainerRepo.getClientFitnessGoal(adapter, 'member-jordan');
      expect(goal).toBeDefined();
      expect(goal?.primaryGoal).toContain('Functional strength');

      const updated = await trainerRepo.saveClientFitnessGoal(adapter, {
        memberId: 'member-jordan',
        primaryGoal: 'Prep for 10K race and increase deadlift 1RM',
        targetDate: '2027-01-31',
        injuriesOrLimitations: 'Knee tracking - continue single leg split squats',
        currentWeightLbs: 167,
        targetWeightLbs: 160,
        notes: 'Running 3x a week, lifting 2x a week with Alex.',
        updatedAt: new Date().toISOString(),
      });

      expect(updated.primaryGoal).toBe('Prep for 10K race and increase deadlift 1RM');
      expect(updated.targetWeightLbs).toBe(160);

      const reloaded = await trainerRepo.getClientFitnessGoal(adapter, 'member-jordan');
      expect(reloaded?.targetWeightLbs).toBe(160);
    });

    it('allows members to create and edit personal goals, weight targets, and motivation', async () => {
      const memberSavedGoal = await trainerRepo.saveClientFitnessGoal(adapter, {
        memberId: 'member-carlos',
        primaryGoal: 'Build upper chest, shoulders, and run 5 miles weekly',
        category: 'strength',
        targetDate: '2026-11-30',
        startWeightLbs: 185,
        currentWeightLbs: 180,
        targetWeightLbs: 172,
        memberNotes: 'Wants to improve endurance for summer soccer league and deadlift 275 lbs.',
        updatedBy: 'member',
        updatedByName: 'Carlos Mendoza',
        updatedAt: new Date().toISOString(),
      });

      expect(memberSavedGoal.memberId).toBe('member-carlos');
      expect(memberSavedGoal.category).toBe('strength');
      expect(memberSavedGoal.startWeightLbs).toBe(185);
      expect(memberSavedGoal.targetWeightLbs).toBe(172);
      expect(memberSavedGoal.memberNotes).toContain('soccer league');
      expect(memberSavedGoal.updatedBy).toBe('member');
    });

    it('allows trainers to add specific movement and safety warnings with severity levels', async () => {
      const goalWithWarnings = await trainerRepo.saveClientFitnessGoal(adapter, {
        memberId: 'member-jordan',
        primaryGoal: 'Functional strength, core stability & 5K cardiovascular endurance',
        category: 'strength',
        injuriesOrLimitations: 'Mild left rotator cuff impingement',
        specificWarnings: [
          {
            id: 'warn-1',
            text: 'Avoid behind-the-neck presses or extreme external shoulder rotation under heavy load.',
            severity: 'high',
            createdBy: 'trainer',
            authorName: 'Coach Alex Rivera',
          },
          {
            id: 'warn-2',
            text: 'Perform 5-min resistance band rotator cuff activation prior to all pushing movements.',
            severity: 'moderate',
            createdBy: 'trainer',
            authorName: 'Coach Alex Rivera',
          },
        ],
        notes: 'Periodization cycle 1: 4 weeks hypertrophy, 4 weeks strength.',
        updatedBy: 'trainer',
        updatedByName: 'Alex Rivera',
        updatedAt: new Date().toISOString(),
      });

      expect(goalWithWarnings.specificWarnings).toHaveLength(2);
      expect(goalWithWarnings.specificWarnings?.[0].severity).toBe('high');
      expect(goalWithWarnings.specificWarnings?.[1].severity).toBe('moderate');

      // Verify reloaded from repository
      const reloaded = await trainerRepo.getClientFitnessGoal(adapter, 'member-jordan');
      expect(reloaded?.specificWarnings).toHaveLength(2);
      expect(reloaded?.specificWarnings?.[0].text).toContain('behind-the-neck presses');
    });

    it('enables clients to view workouts and goal milestones set by their trainer', async () => {
      // Client (member-jordan) checks their logs
      const memberLogs = await trainerRepo.listClientWorkoutLogs(adapter, 'member-jordan');
      expect(memberLogs.length).toBeGreaterThan(0);
      expect(memberLogs[0].trainerName).toBe('Alex Rivera');
      expect(memberLogs[0].exercises?.length).toBeGreaterThan(0);

      // Client checks their goals
      const memberGoal = await trainerRepo.getClientFitnessGoal(adapter, 'member-jordan');
      expect(memberGoal).not.toBeNull();
      expect(memberGoal?.currentWeightLbs).toBeDefined();
    });

    it('allows trainer to add available lesson slots and client to book them', async () => {
      const newSlot = await adapter.addLessonSlot({
        staffId: 'staff-alex',
        branchId: 'silver-spring',
        start: '2026-09-17T11:00:00-04:00',
        end: '2026-09-17T12:00:00-04:00',
        location: 'Wellness Studio A',
      });
      expect(newSlot.id).toBeDefined();

      const slots = await adapter.listLessonSlots('staff-alex', '2026-09-17', '2026-09-17');
      expect(slots.some((s) => s.id === newSlot.id)).toBe(true);

      const bookedLesson = await adapter.bookPrivateLesson('member-jordan', newSlot.id);
      expect(bookedLesson.status).toBe('booked');
      expect(bookedLesson.location).toBe('Wellness Studio A');
    });
  });
});
