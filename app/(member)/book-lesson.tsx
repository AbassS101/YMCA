import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BookingSummaryBar } from '@/components/booking/BookingSummaryBar';
import { BookingTabs } from '@/components/booking/BookingTabs';
import { DaySlotPicker, localDayKey } from '@/components/booking/DaySlotPicker';
import { InstructorCard } from '@/components/booking/InstructorCard';
import { LessonCheckoutSheet } from '@/components/booking/LessonCheckoutSheet';
import { LessonTypeToggle } from '@/components/booking/LessonTypeToggle';
import { MySwimEnrollments } from '@/components/booking/MySwimEnrollments';
import { NOT_SURE_STAGE, SwimDetailsForm } from '@/components/booking/SwimDetailsForm';
import { SwimClassFilters, type ClassFilterState } from '@/components/booking/SwimClassFilters';
import { SwimClassRow } from '@/components/booking/SwimClassRow';
import { SwimEnrollSheet } from '@/components/booking/SwimEnrollSheet';
import { ErrorBanner } from '@/components/ErrorBanner';
import { WellnessPackageModal } from '@/components/WellnessPackageModal';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import {
  AQUATICS_CLASSES,
  AQUATICS_SESSION_INFO,
  type AquaticsClassOffering,
} from '@/domain/aquaticsGuideData';
import { getDemoToday } from '@/domain/demoClock';
import {
  DEFAULT_LESSON_PRICING,
  formatCents,
  lessonPriceCents,
  pricingTierFor,
  SWIM_CLASS_CAPACITY,
  swimClassPriceCents,
} from '@/domain/lessonPricing';
import type {
  LessonPricing,
  LessonSlot,
  LessonType,
  Member,
  Membership,
  PrivateLesson,
  Staff,
  SwimClassEnrollment,
} from '@/domain/types';
import { lessonRepo, pricingRepo, swimClassRepo } from '@/repositories/lessonRepo';
import { staffRepo } from '@/repositories/staffRepo';
import { radii, spacing, tapTarget } from '@/theme/typography';

type Tab = 'private' | 'classes';

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatSlot(isoStart: string): string {
  const d = new Date(isoStart);
  const day = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

export default function BookLessonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    changeLessonId?: string;
    staffId?: string;
    tab?: string;
    classId?: string;
    type?: string;
  }>();
  const { session, api } = useSession();
  const { colors } = useTheme();
  const memberId = session?.userId ?? '';
  const today = getDemoToday();

  const isChange = typeof params.changeLessonId === 'string' && params.changeLessonId.length > 0;

  const [tab, setTab] = useState<Tab>(params.tab === 'classes' && !isChange ? 'classes' : 'private');
  const [pricing, setPricing] = useState<LessonPricing>(DEFAULT_LESSON_PRICING);
  const [member, setMember] = useState<Member | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [packageModalVisible, setPackageModalVisible] = useState(false);

  // Private lessons
  const [lessonType, setLessonType] = useState<LessonType>(params.type === 'swim' ? 'swim' : 'training');
  const [duration, setDuration] = useState<30 | 60>(60);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [assignedId, setAssignedId] = useState<string | null>(null);
  const [trainerId, setTrainerId] = useState<string | null>(
    typeof params.staffId === 'string' && params.staffId.length > 0 ? params.staffId : null
  );
  const [slots, setSlots] = useState<LessonSlot[]>([]);
  const [selectedDay, setSelectedDay] = useState(today);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [swimmerName, setSwimmerName] = useState('');
  const [stageCode, setStageCode] = useState(NOT_SURE_STAGE);
  const [notes, setNotes] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [oldLesson, setOldLesson] = useState<PrivateLesson | null>(null);

  // Swim classes
  const [filters, setFilters] = useState<ClassFilterState>({ day: 'All', age: 'All' });
  const [myEnrollments, setMyEnrollments] = useState<SwimClassEnrollment[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [enrollTarget, setEnrollTarget] = useState<AquaticsClassOffering | null>(null);
  const [checkoutClass, setCheckoutClass] = useState<{ offering: AquaticsClassOffering; name: string } | null>(
    null
  );

  const tier = pricingTierFor(member);

  const instructors = useMemo(
    () =>
      allStaff.filter(
        (s) => s.id !== 'staff-desk' && (s.lessonTypes ?? ['training']).includes(lessonType)
      ),
    [allStaff, lessonType]
  );
  const activeTrainer = instructors.find((t) => t.id === trainerId) ?? null;

  const loadSlots = useCallback(
    async (staffId: string) => {
      try {
        const open = await lessonRepo.listOpenSlots(api, staffId, today, addDays(today, 6));
        open.sort((a, b) => a.start.localeCompare(b.start));
        setSlots(open);
        const first = open[0];
        setSelectedDay(first ? localDayKey(first.start) : today);
        setSlotId(null);
      } catch {
        setError(true);
      }
    },
    [api, today]
  );

  const load = useCallback(async () => {
    if (memberId === '') {
      return;
    }
    try {
      setError(false);
      const [assigned, staffList, prices, mem, ms, enr, mine] = await Promise.all([
        staffRepo.getAssignedTrainer(api, memberId),
        staffRepo.listStaff(api),
        pricingRepo.get(api),
        api.getMember(memberId),
        api.getMembership(memberId).catch(() => null),
        swimClassRepo.listMine(api, memberId),
        lessonRepo.listMine(api, memberId),
      ]);
      setPricing(prices);
      setMember(mem);
      setMembership(ms);
      setAllStaff(staffList);
      setAssignedId(assigned?.id ?? null);
      setMyEnrollments(enr);
      const old = isChange ? (mine.find((l) => l.id === params.changeLessonId) ?? null) : null;
      setOldLesson(old);
      if (old) {
        setLessonType(old.lessonType ?? 'training');
        setDuration(((old.durationMin as 30 | 60 | undefined) ?? 60));
        setTrainerId(old.staffId);
      }
      const entries = await Promise.all(
        AQUATICS_CLASSES.map(
          async (c) => [c.id, (await swimClassRepo.listForClass(api, c.id)).length] as const
        )
      );
      setCounts(Object.fromEntries(entries));
    } catch {
      setError(true);
    }
  }, [api, memberId, isChange, params.changeLessonId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // Choose a default instructor when type or staff list changes.
  useEffect(() => {
    if (instructors.length === 0) {
      return;
    }
    if (trainerId && instructors.some((i) => i.id === trainerId)) {
      return;
    }
    const preferred = instructors.find((i) => i.id === assignedId) ?? instructors[0];
    setTrainerId(preferred.id);
  }, [instructors, trainerId, assignedId]);

  useEffect(() => {
    if (trainerId) {
      void loadSlots(trainerId);
    }
  }, [trainerId, loadSlots]);

  // Open the enroll sheet when arriving from the aquatics guide.
  useEffect(() => {
    if (typeof params.classId === 'string') {
      const c = AQUATICS_CLASSES.find((x) => x.id === params.classId);
      if (c) {
        setEnrollTarget(c);
      }
    }
  }, [params.classId]);

  const selectedSlot = slots.find((s) => s.id === slotId) ?? null;
  const chargeCents = isChange
    ? (oldLesson?.paidAmountCents ?? 0)
    : lessonPriceCents(pricing, lessonType, duration);
  const cardBrand = membership?.paymentBrand ?? 'Visa';
  const cardLast4 = membership?.paymentLast4 ?? '4242';

  const handleSelectType = (t: LessonType) => {
    setLessonType(t);
    setTrainerId(null);
    setSlotId(null);
  };

  const doBookLesson = async () => {
    if (!selectedSlot || memberId === '') {
      return;
    }
    setBusy(true);
    try {
      if (isChange && params.changeLessonId) {
        await lessonRepo.change(api, memberId, params.changeLessonId, selectedSlot.id);
      } else {
        await lessonRepo.book(api, memberId, selectedSlot.id, {
          lessonType,
          durationMin: duration,
          swimmerName: lessonType === 'swim' ? swimmerName : undefined,
          stageCode: lessonType === 'swim' ? stageCode : undefined,
          notes: notes || undefined,
        });
      }
      setCheckoutOpen(false);
      dialog.show({
        title: isChange ? 'Lesson updated' : 'Lesson booked',
        message: `${formatSlot(selectedSlot.start)} with ${activeTrainer?.name ?? 'your instructor'} is on your schedule.${
          !isChange && chargeCents > 0
            ? `\n\nReceipt: ${formatCents(chargeCents)} charged to ${cardBrand} ending ${cardLast4}.`
            : ''
        }`,
        icon: 'checkmark',
        buttons: [{ text: 'OK', style: 'default', onPress: () => router.back() }],
      });
    } catch (e) {
      setCheckoutOpen(false);
      dialog.show({
        title: 'Could not book',
        message: e instanceof Error ? e.message : 'Please try again.',
        icon: 'alert',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setBusy(false);
    }
  };

  const doEnroll = async () => {
    if (!checkoutClass || memberId === '') {
      return;
    }
    const { offering, name } = checkoutClass;
    setBusy(true);
    try {
      const enr = await swimClassRepo.enroll(api, memberId, offering.id, name);
      setCheckoutClass(null);
      setEnrollTarget(null);
      dialog.show({
        title: 'You are enrolled',
        message: `${name} is enrolled in ${offering.title} (${offering.day}s ${offering.startTime}).${
          enr.paidAmountCents > 0
            ? `\n\nReceipt: ${formatCents(enr.paidAmountCents)} charged to ${cardBrand} ending ${enr.paymentLast4 ?? cardLast4}.`
            : ''
        }`,
        icon: 'checkmark',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      await load();
    } catch (e) {
      setCheckoutClass(null);
      setEnrollTarget(null);
      dialog.show({
        title: 'Could not enroll',
        message: e instanceof Error ? e.message : 'Please try again.',
        icon: 'alert',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setBusy(false);
    }
  };

  const requestRefund = (e: SwimClassEnrollment) => {
    const contacts = AQUATICS_SESSION_INFO.contacts
      .map((c) => `${c.name} (${c.role}): ${c.email}`)
      .join('\n');
    dialog.show({
      title: 'Request a refund',
      message: `Refunds are only given for family emergencies or medical reasons with a doctor's note, and are prorated after the session starts.\n\nCancel this enrollment now, or contact the Aquatics team:\n${contacts}`,
      icon: 'alert',
      buttons: [
        { text: 'Keep class', style: 'cancel' },
        {
          text: 'Cancel enrollment',
          style: 'default',
          onPress: () => {
            void (async () => {
              try {
                await swimClassRepo.cancel(api, memberId, e.id);
                await load();
              } catch (err) {
                setError(true);
              }
            })();
          },
        },
      ],
    });
  };

  const filteredClasses = AQUATICS_CLASSES.filter(
    (c) =>
      (filters.day === 'All' ||
        c.day === filters.day ||
        (filters.day === 'Monday' && c.stageCode === 'Masters')) &&
      (filters.age === 'All' || c.ageCategory === filters.age)
  );
  const enrolledIds = new Set(myEnrollments.map((e) => e.classId));
  const info = AQUATICS_SESSION_INFO;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader subtitle={isChange ? 'Change lesson' : 'Book a lesson'} />
      <Pressable
        onPress={() => router.back()}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Text style={[styles.backText, { color: colors.primary }]} allowFontScaling>
          ‹ Back
        </Text>
      </Pressable>
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      {!isChange ? (
        <View style={styles.tabsWrap}>
          <BookingTabs
            tabs={[
              { key: 'private' as const, label: 'Private Lessons' },
              { key: 'classes' as const, label: 'Swim Classes' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {tab === 'private' ? (
          <>
            <Pressable
              onPress={() => setPackageModalVisible(true)}
              style={[styles.rates, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="View wellness training packages and rates"
            >
              <Ionicons name="pricetag" size={18} color={colors.primary} />
              <Text style={[styles.ratesText, { color: colors.text }]} allowFontScaling>
                Packages and rates: 30 min {formatCents(pricing.training[30])}, 60 min{' '}
                {formatCents(pricing.training[60])}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </Pressable>

            {!isChange ? (
              <>
                <Text style={[styles.section, { color: colors.text }]} allowFontScaling>
                  1. Lesson type
                </Text>
                <LessonTypeToggle value={lessonType} onChange={handleSelectType} pricing={pricing} />

                <Text style={[styles.section, { color: colors.text }]} allowFontScaling>
                  2. Length
                </Text>
                <View style={styles.durationRow}>
                  {([30, 60] as const).map((d) => {
                    const active = d === duration;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => setDuration(d)}
                        style={[
                          styles.duration,
                          {
                            backgroundColor: active ? colors.primary : colors.cardBg,
                            borderColor: active ? colors.primary : colors.cardBorder,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${d} minutes, ${formatCents(lessonPriceCents(pricing, lessonType, d))}`}
                      >
                        <Text style={{ color: active ? '#FFFFFF' : colors.text, fontWeight: '800', fontSize: 16 }}>
                          {d} min
                        </Text>
                        <Text style={{ color: active ? '#FFFFFF' : colors.primary, fontWeight: '700' }}>
                          {formatCents(lessonPriceCents(pricing, lessonType, d))}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <Text style={[styles.section, { color: colors.text }]} allowFontScaling>
              {isChange ? 'Pick a new time' : '3. Instructor'}
            </Text>
            {!isChange ? (
              instructors.length === 0 ? (
                <Text style={{ color: colors.textMuted }} allowFontScaling>
                  No instructors are available for this lesson type right now.
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
                  {instructors.map((t) => (
                    <InstructorCard
                      key={t.id}
                      staff={t}
                      selected={t.id === trainerId}
                      isAssigned={t.id === assignedId}
                      onPress={() => {
                        setTrainerId(t.id);
                        setSlotId(null);
                      }}
                    />
                  ))}
                </ScrollView>
              )
            ) : (
              <Text style={{ color: colors.textMuted }} allowFontScaling>
                Same instructor: {allStaff.find((s) => s.id === trainerId)?.name ?? 'your trainer'}. No new
                charge for changing the time.
              </Text>
            )}

            {!isChange ? (
              <Text style={[styles.section, { color: colors.text }]} allowFontScaling>
                4. Day and time
              </Text>
            ) : null}
            <DaySlotPicker
              today={today}
              slots={slots}
              selectedDay={selectedDay}
              onSelectDay={(d) => {
                setSelectedDay(d);
                setSlotId(null);
              }}
              selectedSlotId={slotId}
              onSelectSlot={setSlotId}
              durationMin={duration}
            />

            {lessonType === 'swim' && !isChange ? (
              <>
                <Text style={[styles.section, { color: colors.text }]} allowFontScaling>
                  5. Swimmer details
                </Text>
                <SwimDetailsForm
                  swimmerName={swimmerName}
                  onSwimmerName={setSwimmerName}
                  stageCode={stageCode}
                  onStageCode={setStageCode}
                  notes={notes}
                  onNotes={setNotes}
                  memberName={member?.name ?? ''}
                  onOpenGuide={() => router.push('/(member)/aquatics-guide')}
                />
              </>
            ) : null}

            <Text style={[styles.policy, { color: colors.textMuted }]} allowFontScaling>
              Need to cancel? Cancel from My Schedule before your lesson. Silver Spring pool hours: Mon-Fri
              6:00 AM - 9:45 PM, Sat 7:00 AM - 7:45 PM, Sun 8:00 AM - 7:45 PM.
            </Text>
          </>
        ) : (
          <>
            <View style={[styles.session, { backgroundColor: colors.primary }]}>
              <Text style={styles.sessionTitle} allowFontScaling>
                {info.sessionName}
              </Text>
              <Text style={styles.sessionLine} allowFontScaling>
                {info.startDate} - {info.endDate}
              </Text>
              <Text style={styles.sessionLine} allowFontScaling>
                {info.laborDayNotice}
              </Text>
              <Text style={styles.sessionLine} allowFontScaling>
                Registration opens {info.registrationDates.fullMembers} (Full Members) and{' '}
                {info.registrationDates.programMembers} (Program Members)
              </Text>
              <View style={styles.tierPill}>
                <Text style={styles.tierText}>
                  Your rate: {tier === 'full' ? 'Full Member' : 'Program Member'}
                </Text>
              </View>
            </View>

            <MySwimEnrollments enrollments={myEnrollments} onRequestRefund={requestRefund} />

            <SwimClassFilters value={filters} onChange={setFilters} />

            <Text style={{ color: colors.textMuted, fontSize: 13 }} allowFontScaling>
              {filteredClasses.length} classes
            </Text>
            {filteredClasses.length === 0 ? (
              <Text style={{ color: colors.textMuted, textAlign: 'center' }} allowFontScaling>
                No classes match these filters.
              </Text>
            ) : null}
            {filteredClasses.map((c) => (
              <SwimClassRow
                key={c.id}
                offering={c}
                priceCents={swimClassPriceCents(pricing, c, tier)}
                otherTierCents={swimClassPriceCents(pricing, c, tier === 'full' ? 'program' : 'full')}
                spotsLeft={SWIM_CLASS_CAPACITY - (counts[c.id] ?? 0)}
                enrolled={enrolledIds.has(c.id)}
                onPress={() => setEnrollTarget(c)}
              />
            ))}
          </>
        )}
      </ScrollView>

      {tab === 'private' ? (
        <BookingSummaryBar
          title={
            selectedSlot
              ? `${activeTrainer?.name ?? 'Instructor'} · ${formatSlot(selectedSlot.start)}`
              : 'Select a day and time'
          }
          detail={`${lessonType === 'swim' ? 'Private swim lesson' : 'Personal training'} · ${duration} min · ${
            isChange ? 'No new charge' : formatCents(chargeCents)
          }`}
          buttonLabel={
            isChange ? 'Confirm change' : chargeCents > 0 ? `Book & Pay ${formatCents(chargeCents)}` : 'Book'
          }
          disabled={!selectedSlot || busy}
          loading={busy && !checkoutOpen}
          onPress={() => setCheckoutOpen(true)}
        />
      ) : null}

      <LessonCheckoutSheet
        visible={checkoutOpen}
        title={isChange ? 'Confirm new time' : 'Review and pay'}
        lines={[
          { label: 'Lesson', value: lessonType === 'swim' ? 'Private swim lesson' : 'Personal training' },
          { label: 'Instructor', value: activeTrainer?.name ?? '' },
          { label: 'When', value: selectedSlot ? formatSlot(selectedSlot.start) : '' },
          { label: 'Length', value: `${duration} minutes` },
          ...(selectedSlot ? [{ label: 'Where', value: selectedSlot.location }] : []),
          ...(lessonType === 'swim' && !isChange
            ? [{ label: 'Swimmer', value: swimmerName.trim() || member?.name || 'Myself' }]
            : []),
        ]}
        totalCents={isChange ? 0 : chargeCents}
        paymentBrand={cardBrand}
        paymentLast4={cardLast4}
        busy={busy}
        footnote="Cancel before your lesson from My Schedule."
        onConfirm={() => void doBookLesson()}
        onClose={() => setCheckoutOpen(false)}
      />

      <SwimEnrollSheet
        offering={enrollTarget && !checkoutClass ? enrollTarget : null}
        priceCents={enrollTarget ? swimClassPriceCents(pricing, enrollTarget, tier) : 0}
        defaultName={member?.name ?? ''}
        onClose={() => setEnrollTarget(null)}
        onContinue={(name) => {
          if (enrollTarget) {
            setCheckoutClass({ offering: enrollTarget, name });
          }
        }}
      />

      <LessonCheckoutSheet
        visible={checkoutClass !== null}
        title="Review and pay"
        lines={
          checkoutClass
            ? [
                { label: 'Class', value: checkoutClass.offering.title },
                { label: 'Participant', value: checkoutClass.name },
                {
                  label: 'Schedule',
                  value: `${checkoutClass.offering.day}s ${checkoutClass.offering.startTime}`,
                },
                { label: 'Classes', value: `${checkoutClass.offering.totalClasses} sessions` },
                { label: 'Rate', value: tier === 'full' ? 'Full Member' : 'Program Member' },
              ]
            : []
        }
        totalCents={checkoutClass ? swimClassPriceCents(pricing, checkoutClass.offering, tier) : 0}
        paymentBrand={cardBrand}
        paymentLast4={cardLast4}
        busy={busy}
        confirmLabel={
          checkoutClass && swimClassPriceCents(pricing, checkoutClass.offering, tier) === 0
            ? 'Enroll for free'
            : undefined
        }
        footnote="Refunds only for family emergencies or medical reasons with a doctor's note."
        onConfirm={() => void doEnroll()}
        onClose={() => {
          setCheckoutClass(null);
          setEnrollTarget(null);
        }}
      />

      <WellnessPackageModal
        visible={packageModalVisible}
        onClose={() => setPackageModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  back: { minHeight: tapTarget, paddingHorizontal: spacing.md, justifyContent: 'center' },
  backText: { fontSize: 18, fontWeight: '600' },
  tabsWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
  scroll: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  rates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: radii.md,
    padding: 12,
  },
  ratesText: { flex: 1, fontSize: 13, fontWeight: '700' },
  section: { fontSize: 16, fontWeight: '800', marginTop: spacing.xs },
  durationRow: { flexDirection: 'row', gap: spacing.xs },
  duration: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radii.card,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cards: { gap: 8 },
  policy: { fontSize: 12, marginTop: spacing.xs },
  session: { borderRadius: radii.card, padding: spacing.sm, gap: 4 },
  sessionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  sessionLine: { color: '#FFFFFF', fontSize: 12 },
  tierPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  tierText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
});
