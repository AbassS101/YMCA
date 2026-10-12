import type { Survey, SurveyQuestion, SurveyResponse } from '@/domain/types';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export type QuestionAnalytics = {
  questionId: string;
  prompt: string;
  type: string;
  totalAnswers: number;
  // For single_choice / multiple_choice:
  optionCounts?: Record<string, number>;
  optionPercentages?: Record<string, number>;
  topOption?: string;
  // For rating:
  averageRating?: number;
  ratingDistribution?: Record<number, number>; // 1 -> count, 2 -> count, ...
  // For text feedback:
  textFeedbacks?: {
    text: string;
    memberName: string;
    isAnonymous: boolean;
    submittedAt: string;
  }[];
};

export type SurveyAnalytics = {
  surveyId: string;
  totalResponses: number;
  questionAnalytics: QuestionAnalytics[];
};

export const surveyRepo = {
  list(api: ProtivityPort, branchId?: string, onlyActive?: boolean): Promise<Survey[]> {
    return api.listSurveys(branchId, onlyActive);
  },

  get(api: ProtivityPort, id: string): Promise<Survey | null> {
    return api.getSurvey(id);
  },

  create(
    api: ProtivityPort,
    input: Omit<Survey, 'id' | 'createdAt' | 'totalResponses'>
  ): Promise<Survey> {
    return api.createSurvey(input);
  },

  updateStatus(api: ProtivityPort, id: string, isActive: boolean): Promise<Survey> {
    return api.updateSurveyStatus(id, isActive);
  },

  delete(api: ProtivityPort, id: string): Promise<void> {
    return api.deleteSurvey(id);
  },

  listResponses(api: ProtivityPort, surveyId: string): Promise<SurveyResponse[]> {
    return api.listSurveyResponses(surveyId);
  },

  submitResponse(
    api: ProtivityPort,
    input: Omit<SurveyResponse, 'id' | 'submittedAt'>
  ): Promise<SurveyResponse> {
    return api.submitSurveyResponse(input);
  },

  getMemberResponses(api: ProtivityPort, memberId: string): Promise<SurveyResponse[]> {
    return api.getMemberSurveyResponses(memberId);
  },

  calculateAnalytics(survey: Survey, responses: SurveyResponse[]): SurveyAnalytics {
    const questionAnalytics: QuestionAnalytics[] = survey.questions.map((q: SurveyQuestion) => {
      if (q.type === 'single_choice' || q.type === 'multiple_choice') {
        const optionCounts: Record<string, number> = {};
        (q.options ?? []).forEach((opt) => {
          optionCounts[opt] = 0;
        });

        let totalAnswers = 0;
        responses.forEach((resp) => {
          const ans = resp.answers.find((a) => a.questionId === q.id);
          if (ans?.selectedOptions && ans.selectedOptions.length > 0) {
            totalAnswers++;
            ans.selectedOptions.forEach((opt) => {
              optionCounts[opt] = (optionCounts[opt] || 0) + 1;
            });
          }
        });

        const optionPercentages: Record<string, number> = {};
        let topOption = '';
        let topCount = -1;

        (q.options ?? []).forEach((opt) => {
          const count = optionCounts[opt] || 0;
          optionPercentages[opt] = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
          if (count > topCount) {
            topCount = count;
            topOption = opt;
          }
        });

        return {
          questionId: q.id,
          prompt: q.prompt,
          type: q.type,
          totalAnswers,
          optionCounts,
          optionPercentages,
          topOption: topCount > 0 ? topOption : undefined,
        };
      }

      if (q.type === 'rating') {
        const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let sum = 0;
        let count = 0;

        responses.forEach((resp) => {
          const ans = resp.answers.find((a) => a.questionId === q.id);
          if (ans?.ratingValue && ans.ratingValue >= 1 && ans.ratingValue <= 5) {
            const val = Math.round(ans.ratingValue);
            ratingDistribution[val] = (ratingDistribution[val] || 0) + 1;
            sum += ans.ratingValue;
            count++;
          }
        });

        const averageRating = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

        return {
          questionId: q.id,
          prompt: q.prompt,
          type: q.type,
          totalAnswers: count,
          averageRating,
          ratingDistribution,
        };
      }

      if (q.type === 'text') {
        const textFeedbacks: {
          text: string;
          memberName: string;
          isAnonymous: boolean;
          submittedAt: string;
        }[] = [];

        responses.forEach((resp) => {
          const ans = resp.answers.find((a) => a.questionId === q.id);
          if (ans?.textResponse && ans.textResponse.trim()) {
            textFeedbacks.push({
              text: ans.textResponse.trim(),
              memberName: resp.isAnonymous ? 'Anonymous Member' : resp.memberName,
              isAnonymous: resp.isAnonymous,
              submittedAt: resp.submittedAt,
            });
          }
        });

        return {
          questionId: q.id,
          prompt: q.prompt,
          type: q.type,
          totalAnswers: textFeedbacks.length,
          textFeedbacks,
        };
      }

      return {
        questionId: q.id,
        prompt: q.prompt,
        type: q.type,
        totalAnswers: 0,
      };
    });

    return {
      surveyId: survey.id,
      totalResponses: responses.length,
      questionAnalytics,
    };
  },
};
