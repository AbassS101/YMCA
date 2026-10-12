jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { announcementRepo } from '@/repositories/announcementRepo';
import { surveyRepo } from '@/repositories/surveyRepo';
import { resetStore } from '@/storage/demoStore';

beforeEach(async () => {
  await resetStore();
});

describe('Staff Member Surveys and App-Open Pop-up Notices', () => {
  describe('Staff Member Surveys & Polls', () => {
    test('Staff can create a new member survey with multiple question types', async () => {
      const api = new MockProtivityAdapter();

      const created = await surveyRepo.create(api, {
        title: 'New Strength & Functional Fitness Zone Feedback',
        description: 'Help our trainers choose which equipment to expand in the free weights zone.',
        branchId: 'silver-spring',
        type: 'survey',
        category: 'fitness',
        targetAudience: 'All Active Members',
        createdByStaffId: 'staff-admin',
        createdByStaffName: 'Jane Smith (Director)',
        isActive: true,
        allowAnonymous: true,
        questions: [
          {
            id: 'q1',
            prompt: 'Which barbell and dumbbell exercises do you prioritize?',
            type: 'multiple_choice',
            options: ['Deadlifts & Squats', 'Overhead Press & Bench', 'Kettlebell Swings', 'Olympic Lifting'],
            required: true,
          },
          {
            id: 'q2',
            prompt: 'How satisfied are you with weight room peak hour availability?',
            type: 'rating',
            required: true,
          },
          {
            id: 'q3',
            prompt: 'Any additional equipment requests?',
            type: 'text',
            required: false,
          },
        ],
      });

      expect(created.id).toBeDefined();
      expect(created.title).toBe('New Strength & Functional Fitness Zone Feedback');
      expect(created.questions.length).toBe(3);
      expect(created.isActive).toBe(true);
      expect(created.totalResponses).toBe(0);

      // Verify list returns the new survey
      const list = await surveyRepo.list(api, 'silver-spring');
      expect(list.some((s) => s.id === created.id)).toBe(true);
    });

    test('Staff can toggle survey active and closed status', async () => {
      const api = new MockProtivityAdapter();

      const list = await surveyRepo.list(api, 'silver-spring');
      const first = list[0];
      expect(first.isActive).toBe(true);

      // Close survey
      const closed = await surveyRepo.updateStatus(api, first.id, false);
      expect(closed.isActive).toBe(false);

      // Verify onlyActive filter excludes it
      const activeOnly = await surveyRepo.list(api, 'silver-spring', true);
      expect(activeOnly.some((s) => s.id === first.id)).toBe(false);

      // Reopen survey
      const reopened = await surveyRepo.updateStatus(api, first.id, true);
      expect(reopened.isActive).toBe(true);
    });

    test('Members can submit responses to a survey and calculate accurate analytics', async () => {
      const api = new MockProtivityAdapter();

      const survey = await surveyRepo.create(api, {
        title: 'Saturday Aqua Aerobics Format Poll',
        description: 'Vote on preferred pool music and intensity.',
        branchId: 'silver-spring',
        type: 'poll',
        category: 'aquatics',
        targetAudience: 'Swimmers & Seniors',
        createdByStaffId: 'staff-admin',
        createdByStaffName: 'Jane Smith (Director)',
        isActive: true,
        allowAnonymous: false,
        questions: [
          {
            id: 'q_music',
            prompt: 'Which music style do you enjoy during morning water fitness?',
            type: 'single_choice',
            options: ['70s/80s Pop Classics', 'Upbeat Latin & Zumba', 'Instrumental & Calming'],
            required: true,
          },
          {
            id: 'q_rate',
            prompt: 'Rate the pool water temperature for aerobics:',
            type: 'rating',
            required: true,
          },
          {
            id: 'q_comments',
            prompt: 'Instructor notes or special requests:',
            type: 'text',
            required: false,
          },
        ],
      });

      // Member 1 response
      await surveyRepo.submitResponse(api, {
        surveyId: survey.id,
        memberId: 'member-carlos',
        memberName: 'Carlos Mendoza',
        isAnonymous: false,
        answers: [
          { questionId: 'q_music', selectedOptions: ['70s/80s Pop Classics'] },
          { questionId: 'q_rate', ratingValue: 5 },
          { questionId: 'q_comments', textResponse: 'Great energy from Coach Emily!' },
        ],
      });

      // Member 2 response
      await surveyRepo.submitResponse(api, {
        surveyId: survey.id,
        memberId: 'member-sarah',
        memberName: 'Sarah Jenkins',
        isAnonymous: true,
        answers: [
          { questionId: 'q_music', selectedOptions: ['70s/80s Pop Classics'] },
          { questionId: 'q_rate', ratingValue: 4 },
          { questionId: 'q_comments', textResponse: 'Love the Saturday schedule!' },
        ],
      });

      // Member 3 response
      await surveyRepo.submitResponse(api, {
        surveyId: survey.id,
        memberId: 'member-amanda',
        memberName: 'Amanda Foster',
        isAnonymous: false,
        answers: [
          { questionId: 'q_music', selectedOptions: ['Upbeat Latin & Zumba'] },
          { questionId: 'q_rate', ratingValue: 3 },
          { questionId: 'q_comments', textResponse: 'Water temperature was perfect.' },
        ],
      });

      // Check responses list
      const responses = await surveyRepo.listResponses(api, survey.id);
      expect(responses.length).toBe(3);

      // Verify member cannot submit duplicate response
      await expect(
        surveyRepo.submitResponse(api, {
          surveyId: survey.id,
          memberId: 'member-carlos',
          memberName: 'Carlos Mendoza',
          isAnonymous: false,
          answers: [{ questionId: 'q_music', selectedOptions: ['Upbeat Latin & Zumba'] }],
        })
      ).rejects.toThrow('already submitted a response');

      // Calculate analytics
      const analytics = surveyRepo.calculateAnalytics(survey, responses);
      expect(analytics.totalResponses).toBe(3);

      // Check Q1 Choice analytics
      const q1Analytics = analytics.questionAnalytics.find((q) => q.questionId === 'q_music');
      expect(q1Analytics).toBeDefined();
      expect(q1Analytics?.totalAnswers).toBe(3);
      expect(q1Analytics?.optionCounts?.['70s/80s Pop Classics']).toBe(2);
      expect(q1Analytics?.optionCounts?.['Upbeat Latin & Zumba']).toBe(1);
      expect(q1Analytics?.optionPercentages?.['70s/80s Pop Classics']).toBe(67);
      expect(q1Analytics?.topOption).toBe('70s/80s Pop Classics');

      // Check Q2 Rating analytics (5, 4, 3 => average 4.0)
      const q2Analytics = analytics.questionAnalytics.find((q) => q.questionId === 'q_rate');
      expect(q2Analytics).toBeDefined();
      expect(q2Analytics?.totalAnswers).toBe(3);
      expect(q2Analytics?.averageRating).toBe(4);
      expect(q2Analytics?.ratingDistribution?.[5]).toBe(1);
      expect(q2Analytics?.ratingDistribution?.[4]).toBe(1);
      expect(q2Analytics?.ratingDistribution?.[3]).toBe(1);

      // Check Q3 Text comments
      const q3Analytics = analytics.questionAnalytics.find((q) => q.questionId === 'q_comments');
      expect(q3Analytics?.totalAnswers).toBe(3);
      expect(q3Analytics?.textFeedbacks?.length).toBe(3);
      expect(q3Analytics?.textFeedbacks?.[0].memberName).toBe('Carlos Mendoza');
      expect(q3Analytics?.textFeedbacks?.[1].memberName).toBe('Anonymous Member');
      expect(q3Analytics?.textFeedbacks?.[2].memberName).toBe('Amanda Foster');
    });

    test('Staff can delete a survey and its responses', async () => {
      const api = new MockProtivityAdapter();
      const survey = await surveyRepo.create(api, {
        title: 'Temporary Test Survey',
        description: 'To be deleted',
        branchId: 'silver-spring',
        type: 'poll',
        category: 'general',
        createdByStaffId: 'staff-admin',
        createdByStaffName: 'Jane Smith',
        isActive: true,
        questions: [{ id: 'q1', prompt: 'Test?', type: 'single_choice', options: ['A', 'B'] }],
      });

      await surveyRepo.delete(api, survey.id);
      const fetched = await surveyRepo.get(api, survey.id);
      expect(fetched).toBeNull();
    });
  });

  describe('App-Open Pop-up Notices', () => {
    test('Staff can broadcast an announcement marked with popupNotice: true', async () => {
      const api = new MockProtivityAdapter();

      const created = await announcementRepo.create(api, {
        branchId: 'silver-spring',
        title: 'Emergency Pool Maintenance: Friday 1 PM - 4 PM',
        body: 'Lap pool lanes 1-4 will be closed for routine filter backwashing.',
        category: 'facility',
        priority: 'urgent',
        authorName: 'Pat Nguyen (Aquatics Director)',
        pinned: true,
        popupNotice: true,
        actionLabel: 'Check Alternative Hours',
        actionUrl: '/(member)/branch-amenities',
      });

      expect(created.id).toBeDefined();
      expect(created.popupNotice).toBe(true);
      expect(created.priority).toBe('urgent');

      const anns = await announcementRepo.list(api, 'silver-spring');
      const found = anns.find((a) => a.id === created.id);
      expect(found).toBeDefined();
      expect(found?.popupNotice).toBe(true);
    });

    test('Staff can toggle popupNotice on existing announcements', async () => {
      const api = new MockProtivityAdapter();
      const anns = await announcementRepo.list(api, 'silver-spring');
      const target = anns[0];

      // Enable popup
      const updatedOn = await announcementRepo.update(api, target.id, { popupNotice: true });
      expect(updatedOn.popupNotice).toBe(true);

      // Disable popup
      const updatedOff = await announcementRepo.update(api, target.id, { popupNotice: false });
      expect(updatedOff.popupNotice).toBe(false);
    });

    test('Seed data includes a popup notice for members on launch', async () => {
      const api = new MockProtivityAdapter();
      const anns = await announcementRepo.list(api, 'silver-spring');
      const popups = anns.filter((a) => a.popupNotice);

      expect(popups.length).toBeGreaterThan(0);
      expect(popups.some((p) => p.title.includes('Turkey Chase'))).toBe(true);
    });
  });
});
