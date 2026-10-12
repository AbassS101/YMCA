import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { formatShortDate } from '@/domain/displayDates';
import type {
  Survey,
  SurveyAnswer,
  SurveyResponse,
} from '@/domain/types';
import { surveyRepo, type SurveyAnalytics } from '@/repositories/surveyRepo';
import { colors } from '@/theme/colors';
import { radii, spacing, typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

type MemberAnswerState = {
  selectedOptions?: string[];
  ratingValue?: number;
  textResponse?: string;
};

export default function MemberSurveysScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors: tc, isDark } = useTheme();
  const memberId = session?.userId ?? '';

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [myResponses, setMyResponses] = useState<SurveyResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'completed'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Take Survey Modal
  const [takeModalVisible, setTakeModalVisible] = useState(false);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, MemberAnswerState>>({});
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // View Results Modal
  const [resultsModalVisible, setResultsModalVisible] = useState(false);
  const [analytics, setAnalytics] = useState<SurveyAnalytics | null>(null);
  const [resultsSurvey, setResultsSurvey] = useState<Survey | null>(null);

  const load = useCallback(async () => {
    if (!memberId) return;
    try {
      setError(false);
      setLoading(true);
      const [surveyList, responsesList] = await Promise.all([
        surveyRepo.list(api, BRANCH_ID, false),
        surveyRepo.getMemberResponses(api, memberId),
      ]);
      setSurveys(surveyList);
      setMyResponses(responsesList);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api, memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  const completedSurveyIds = new Set(myResponses.map((r) => r.surveyId));

  const filteredSurveys = surveys.filter((s) => {
    if (activeTab === 'completed') {
      return completedSurveyIds.has(s.id);
    }
    return true;
  });

  function openTakeSurvey(survey: Survey) {
    setActiveSurvey(survey);
    const initialAnswers: Record<string, MemberAnswerState> = {};
    survey.questions.forEach((q) => {
      initialAnswers[q.id] = {
        selectedOptions: [],
        ratingValue: undefined,
        textResponse: '',
      };
    });
    setAnswers(initialAnswers);
    setIsAnonymous(false);
    setFormError(null);
    setTakeModalVisible(true);
  }

  async function openResults(survey: Survey) {
    setResultsSurvey(survey);
    try {
      const respList = await surveyRepo.listResponses(api, survey.id);
      const computed = surveyRepo.calculateAnalytics(survey, respList);
      setAnalytics(computed);
      setResultsModalVisible(true);
    } catch {
      dialog.alert('Error', 'Could not load survey results.', [{ text: 'OK' }]);
    }
  }

  function handleSelectRadio(qId: string, option: string) {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        selectedOptions: [option],
      },
    }));
  }

  function handleToggleCheckbox(qId: string, option: string) {
    setAnswers((prev) => {
      const current = prev[qId]?.selectedOptions ?? [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return {
        ...prev,
        [qId]: {
          ...prev[qId],
          selectedOptions: next,
        },
      };
    });
  }

  function handleSetRating(qId: string, val: number) {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        ratingValue: val,
      },
    }));
  }

  function handleSetText(qId: string, text: string) {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        textResponse: text,
      },
    }));
  }

  async function handleSubmitResponse() {
    if (!activeSurvey) return;

    // Check required questions
    for (let i = 0; i < activeSurvey.questions.length; i++) {
      const q = activeSurvey.questions[i];
      if (q.required) {
        const a = answers[q.id];
        if (q.type === 'single_choice' || q.type === 'multiple_choice') {
          if (!a?.selectedOptions || a.selectedOptions.length === 0) {
            setFormError(`Please select an answer for question #${i + 1}.`);
            return;
          }
        } else if (q.type === 'rating') {
          if (!a?.ratingValue) {
            setFormError(`Please select a star rating for question #${i + 1}.`);
            return;
          }
        } else if (q.type === 'text') {
          if (!a?.textResponse || !a.textResponse.trim()) {
            setFormError(`Please provide your feedback for question #${i + 1}.`);
            return;
          }
        }
      }
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const member = await api.getMember(memberId);
      const formattedAnswers: SurveyAnswer[] = activeSurvey.questions.map((q) => {
        const a = answers[q.id];
        return {
          questionId: q.id,
          selectedOptions: a?.selectedOptions,
          ratingValue: a?.ratingValue,
          textResponse: a?.textResponse?.trim(),
        };
      });

      await surveyRepo.submitResponse(api, {
        surveyId: activeSurvey.id,
        memberId,
        memberName: member?.name ?? 'YMCA Member',
        isAnonymous,
        answers: formattedAnswers,
      });

      setTakeModalVisible(false);
      dialog.alert(
        'Thank You!',
        'Your responses have been recorded. Your voice helps make YMCA Silver Spring a better place for our whole community.',
        [{ text: 'OK' }],
        'checkmark'
      );
      await load();
    } catch (err: any) {
      setFormError(err?.message || 'Could not submit your response.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle="Member Surveys & Branch Polls" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={[styles.back, { color: colors.scarlet }]}>← Back</Text>
        </Pressable>

        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderColor: colors.primary }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.heroIconWrap, { backgroundColor: colors.primary }]}>
              <Ionicons name="chatbubbles" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: tc.text }]}>Your Voice Matters at the Y</Text>
              <Text style={[styles.heroSubtitle, { color: tc.textMuted }]}>
                Participate in short branch polls and member surveys to shape classes, pool hours, and facilities.
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => setActiveTab('all')}
            style={[
              styles.filterTab,
              {
                backgroundColor: activeTab === 'all' ? colors.primary : tc.cardBg,
                borderColor: activeTab === 'all' ? colors.primary : tc.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: activeTab === 'all' ? '#FFFFFF' : tc.text, fontWeight: '700' },
              ]}
            >
              All Polls & Surveys ({surveys.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('completed')}
            style={[
              styles.filterTab,
              {
                backgroundColor: activeTab === 'completed' ? colors.primary : tc.cardBg,
                borderColor: activeTab === 'completed' ? colors.primary : tc.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: activeTab === 'completed' ? '#FFFFFF' : tc.text, fontWeight: '700' },
              ]}
            >
              Completed ({completedSurveyIds.size})
            </Text>
          </Pressable>
        </View>

        {filteredSurveys.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <Ionicons name="checkmark-done-circle-outline" size={40} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: tc.text }]}>No Surveys to Display</Text>
            <Text style={[styles.emptySubtitle, { color: tc.textMuted }]}>
              Check back soon for upcoming community votes and wellness feedback surveys!
            </Text>
          </View>
        ) : (
          filteredSurveys.map((survey) => {
            const hasCompleted = completedSurveyIds.has(survey.id);
            return (
              <View
                key={survey.id}
                style={[
                  styles.card,
                  { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
                  hasCompleted && { borderLeftColor: '#16A34A', borderLeftWidth: 4 },
                ]}
              >
                <View style={styles.badgeRow}>
                  {hasCompleted ? (
                    <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.badgeText, { color: '#15803D' }]}>COMPLETED ✓</Text>
                    </View>
                  ) : survey.isActive ? (
                    <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>OPEN TO VOTE</Text>
                    </View>
                  ) : (
                    <View style={[styles.badge, { backgroundColor: '#F1F5F9' }]}>
                      <Text style={[styles.badgeText, { color: colors.muted }]}>CLOSED</Text>
                    </View>
                  )}

                  <View style={[styles.badge, { backgroundColor: '#F8FAFC' }]}>
                    <Text style={[styles.badgeText, { color: tc.textMuted }]}>
                      {survey.type === 'poll' ? 'QUICK POLL' : 'SURVEY'}
                    </Text>
                  </View>

                  <View style={[styles.badge, { backgroundColor: '#F8FAFC' }]}>
                    <Text style={[styles.badgeText, { color: tc.textMuted }]}>
                      {survey.category.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.cardTitle, { color: tc.text }]}>{survey.title}</Text>
                <Text style={[styles.cardBody, { color: tc.textMuted }]}>{survey.description}</Text>

                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: tc.textMuted }]}>
                    {survey.questions.length} Question{survey.questions.length > 1 ? 's' : ''} · {survey.totalResponses} vote{survey.totalResponses !== 1 ? 's' : ''}
                  </Text>
                  <Text style={[styles.metaText, { color: tc.textMuted }]}>
                    {formatShortDate(survey.createdAt)}
                  </Text>
                </View>

                {/* Action button */}
                <View style={{ marginTop: 6 }}>
                  {hasCompleted ? (
                    <SecondaryButton
                      title="View Community Results ›"
                      onPress={() => void openResults(survey)}
                    />
                  ) : survey.isActive ? (
                    <PrimaryButton
                      title={survey.type === 'poll' ? 'Cast Your Vote Now ›' : 'Take Survey ›'}
                      onPress={() => openTakeSurvey(survey)}
                    />
                  ) : (
                    <SecondaryButton
                      title="View Final Results ›"
                      onPress={() => void openResults(survey)}
                    />
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* MODAL: TAKE SURVEY / POLL                                 */}
      {/* ========================================================= */}
      <Modal
        visible={takeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTakeModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalBox, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.modalTitle, { color: tc.text }]} numberOfLines={1}>
                  {activeSurvey?.title}
                </Text>
                <Text style={[styles.metaText, { color: tc.textMuted }]} numberOfLines={1}>
                  YMCA Silver Spring · Member Feedback
                </Text>
              </View>
              <Pressable
                onPress={() => setTakeModalVisible(false)}
                disabled={submitting}
                hitSlop={10}
              >
                <Ionicons name="close" size={24} color={tc.text} />
              </Pressable>
            </View>

            {formError ? <ErrorBanner message={formError} /> : null}

            <ScrollView
              style={{ maxHeight: 520 }}
              contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
            >
              <Text style={[styles.cardBody, { color: tc.textMuted }]}>
                {activeSurvey?.description}
              </Text>

              {activeSurvey?.questions.map((q, idx) => {
                const ans = answers[q.id];
                return (
                  <View
                    key={q.id}
                    style={[
                      styles.takeQuestionCard,
                      { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: tc.border },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                      <Text style={[styles.questionNumPill, { color: colors.primary }]}>
                        {idx + 1}.
                      </Text>
                      <Text style={[styles.questionPrompt, { color: tc.text, flex: 1 }]}>
                        {q.prompt}
                        {q.required ? <Text style={{ color: colors.scarlet }}> *</Text> : null}
                      </Text>
                    </View>

                    {/* Single Choice (Radio) */}
                    {q.type === 'single_choice' && q.options ? (
                      <View style={{ gap: 8, marginTop: 8 }}>
                        {q.options.map((opt) => {
                          const selected = ans?.selectedOptions?.[0] === opt;
                          return (
                            <Pressable
                              key={opt}
                              onPress={() => handleSelectRadio(q.id, opt)}
                              style={[
                                styles.choiceOptionRow,
                                {
                                  backgroundColor: selected
                                    ? isDark
                                      ? '#1E3A8A'
                                      : '#EFF6FF'
                                    : tc.cardBg,
                                  borderColor: selected ? colors.primary : tc.border,
                                },
                              ]}
                            >
                              <Ionicons
                                name={selected ? 'radio-button-on' : 'radio-button-off'}
                                size={20}
                                color={selected ? colors.primary : tc.textMuted}
                              />
                              <Text
                                style={[
                                  styles.choiceOptionText,
                                  { color: selected ? colors.primary : tc.text, fontWeight: selected ? '700' : '500' },
                                ]}
                              >
                                {opt}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}

                    {/* Multiple Choice (Checkboxes) */}
                    {q.type === 'multiple_choice' && q.options ? (
                      <View style={{ gap: 8, marginTop: 8 }}>
                        <Text style={{ fontSize: 11, color: tc.textMuted }}>Select all that apply:</Text>
                        {q.options.map((opt) => {
                          const checked = (ans?.selectedOptions ?? []).includes(opt);
                          return (
                            <Pressable
                              key={opt}
                              onPress={() => handleToggleCheckbox(q.id, opt)}
                              style={[
                                styles.choiceOptionRow,
                                {
                                  backgroundColor: checked
                                    ? isDark
                                      ? '#1E3A8A'
                                      : '#EFF6FF'
                                    : tc.cardBg,
                                  borderColor: checked ? colors.primary : tc.border,
                                },
                              ]}
                            >
                              <Ionicons
                                name={checked ? 'checkbox' : 'square-outline'}
                                size={20}
                                color={checked ? colors.primary : tc.textMuted}
                              />
                              <Text
                                style={[
                                  styles.choiceOptionText,
                                  { color: checked ? colors.primary : tc.text, fontWeight: checked ? '700' : '500' },
                                ]}
                              >
                                {opt}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}

                    {/* Rating (1-5 stars) */}
                    {q.type === 'rating' ? (
                      <View style={{ marginTop: 8, alignItems: 'center', gap: 6 }}>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          {[1, 2, 3, 4, 5].map((stars) => {
                            const isFilled = (ans?.ratingValue ?? 0) >= stars;
                            return (
                              <Pressable
                                key={stars}
                                onPress={() => handleSetRating(q.id, stars)}
                                hitSlop={6}
                                accessibilityLabel={`Rate ${stars} stars`}
                              >
                                <Ionicons
                                  name={isFilled ? 'star' : 'star-outline'}
                                  size={34}
                                  color={isFilled ? '#EAB308' : tc.textMuted}
                                />
                              </Pressable>
                            );
                          })}
                        </View>
                        <Text style={{ fontSize: 13, color: tc.textMuted, fontWeight: '600' }}>
                          {ans?.ratingValue === 5
                            ? '5 - Excellent!'
                            : ans?.ratingValue === 4
                            ? '4 - Very Good'
                            : ans?.ratingValue === 3
                            ? '3 - Good / Average'
                            : ans?.ratingValue === 2
                            ? '2 - Fair'
                            : ans?.ratingValue === 1
                            ? '1 - Needs Improvement'
                            : 'Tap a star to rate (1 to 5)'}
                        </Text>
                      </View>
                    ) : null}

                    {/* Open Text Feedback */}
                    {q.type === 'text' ? (
                      <View style={{ marginTop: 8 }}>
                        <TextInput
                          value={ans?.textResponse ?? ''}
                          onChangeText={(val) => handleSetText(q.id, val)}
                          placeholder="Type your feedback, ideas, or comments..."
                          placeholderTextColor={colors.muted}
                          multiline
                          numberOfLines={4}
                          style={[
                            styles.textArea,
                            {
                              color: tc.text,
                              backgroundColor: tc.cardBg,
                              borderColor: tc.border,
                            },
                          ]}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })}

              {/* Anonymous Toggle */}
              {activeSurvey?.allowAnonymous ? (
                <Pressable
                  onPress={() => setIsAnonymous(!isAnonymous)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}
                >
                  <Ionicons
                    name={isAnonymous ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={{ fontSize: 14, color: tc.text }}>
                    Submit anonymously (do not attach my name to this response)
                  </Text>
                </Pressable>
              ) : null}

              <View style={{ marginTop: 12 }}>
                <PrimaryButton
                  title="Submit Response"
                  onPress={() => void handleSubmitResponse()}
                  loading={submitting}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: VIEW RESULTS & COMMUNITY SUMMARY                   */}
      {/* ========================================================= */}
      <Modal
        visible={resultsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setResultsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.modalTitle, { color: tc.text }]} numberOfLines={1}>
                  Community Results
                </Text>
                <Text style={[styles.metaText, { color: tc.textMuted }]} numberOfLines={1}>
                  {resultsSurvey?.title}
                </Text>
              </View>
              <Pressable onPress={() => setResultsModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={tc.text} />
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: 520 }}
              contentContainerStyle={{ gap: 14, paddingBottom: 24 }}
            >
              <View style={[styles.resultsHero, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="pie-chart" size={26} color={colors.primary} />
                <View>
                  <Text style={[styles.resultsHeroNumber, { color: colors.primary }]}>
                    {analytics?.totalResponses ?? 0} Votes Recorded
                  </Text>
                  <Text style={[styles.resultsHeroSub, { color: colors.primary }]}>
                    Thank you for voting and sharing your feedback!
                  </Text>
                </View>
              </View>

              {analytics?.questionAnalytics.map((q, idx) => (
                <View
                  key={q.questionId}
                  style={[
                    styles.analyticsQuestionCard,
                    { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: tc.border },
                  ]}
                >
                  <Text style={[styles.questionPrompt, { color: tc.text }]}>
                    {idx + 1}. {q.prompt}
                  </Text>

                  {/* Choice distribution */}
                  {(q.type === 'single_choice' || q.type === 'multiple_choice') && q.optionCounts ? (
                    <View style={{ gap: 8, marginTop: 8 }}>
                      {Object.entries(q.optionCounts).map(([opt, count]) => {
                        const pct = q.optionPercentages?.[opt] || 0;
                        const isTop = q.topOption === opt && count > 0;
                        return (
                          <View key={opt} style={{ gap: 3 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                {isTop ? <Ionicons name="trophy" size={13} color="#D97706" /> : null}
                                <Text style={[styles.optLabel, { color: tc.text, fontWeight: isTop ? '700' : '500' }]} numberOfLines={2}>
                                  {opt}
                                </Text>
                              </View>
                              <Text style={[styles.optPct, { color: colors.primary }]}>
                                {pct}% ({count})
                              </Text>
                            </View>
                            <View style={[styles.progressBarTrack, { backgroundColor: tc.border }]}>
                              <View
                                style={[
                                  styles.progressBarFill,
                                  {
                                    width: `${Math.min(pct, 100)}%`,
                                    backgroundColor: isTop ? '#16A34A' : colors.primary,
                                  },
                                ]}
                              />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}

                  {/* Rating distribution */}
                  {q.type === 'rating' ? (
                    <View style={{ gap: 6, marginTop: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="star" size={22} color="#EAB308" />
                        <Text style={{ fontSize: 20, fontWeight: '800', color: tc.text }}>
                          {q.averageRating ?? 0}
                        </Text>
                        <Text style={{ fontSize: 13, color: tc.textMuted }}>/ 5.0 Average</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              ))}

              <SecondaryButton
                title="Close"
                onPress={() => setResultsModalVisible(false)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    padding: spacing.md,
    gap: 14,
    paddingBottom: 40,
  },
  back: {
    ...typography.body,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroCard: {
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  heroSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 13,
  },
  card: {
    padding: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  metaText: {
    fontSize: 12,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  takeQuestionCard: {
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 6,
  },
  questionNumPill: {
    fontSize: 14,
    fontWeight: '800',
  },
  questionPrompt: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  choiceOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  choiceOptionText: {
    fontSize: 13,
    flex: 1,
  },
  textArea: {
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  resultsHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radii.md,
  },
  resultsHeroNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  resultsHeroSub: {
    fontSize: 12,
    marginTop: 2,
  },
  analyticsQuestionCard: {
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 6,
  },
  optLabel: {
    fontSize: 13,
  },
  optPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
