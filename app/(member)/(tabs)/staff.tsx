import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { WeeklyTrainerSchedule } from '@/components/WeeklyTrainerSchedule';
import { WellnessPackagesView } from '@/components/WellnessPackagesView';
import { YHeader } from '@/components/YHeader';
import { BookedLessons } from '@/components/staffHub/BookedLessons';
import { CoachDirectory } from '@/components/staffHub/CoachDirectory';
import { FrontDeskSection } from '@/components/staffHub/FrontDeskSection';
import { MaintenanceReports } from '@/components/staffHub/MaintenanceReports';
import { MyTrainingProgress } from '@/components/staffHub/MyTrainingProgress';
import { StaffHubHero, StaffSectionNav } from '@/components/staffHub/StaffHubHeader';
import { hubAccent, type HubSection } from '@/components/staffHub/hubTheme';
import { useAppConfig } from '@/context/AppConfigContext';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { isCoachStaff, splitCoachesByDiscipline } from '@/domain/availabilityAccess';
import type { PrivateLesson, Staff } from '@/domain/types';
import { formatWellnessPrice, largestWellnessSavings, lowestWellnessRate } from '@/domain/wellnessPrograms';
import { lessonRepo } from '@/repositories/lessonRepo';
import { messageRepo } from '@/repositories/messageRepo';
import { staffRepo } from '@/repositories/staffRepo';
import { cardStyle } from '@/theme/card';
import { radii, spacing } from '@/theme/typography';

import { formatLessonWhen } from '@/components/staffHub/hubTheme';

const VALID_SECTIONS: HubSection[] = ['training', 'swim', 'packages', 'desk', 'maintenance'];

function sectionFromParam(tab?: string): HubSection {
  return VALID_SECTIONS.includes(tab as HubSection) ? (tab as HubSection) : 'training';
}

export default function MemberStaffScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { session, api } = useSession();
  const { config } = useAppConfig();
  const { colors, isDark } = useTheme();
  const memberId = session?.userId ?? '';

  const [section, setSection] = useState<HubSection>(sectionFromParam(tab));
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [assignedTrainer, setAssignedTrainer] = useState<Staff | null>(null);
  const [trainerId, setTrainerId] = useState('');
  const [swimId, setSwimId] = useState('');
  const [lessons, setLessons] = useState<PrivateLesson[]>([]);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (memberId === '') return;
    try {
      setError(false);
      const [assigned, staff, mine] = await Promise.all([
        staffRepo.getAssignedTrainer(api, memberId),
        staffRepo.listStaff(api),
        lessonRepo.listMine(api, memberId),
      ]);
      setAssignedTrainer(assigned);
      setStaffList(staff);
      setLessons([...mine].sort((a, b) => a.start.localeCompare(b.start)));
      if (assigned) setTrainerId(assigned.id);
    } catch {
      setError(true);
    }
  }, [api, memberId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // A deep link (?tab=swim) can change while this tab stays mounted.
  useFocusEffect(
    useCallback(() => {
      if (tab) setSection(sectionFromParam(tab));
    }, [tab])
  );

  const coaches = useMemo(
    () => splitCoachesByDiscipline(staffList.filter((s) => s.id !== 'staff-desk' && isCoachStaff(s))),
    [staffList]
  );
  const deskStaff = useMemo(() => staffList.find((s) => s.id === 'staff-desk') ?? null, [staffList]);
  const trainingLessons = useMemo(() => lessons.filter((l) => (l.lessonType ?? 'training') === 'training'), [lessons]);
  const swimLessons = useMemo(() => lessons.filter((l) => l.lessonType === 'swim'), [lessons]);

  const training = hubAccent('training', isDark);
  const swim = hubAccent('swim', isDark);
  const packages = hubAccent('packages', isDark);

  const openChatWith = async (recipient: Staff) => {
    if (memberId === '') return;
    try {
      const thread = await messageRepo.getOrCreateThread(api, memberId, recipient.id);
      router.push(`/(member)/messages/${thread.id}` as never);
    } catch {
      dialog.alert('Error', 'Could not open the conversation. Please try again.', [{ text: 'OK' }], 'alert');
    }
  };

  const makePrimary = async (coach: Staff) => {
    if (memberId === '') return;
    try {
      await staffRepo.setAssignedTrainer(api, memberId, coach.id);
      setAssignedTrainer(await staffRepo.getAssignedTrainer(api, memberId));
      dialog.alert('Primary Trainer Updated', 'Your primary trainer assignment has been updated.', [{ text: 'OK' }], 'checkmark');
    } catch (e) {
      dialog.alert('Error', e instanceof Error ? e.message : 'Could not update primary trainer.', [{ text: 'OK' }], 'alert');
    }
  };

  const bookWith = (coach: Staff, type: 'training' | 'swim', date?: string) =>
    router.push({
      pathname: '/(member)/book-lesson',
      params: { staffId: coach.id, type, ...(date ? { date } : {}) },
    });

  const changeLesson = (lesson: PrivateLesson) =>
    router.push({
      pathname: '/(member)/book-lesson',
      params: { changeLessonId: lesson.id, staffId: lesson.staffId, type: lesson.lessonType ?? 'training' },
    });

  const confirmCancel = (lesson: PrivateLesson) =>
    dialog.show({
      title: 'Cancel private lesson?',
      message: `Cancel your lesson on ${formatLessonWhen(lesson.start)}?`,
      icon: 'trash',
      buttons: [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Cancel lesson', style: 'destructive', onPress: () => void doCancel(lesson) },
      ],
    });

  const doCancel = async (lesson: PrivateLesson) => {
    setBusyId(lesson.id);
    try {
      await lessonRepo.cancel(api, memberId, lesson.id);
      await load();
    } catch (e) {
      dialog.show({
        title: 'Could not cancel',
        message: e instanceof Error ? e.message : 'Please try again.',
        icon: 'alert',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setBusyId(null);
    }
  };

  const cardTheme = { backgroundColor: colors.cardBg, borderColor: colors.cardBorder };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader subtitle="Staff & Support" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <StaffHubHero
          stats={[
            { value: String(coaches.trainers.length), label: 'Personal trainers' },
            { value: String(coaches.swim.length), label: 'Swim instructors' },
            { value: String(trainingLessons.length + swimLessons.length), label: 'Lessons booked' },
          ]}
          onOpenMessages={() => router.push('/(member)/messages' as never)}
        />
        <StaffSectionNav active={section} onChange={setSection} />

        {section === 'training' ? (
          <View style={styles.content}>
            <CoachDirectory
              discipline="training"
              coaches={coaches.trainers}
              selectedId={trainerId}
              onSelect={setTrainerId}
              accent={training.color}
              accentSoft={training.soft}
              primaryId={assignedTrainer?.id}
              onMakePrimary={(c) => void makePrimary(c)}
              onChat={(c) => void openChatWith(c)}
              onBook={(c) => bookWith(c, 'training')}
            />

            <WeeklyTrainerSchedule
              title="Personal Training: This Week"
              subtitle="See which trainers are free and when"
              icon="barbell-outline"
              noun="trainers"
              trainers={coaches.trainers}
              accent={training.color}
              hint="Pick a day, then tap a trainer in a time block to book with them."
              onSelectTrainer={(coach, window) => {
                setTrainerId(coach.id);
                bookWith(coach, 'training', window.start.slice(0, 10));
              }}
            />

            <View style={[styles.promo, { backgroundColor: packages.soft, borderColor: packages.color }]}>
              <View style={styles.promoTop}>
                <View style={[styles.promoIcon, { backgroundColor: colors.cardBg }]}>
                  <Ionicons name="medal" size={20} color={packages.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.promoTitle, { color: colors.text }]} allowFontScaling>
                    Wellness Training Packages & Rates
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: packages.color }} allowFontScaling>
                    60-Min, 30-Min & Partner Training from {formatWellnessPrice(lowestWellnessRate(config.wellnessPackages))}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17 }} allowFontScaling>
                Nationally certified YMCA trainers. Every package includes a full functional assessment, goal planning, and a
                custom program plan. Save up to {formatWellnessPrice(largestWellnessSavings(config.wellnessPackages))} on
                multi-session packs.
              </Text>
              <Pressable
                onPress={() => setSection('packages')}
                style={({ pressed }) => [
                  styles.promoBtn,
                  { borderColor: packages.color, backgroundColor: pressed ? colors.primaryLight : colors.cardBg },
                ]}
                accessibilityRole="button"
                accessibilityLabel="View Wellness Training Packages and Pricing"
              >
                <Ionicons name="pricetag-outline" size={16} color={packages.color} />
                <Text style={{ color: packages.color, fontSize: 13, fontWeight: '700' }} allowFontScaling>
                  View Packages, Rates & Inclusions
                </Text>
                <Ionicons name="arrow-forward" size={14} color={packages.color} />
              </Pressable>
            </View>

            <BookedLessons
              title="Your Booked Private Lessons"
              emptyText="No private lessons booked yet. Pick a trainer above to reserve one-on-one sessions."
              lessons={trainingLessons}
              staffList={staffList}
              accent={training.color}
              busyId={busyId}
              onChange={changeLesson}
              onCancel={confirmCancel}
            />

            <MyTrainingProgress memberId={memberId} assignedTrainer={assignedTrainer} />
          </View>
        ) : null}

        {section === 'swim' ? (
          <View style={styles.content}>
            <CoachDirectory
              discipline="swim"
              coaches={coaches.swim}
              selectedId={swimId}
              onSelect={setSwimId}
              accent={swim.color}
              accentSoft={swim.soft}
              onChat={(c) => void openChatWith(c)}
              onBook={(c) => bookWith(c, 'swim')}
            />

            <WeeklyTrainerSchedule
              title="Swim Instruction: This Week"
              subtitle="See which instructors are on the deck and when"
              icon="water-outline"
              noun="swim instructors"
              trainers={coaches.swim}
              accent={swim.color}
              hint="Pick a day, then tap an instructor in a time block to book a private swim lesson."
              onSelectTrainer={(coach, window) => {
                setSwimId(coach.id);
                bookWith(coach, 'swim', window.start.slice(0, 10));
              }}
            />

            <View style={styles.linkRow}>
              {[
                { icon: 'school-outline' as const, label: 'Swim Classes', onPress: () => router.push({ pathname: '/(member)/book-lesson', params: { type: 'swim', tab: 'classes' } }) },
                { icon: 'book-outline' as const, label: 'Aquatics Guide', onPress: () => router.push('/(member)/aquatics-guide' as never) },
                { icon: 'calendar-outline' as const, label: 'Pool Schedule', onPress: () => router.push('/(member)/pool-schedule' as never) },
              ].map((l) => (
                <Pressable
                  key={l.label}
                  onPress={l.onPress}
                  style={[styles.linkCard, cardTheme]}
                  accessibilityRole="button"
                  accessibilityLabel={l.label}
                >
                  <Ionicons name={l.icon} size={22} color={swim.color} />
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center' }} allowFontScaling>
                    {l.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <BookedLessons
              title="Your Booked Swim Lessons"
              emptyText="No private swim lessons booked yet. Pick an instructor above to get started."
              lessons={swimLessons}
              staffList={staffList}
              accent={swim.color}
              busyId={busyId}
              onChange={changeLesson}
              onCancel={confirmCancel}
            />
          </View>
        ) : null}

        {section === 'packages' ? (
          <WellnessPackagesView
            onBookLesson={() => {
              const coach =
                coaches.trainers.find((c) => c.id === trainerId) ?? assignedTrainer ?? coaches.trainers[0] ?? null;
              if (coach) bookWith(coach, 'training');
              else setSection('training');
            }}
            onChatWithDesk={() => {
              if (deskStaff) void openChatWith(deskStaff);
            }}
          />
        ) : null}

        {section === 'desk' ? <FrontDeskSection deskStaff={deskStaff} onChat={(c) => void openChatWith(c)} /> : null}

        {section === 'maintenance' ? <MaintenanceReports filer={{ kind: 'member', memberId }} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  content: { gap: spacing.md },
  promo: { ...cardStyle, borderWidth: 1.5, gap: 10 },
  promoTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  promoIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  promoTitle: { fontSize: 16, fontWeight: '800' },
  promoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: radii.button,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  linkRow: { flexDirection: 'row', gap: spacing.sm },
  linkCard: { flex: 1, alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radii.card, paddingVertical: 14, paddingHorizontal: 6 },
});
