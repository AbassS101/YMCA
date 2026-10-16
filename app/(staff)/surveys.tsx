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
import { TextField } from '@/components/TextField';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { formatShortDate } from '@/domain/displayDates';
import {
  SURVEY_CATEGORIES,
  type Survey,
  type SurveyCategory,
  type SurveyQuestion,
  type SurveyQuestionType,
  type SurveyType,
} from '@/domain/types';
import { announcementRepo } from '@/repositories/announcementRepo';
import { surveyRepo, type SurveyAnalytics } from '@/repositories/surveyRepo';
import { colors } from '@/theme/colors';
import { radii, spacing, typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

type FilterTab = 'all' | 'active' | 'closed';

type DraftQuestion = {
  id: string;
  prompt: string;
  type: SurveyQuestionType;
  options: string[];
  required: boolean;
};

export default function StaffSurveysScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const { colors: tc, isDark } = useTheme();
  const staffId = session?.userId ?? '';

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Create Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [surveyType, setSurveyType] = useState<SurveyType>('poll');
  const [category, setCategory] = useState<SurveyCategory>('general');
  const [targetAudience, setTargetAudience] = useState('All Active Members');
  const [allowAnonymous, setAllowAnonymous] = useState(true);
  const [broadcastNotice, setBroadcastNotice] = useState(true);
  const [popupAlert, setPopupAlert] = useState(true);
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    {
      id: 'q1',
      prompt: '',
      type: 'single_choice',
      options: ['Option 1', 'Option 2'],
      required: true,
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Analytics Modal State
  const [analyticsModalVisible, setAnalyticsModalVisible] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [analytics, setAnalytics] = useState<SurveyAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      setLoading(true);
      const list = await surveyRepo.list(api, BRANCH_ID);
      setSurveys(list);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredSurveys = surveys.filter((s) => {
    if (filter === 'active') return s.isActive;
    if (filter === 'closed') return !s.isActive;
    return true;
  });

  function openCreate() {
    setTitle('');
    setDescription('');
    setSurveyType('poll');
    setCategory('general');
    setTargetAudience('All Active Members');
    setAllowAnonymous(true);
    setBroadcastNotice(true);
    setPopupAlert(true);
    setQuestions([
      {
        id: 'q1',
        prompt: '',
        type: 'single_choice',
        options: ['Option 1', 'Option 2'],
        required: true,
      },
    ]);
    setModalError(null);
    setCreateModalVisible(true);
  }

  function handleAddQuestion() {
    const nextIndex = questions.length + 1;
    setQuestions((prev) => [
      ...prev,
      {
        id: `q${Date.now()}_${nextIndex}`,
        prompt: '',
        type: 'single_choice',
        options: ['Option 1', 'Option 2'],
        required: true,
      },
    ]);
  }

  function handleRemoveQuestion(idx: number) {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleQuestionChange<K extends keyof DraftQuestion>(
    idx: number,
    key: K,
    val: DraftQuestion[K]
  ) {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: val };
      return copy;
    });
  }

  function handleAddOption(qIdx: number) {
    setQuestions((prev) => {
      const copy = [...prev];
      const nextOptNum = (copy[qIdx].options?.length || 0) + 1;
      copy[qIdx] = {
        ...copy[qIdx],
        options: [...copy[qIdx].options, `Option ${nextOptNum}`],
      };
      return copy;
    });
  }

  function handleOptionChange(qIdx: number, optIdx: number, text: string) {
    setQuestions((prev) => {
      const copy = [...prev];
      const opts = [...copy[qIdx].options];
      opts[optIdx] = text;
      copy[qIdx] = { ...copy[qIdx], options: opts };
      return copy;
    });
  }

  function handleRemoveOption(qIdx: number, optIdx: number) {
    setQuestions((prev) => {
      const copy = [...prev];
      if (copy[qIdx].options.length <= 2) {
        return copy; // Keep at least 2 choices
      }
      copy[qIdx] = {
        ...copy[qIdx],
        options: copy[qIdx].options.filter((_, i) => i !== optIdx),
      };
      return copy;
    });
  }

  async function handleSaveSurvey() {
    if (!title.trim()) {
      setModalError('Please enter a survey or poll title.');
      return;
    }
    if (!description.trim()) {
      setModalError('Please provide a brief description.');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) {
        setModalError(`Question #${i + 1} requires a question prompt.`);
        return;
      }
      if (q.type === 'single_choice' || q.type === 'multiple_choice') {
        const validOpts = q.options.filter((o) => o.trim().length > 0);
        if (validOpts.length < 2) {
          setModalError(`Question #${i + 1} must have at least 2 choices.`);
          return;
        }
      }
    }

    setSubmitting(true);
    setModalError(null);

    try {
      const staff = await api.getStaff(staffId).catch(() => null);
      const staffName = staff ? `${staff.name} (${staff.roleLabel || 'Staff'})` : 'YMCA Staff';

      const finalQuestions: SurveyQuestion[] = questions.map((q, idx) => ({
        id: `q_${Date.now()}_${idx}`,
        prompt: q.prompt.trim(),
        type: q.type,
        options:
          q.type === 'single_choice' || q.type === 'multiple_choice'
            ? q.options.map((o) => o.trim()).filter(Boolean)
            : undefined,
        required: q.required,
      }));

      const created = await surveyRepo.create(api, {
        title: title.trim(),
        description: description.trim(),
        branchId: BRANCH_ID,
        type: surveyType,
        category,
        targetAudience: targetAudience.trim() || 'All Active Members',
        questions: finalQuestions,
        createdByStaffId: staffId,
        createdByStaffName: staffName,
        isActive: true,
        allowAnonymous,
      });

      // Optionally broadcast notice / popup alert so members see it immediately!
      if (broadcastNotice) {
        await announcementRepo.create(api, {
          branchId: BRANCH_ID,
          title: `New ${surveyType === 'poll' ? 'Member Poll' : 'Member Survey'}: ${title.trim()}`,
          body: description.trim(),
          category: 'community',
          priority: popupAlert ? 'high' : 'normal',
          authorName: staffName,
          pinned: true,
          popupNotice: popupAlert,
          actionLabel: 'Take Survey Now',
          actionUrl: '/(member)/surveys',
        });
      }

      setCreateModalVisible(false);
      dialog.alert(
        'Survey Published!',
        popupAlert
          ? 'Survey created and broadcast notice scheduled to pop up for members upon opening the app!'
          : 'Survey successfully created and published for branch members.',
        [{ text: 'OK' }],
        'checkmark'
      );
      await load();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to publish survey.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(item: Survey) {
    try {
      const nextStatus = !item.isActive;
      await surveyRepo.updateStatus(api, item.id, nextStatus);
      dialog.alert(
        nextStatus ? 'Survey Reopened' : 'Survey Closed',
        nextStatus
          ? 'Members can now submit responses again.'
          : 'Survey closed. No new responses will be accepted.',
        [{ text: 'OK' }],
        'checkmark'
      );
      await load();
    } catch {
      dialog.alert('Error', 'Could not update survey status.', [{ text: 'OK' }]);
    }
  }

  async function handleDelete(item: Survey) {
    try {
      await surveyRepo.delete(api, item.id);
      dialog.alert('Deleted', 'Survey and associated responses removed.', [{ text: 'OK' }], 'checkmark');
      await load();
    } catch {
      dialog.alert('Error', 'Could not delete survey.', [{ text: 'OK' }]);
    }
  }

  async function openAnalytics(item: Survey) {
    setSelectedSurvey(item);
    setLoadingAnalytics(true);
    setAnalyticsModalVisible(true);
    try {
      const responses = await surveyRepo.listResponses(api, item.id);
      const computed = surveyRepo.calculateAnalytics(item, responses);
      setAnalytics(computed);
    } catch {
      dialog.alert('Error', 'Failed to load survey analytics.', [{ text: 'OK' }]);
    } finally {
      setLoadingAnalytics(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle="Staff Operations · Member Surveys & Polls" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={[styles.back, { color: colors.scarlet }]}>← Back to Dashboard</Text>
        </Pressable>

        {/* Create Survey Banner Button */}
        <Pressable
          onPress={openCreate}
          style={({ pressed }) => [
            styles.createBannerBtn,
            pressed && { opacity: 0.9 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Create Member Survey or Poll"
        >
          <View style={styles.createIconWrap}>
            <Ionicons name="stats-chart" size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.createBtnTitle}>+ Create Member Survey or Poll</Text>
            <Text style={styles.createBtnSubtitle}>
              Design custom questions, collect feedback, & broadcast pop-ups to members
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </Pressable>

        {/* Filter Tabs */}
        <View style={styles.tabsRow}>
          {(['all', 'active', 'closed'] as FilterTab[]).map((tab) => {
            const active = filter === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setFilter(tab)}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: active ? colors.primary : tc.cardBg,
                    borderColor: active ? colors.primary : tc.border,
                  },
                ]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.filterTabText,
                    {
                      color: active ? '#FFFFFF' : tc.text,
                      fontWeight: active ? '700' : '600',
                    },
                  ]}
                >
                  {tab === 'all'
                    ? `All (${surveys.length})`
                    : tab === 'active'
                    ? `Active (${surveys.filter((s) => s.isActive).length})`
                    : `Closed (${surveys.filter((s) => !s.isActive).length})`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: tc.text }]}>
          Surveys & Polls ({filteredSurveys.length})
        </Text>

        {filteredSurveys.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <Ionicons name="clipboard-outline" size={38} color={tc.textMuted} />
            <Text style={[styles.emptyTitle, { color: tc.text }]}>No surveys in this category</Text>
            <Text style={[styles.emptySubtitle, { color: tc.textMuted }]}>
              Tap the button above to launch a new member survey or poll.
            </Text>
          </View>
        ) : (
          filteredSurveys.map((item) => (
            <View
              key={item.id}
              style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}
            >
              {/* Badge Row */}
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: item.isActive ? '#DCFCE7' : '#F1F5F9',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: item.isActive ? '#15803D' : colors.muted },
                    ]}
                  >
                    {item.isActive ? '● ACTIVE' : '○ CLOSED'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: item.type === 'poll' ? '#EFF6FF' : '#F5F3FF',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: item.type === 'poll' ? colors.primary : '#7C3AED' },
                    ]}
                  >
                    {item.type.toUpperCase()}
                  </Text>
                </View>

                <View style={[styles.badge, { backgroundColor: '#F8FAFC' }]}>
                  <Text style={[styles.badgeText, { color: tc.textMuted }]}>
                    {item.category.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={[styles.title, { color: tc.text }]}>{item.title}</Text>
              <Text style={[styles.bodyText, { color: tc.textMuted }]}>{item.description}</Text>

              {/* Meta information */}
              <View style={styles.metaRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="help-circle-outline" size={14} color={tc.textMuted} />
                  <Text style={[styles.metaText, { color: tc.textMuted }]}>
                    {item.questions.length} Question{item.questions.length > 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="people-outline" size={14} color={tc.textMuted} />
                  <Text style={[styles.metaText, { color: tc.textMuted }]}>
                    {item.targetAudience || 'All Members'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="chatbubbles-outline" size={14} color={colors.primary} />
                  <Text style={[styles.metaText, { color: colors.primary, fontWeight: '700' }]}>
                    {item.totalResponses} Response{item.totalResponses !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.cardActions}>
                <Pressable
                  onPress={() => void openAnalytics(item)}
                  style={[styles.actionBtnPrimary, { backgroundColor: colors.primaryLight }]}
                  accessibilityRole="button"
                  accessibilityLabel={`View Analytics for ${item.title}`}
                >
                  <Ionicons name="bar-chart" size={15} color={colors.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.primary, fontWeight: '700' }]}>
                    Results & Analytics
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => void handleToggleStatus(item)}
                  style={[styles.actionBtnOutline, { borderColor: tc.border }]}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                    size={15}
                    color={tc.text}
                  />
                  <Text style={[styles.actionBtnText, { color: tc.text }]}>
                    {item.isActive ? 'Close' : 'Reopen'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => void handleDelete(item)}
                  style={styles.actionBtnDestructive}
                  accessibilityRole="button"
                >
                  <Ionicons name="trash-outline" size={15} color={colors.scarlet} />
                  <Text style={[styles.actionBtnText, { color: colors.scarlet }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* MODAL: CREATE MEMBER SURVEY / POLL                         */}
      {/* ========================================================= */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalBox, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="stats-chart" size={22} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: tc.text }]}>New Member Survey / Poll</Text>
              </View>
              <Pressable
                onPress={() => setCreateModalVisible(false)}
                disabled={submitting}
                hitSlop={10}
              >
                <Ionicons name="close" size={24} color={tc.text} />
              </Pressable>
            </View>

            {modalError ? <ErrorBanner message={modalError} /> : null}

            <ScrollView
              style={{ maxHeight: 520 }}
              contentContainerStyle={{ gap: 14, paddingBottom: 24 }}
            >
              {/* Type Switcher: Poll vs Survey */}
              <View>
                <Text style={[styles.fieldLabel, { color: tc.text }]}>Survey Format</Text>
                <View style={styles.formatRow}>
                  <Pressable
                    onPress={() => setSurveyType('poll')}
                    style={[
                      styles.formatChip,
                      surveyType === 'poll' && styles.formatChipActive,
                      { borderColor: surveyType === 'poll' ? colors.primary : tc.border },
                    ]}
                  >
                    <Ionicons
                      name="pie-chart-outline"
                      size={18}
                      color={surveyType === 'poll' ? colors.primary : tc.textMuted}
                    />
                    <Text
                      style={[
                        styles.formatChipText,
                        { color: surveyType === 'poll' ? colors.primary : tc.text },
                      ]}
                    >
                      Quick Poll (1 Question)
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setSurveyType('survey')}
                    style={[
                      styles.formatChip,
                      surveyType === 'survey' && styles.formatChipActive,
                      { borderColor: surveyType === 'survey' ? colors.primary : tc.border },
                    ]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color={surveyType === 'survey' ? colors.primary : tc.textMuted}
                    />
                    <Text
                      style={[
                        styles.formatChipText,
                        { color: surveyType === 'survey' ? colors.primary : tc.text },
                      ]}
                    >
                      Full Survey (Multi-Question)
                    </Text>
                  </Pressable>
                </View>
              </View>

              <TextField
                label="Survey / Poll Title *"
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Extended Lap Pool Hours Poll"
              />

              <TextField
                label="Description & Purpose *"
                value={description}
                onChangeText={setDescription}
                placeholder="Explain what member feedback you are seeking and how it will be used..."
                multiline
                numberOfLines={3}
              />

              {/* Category Picker */}
              <View>
                <Text style={[styles.fieldLabel, { color: tc.text }]}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                  {SURVEY_CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => setCategory(cat.id)}
                      style={[
                        styles.miniCategoryChip,
                        category === cat.id && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                        { borderColor: tc.border },
                      ]}
                    >
                      <Ionicons
                        name={cat.icon as any}
                        size={14}
                        color={category === cat.id ? '#FFFFFF' : tc.text}
                      />
                      <Text
                        style={[
                          styles.miniCategoryText,
                          { color: category === cat.id ? '#FFFFFF' : tc.text },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <TextField
                label="Target Audience (Optional)"
                value={targetAudience}
                onChangeText={setTargetAudience}
                placeholder="e.g. All Active Members, Swimmers, Senior Wellness"
              />

              {/* Questions Section */}
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.sectionTitle, { color: tc.text, fontSize: 16 }]}>
                    Questions ({questions.length})
                  </Text>
                  {surveyType === 'survey' ? (
                    <Pressable
                      onPress={handleAddQuestion}
                      style={styles.addQuestionBtn}
                      accessibilityRole="button"
                    >
                      <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                        + Add Question
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {questions.map((q, qIdx) => (
                  <View
                    key={q.id}
                    style={[styles.questionCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: tc.border }]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.questionNumberText, { color: colors.primary }]}>
                        Question {qIdx + 1}
                      </Text>
                      {questions.length > 1 ? (
                        <Pressable
                          onPress={() => handleRemoveQuestion(qIdx)}
                          hitSlop={8}
                          accessibilityLabel={`Delete Question ${qIdx + 1}`}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.scarlet} />
                        </Pressable>
                      ) : null}
                    </View>

                    <TextField
                      label="Question Prompt *"
                      value={q.prompt}
                      onChangeText={(val) => handleQuestionChange(qIdx, 'prompt', val)}
                      placeholder="e.g. Which Saturday class time would you attend most?"
                    />

                    {/* Question Type Chooser */}
                    <View style={{ marginTop: 6 }}>
                      <Text style={[styles.fieldLabel, { color: tc.text, fontSize: 12 }]}>
                        Answer Type
                      </Text>
                      <View style={styles.chipRow}>
                        {[
                          { id: 'single_choice', label: 'Single Choice', icon: 'radio-button-on' },
                          { id: 'multiple_choice', label: 'Multi-Choice', icon: 'checkbox' },
                          { id: 'rating', label: '1–5 Stars', icon: 'star' },
                          { id: 'text', label: 'Written Feedback', icon: 'create-outline' },
                        ].map((t) => {
                          const active = q.type === t.id;
                          return (
                            <Pressable
                              key={t.id}
                              onPress={() =>
                                handleQuestionChange(qIdx, 'type', t.id as SurveyQuestionType)
                              }
                              style={[
                                styles.typeChip,
                                active && { backgroundColor: colors.primary, borderColor: colors.primary },
                                { borderColor: tc.border },
                              ]}
                            >
                              <Ionicons
                                name={t.icon as any}
                                size={13}
                                color={active ? '#FFFFFF' : tc.text}
                              />
                              <Text
                                style={[
                                  styles.typeChipText,
                                  { color: active ? '#FFFFFF' : tc.text },
                                ]}
                              >
                                {t.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    {/* Options list for choices */}
                    {q.type === 'single_choice' || q.type === 'multiple_choice' ? (
                      <View style={{ marginTop: 8, gap: 8 }}>
                        <Text style={[styles.fieldLabel, { color: tc.text, fontSize: 12 }]}>
                          Choices / Options
                        </Text>
                        {q.options.map((opt, optIdx) => (
                          <View key={optIdx} style={styles.optionInputRow}>
                            <Ionicons
                              name={q.type === 'single_choice' ? 'radio-button-off' : 'square-outline'}
                              size={16}
                              color={tc.textMuted}
                            />
                            <TextInput
                              value={opt}
                              onChangeText={(val) => handleOptionChange(qIdx, optIdx, val)}
                              placeholder={`Choice ${optIdx + 1}`}
                              placeholderTextColor={colors.muted}
                              style={[
                                styles.optionInput,
                                {
                                  color: tc.text,
                                  backgroundColor: tc.cardBg,
                                  borderColor: tc.border,
                                },
                              ]}
                            />
                            {q.options.length > 2 ? (
                              <Pressable
                                onPress={() => handleRemoveOption(qIdx, optIdx)}
                                hitSlop={6}
                              >
                                <Ionicons name="close-circle" size={18} color={tc.textMuted} />
                              </Pressable>
                            ) : null}
                          </View>
                        ))}

                        <Pressable
                          onPress={() => handleAddOption(qIdx)}
                          style={styles.addOptionBtn}
                        >
                          <Ionicons name="add" size={16} color={colors.primary} />
                          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                            + Add Choice
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}

                    {/* Required Toggle */}
                    <Pressable
                      onPress={() => handleQuestionChange(qIdx, 'required', !q.required)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}
                    >
                      <Ionicons
                        name={q.required ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={colors.primary}
                      />
                      <Text style={{ fontSize: 13, color: tc.text }}>
                        Required for members to submit
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>

              {/* Allow Anonymous Submissions */}
              <Pressable
                onPress={() => setAllowAnonymous(!allowAnonymous)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}
              >
                <Ionicons
                  name={allowAnonymous ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={colors.primary}
                />
                <Text style={{ fontSize: 14, color: tc.text }}>
                  Allow members to submit anonymously
                </Text>
              </Pressable>

              {/* Pop-up Alert on App Open Toggle */}
              <View
                style={[
                  styles.noticeAlertBox,
                  {
                    backgroundColor: popupAlert ? '#FEF2F2' : isDark ? '#1F2937' : '#F8FAFC',
                    borderColor: popupAlert ? colors.scarlet : tc.border,
                  },
                ]}
              >
                <Pressable
                  onPress={() => setPopupAlert(!popupAlert)}
                  style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
                >
                  <Ionicons
                    name={popupAlert ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={popupAlert ? colors.scarlet : tc.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: popupAlert ? colors.scarlet : tc.text,
                      }}
                    >
                      Pop-up Notice on App Open for Members
                    </Text>
                    <Text style={{ fontSize: 12, color: tc.textMuted, marginTop: 2 }}>
                      Automatically shows a prominent pop-up modal when members launch or open the YMCA app, inviting them directly to take this survey.
                    </Text>
                  </View>
                </Pressable>
              </View>

              <View style={{ marginTop: 12 }}>
                <PrimaryButton
                  title="Publish Member Survey"
                  onPress={() => void handleSaveSurvey()}
                  loading={submitting}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: SURVEY ANALYTICS & RESULTS                         */}
      {/* ========================================================= */}
      <Modal
        visible={analyticsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAnalyticsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: tc.text }]} numberOfLines={1}>
                  Survey Results & Analytics
                </Text>
                <Text style={[styles.metaText, { color: tc.textMuted }]} numberOfLines={1}>
                  {selectedSurvey?.title}
                </Text>
              </View>
              <Pressable onPress={() => setAnalyticsModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={tc.text} />
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: 520 }}
              contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
            >
              {/* Overall Total Responses Pill */}
              <View style={[styles.analyticsHero, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="people" size={28} color={colors.primary} />
                <View>
                  <Text style={[styles.analyticsHeroNumber, { color: colors.primary }]}>
                    {analytics?.totalResponses ?? 0}
                  </Text>
                  <Text style={[styles.analyticsHeroLabel, { color: colors.primary }]}>
                    Total Member Responses
                  </Text>
                </View>
              </View>

              {/* Questions Breakdown */}
              {analytics?.questionAnalytics.map((q, idx) => (
                <View
                  key={q.questionId}
                  style={[styles.analyticsQuestionCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: tc.border }]}
                >
                  <Text style={[styles.questionNumberText, { color: colors.primary }]}>
                    Question {idx + 1} · {q.type.replace('_', ' ').toUpperCase()}
                  </Text>
                  <Text style={[styles.analyticsPrompt, { color: tc.text }]}>{q.prompt}</Text>
                  <Text style={[styles.metaText, { color: tc.textMuted, marginBottom: 8 }]}>
                    {q.totalAnswers} total answer{q.totalAnswers !== 1 ? 's' : ''}
                  </Text>

                  {/* Choice Charts */}
                  {(q.type === 'single_choice' || q.type === 'multiple_choice') && q.optionCounts ? (
                    <View style={{ gap: 8 }}>
                      {Object.entries(q.optionCounts).map(([opt, count]) => {
                        const pct = q.optionPercentages?.[opt] || 0;
                        const isTop = q.topOption === opt && count > 0;
                        return (
                          <View key={opt} style={{ gap: 3 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                {isTop ? (
                                  <Ionicons name="trophy" size={14} color="#D97706" />
                                ) : null}
                                <Text
                                  style={[
                                    styles.optLabel,
                                    { color: tc.text, fontWeight: isTop ? '700' : '500' },
                                  ]}
                                  numberOfLines={2}
                                >
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

                  {/* Rating Average & Distribution */}
                  {q.type === 'rating' ? (
                    <View style={{ gap: 8 }}>
                      <View style={styles.ratingHero}>
                        <Ionicons name="star" size={26} color="#EAB308" />
                        <Text style={[styles.ratingScore, { color: tc.text }]}>
                          {q.averageRating ?? 0}
                        </Text>
                        <Text style={[styles.ratingMax, { color: tc.textMuted }]}>/ 5.0</Text>
                      </View>

                      {q.ratingDistribution ? (
                        <View style={{ gap: 4, marginTop: 4 }}>
                          {[5, 4, 3, 2, 1].map((stars) => {
                            const count = q.ratingDistribution?.[stars] || 0;
                            const pct = q.totalAnswers > 0 ? Math.round((count / q.totalAnswers) * 100) : 0;
                            return (
                              <View key={stars} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={{ width: 45, fontSize: 12, color: tc.text }}>
                                  {stars} {stars === 1 ? 'star' : 'stars'}
                                </Text>
                                <View style={[styles.progressBarTrack, { flex: 1, backgroundColor: tc.border }]}>
                                  <View
                                    style={[
                                      styles.progressBarFill,
                                      { width: `${pct}%`, backgroundColor: '#EAB308' },
                                    ]}
                                  />
                                </View>
                                <Text style={{ width: 45, fontSize: 12, color: tc.textMuted, textAlign: 'right' }}>
                                  {count}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Text Feedback Comments */}
                  {q.type === 'text' && q.textFeedbacks ? (
                    <View style={{ gap: 8 }}>
                      {q.textFeedbacks.length === 0 ? (
                        <Text style={[styles.metaText, { color: tc.textMuted, fontStyle: 'italic' }]}>
                          No written feedback submitted yet.
                        </Text>
                      ) : (
                        q.textFeedbacks.map((f, fIdx) => (
                          <View
                            key={fIdx}
                            style={[
                              styles.feedbackCard,
                              { backgroundColor: tc.cardBg, borderColor: tc.border },
                            ]}
                          >
                            <Text style={[styles.feedbackText, { color: tc.text }]}>
                              &quot;{f.text}&quot;
                            </Text>
                            <Text style={[styles.feedbackAuthor, { color: tc.textMuted }]}>
                              — {f.memberName} · {formatShortDate(f.submittedAt)}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  ) : null}
                </View>
              ))}

              <SecondaryButton
                title="Done"
                onPress={() => setAnalyticsModalVisible(false)}
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
  createBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#16A34A',
    padding: 16,
    borderRadius: radii.md,
    ...Platform.select({
      ios: {
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  createIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  createBtnSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 16,
    gap: 10,
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
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  metaText: {
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  actionBtnDestructive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: '#FEF2F2',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formatChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  formatChipActive: {
    backgroundColor: 'rgba(0, 96, 156, 0.08)',
  },
  formatChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  miniCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    marginRight: 6,
  },
  miniCategoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  questionCard: {
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 8,
  },
  questionNumberText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  optionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionInput: {
    flex: 1,
    height: 38,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  noticeAlertBox: {
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginTop: 4,
  },
  analyticsHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radii.md,
  },
  analyticsHeroNumber: {
    fontSize: 24,
    fontWeight: '800',
  },
  analyticsHeroLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  analyticsQuestionCard: {
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 6,
  },
  analyticsPrompt: {
    fontSize: 15,
    fontWeight: '700',
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
  ratingHero: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  ratingScore: {
    fontSize: 28,
    fontWeight: '800',
  },
  ratingMax: {
    fontSize: 16,
  },
  feedbackCard: {
    padding: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 4,
  },
  feedbackText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  feedbackAuthor: {
    fontSize: 11,
  },
});
