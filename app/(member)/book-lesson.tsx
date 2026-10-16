import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/components/AppText';

import { BookingSummaryBar } from '@/components/booking/BookingSummaryBar';
import { BookingTabs } from '@/components/booking/BookingTabs';
import { DaySlotPicker, localDayKey, type PickerTime } from '@/components/booking/DaySlotPicker';
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
import { useAppConfig } from '@/context/AppConfigContext';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { householdRepo } from '@/repositories/householdRepo';
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
  swimClassPriceCents,
} from '@/domain/lessonPricing';
import { swimClassCapacity } from '@/domain/appConfig';
import { dedupeByStart, sessionLengthsFor } from '@/domain/sessionAvailability';
import type {
  BookableTime,
  LessonPricing,
  LessonType,
  Member,
  Membership,
  PaymentTiming,
  PrivateLesson,
  Staff,
  SwimClassEnrollment,
} from '@/domain/types';
import { lessonRepo, pricingRepo, sessionRequestRepo, swimClassRepo } from '@/repositories/lessonRepo';
import { MySessionRequests } from '@/components/booking/MySessionRequests';
import { staffRepo } from '@/repositories/staffRepo';
import { radii, spacing, tapTarget } from '@/theme/typography';

type Tab = 'private' | 'classes';

const ANY_INSTRUCTOR = 'any';
const ANY_STAFF: Staff = {
  id: ANY_INSTRUCTOR,
  name: 'Any available',
  email: '',
  roleLabel: 'First open time with any instructor',
  homeBranchId: '',
};

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
    date?: string;
    tab?: string;
    classId?: string;
    type?: string;
  }>();
  const { session, api } = useSession();
  const { colors } = useTheme();
  const { featureToggles, swimClasses } = useAppConfig().config;
  const memberId = session?.userId ?? '';
  const today = getDemoToday();

  const isChange = typeof params.changeLessonId === 'string' && params.changeLessonId.length > 0;

  const [tab, setTab] = useState<Tab>(params.tab === 'classes' && !isChange ? 'classes' : 'private');
  const [pricing, setPricing] = useState<LessonPricing>(DEFAULT_LESSON_PRICING);
  const [member, setMember] = useState<Member | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [family, setFamily] = useState<{ id: string; name: string }[]>([]);
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
  const [times, setTimes] = useState<BookableTime[]>([]);
  const [selectedDay, setSelectedDay] = useState(
    typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date) && params.date >= today ? params.date : today
  );
  const [timeKey, setTimeKey] = useState<string | null>(null);
  const [paymentTiming, setPaymentTiming] = useState<PaymentTiming>('before');
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

  // Tabs follow the lesson-booking and swim-enrollment toggles.
  const tabOptions = [
    ...(featureToggles.lessonBooking ? [{ key: 'private' as const, label: 'Private Lessons' }] : []),
    ...(featureToggles.swimClassEnrollment ? [{ key: 'classes' as const, label: 'Swim Classes' }] : []),
  ];
  const activeTab: Tab = tabOptions.some((t) => t.key === tab) ? tab : (tabOptions[0]?.key ?? tab);

  const instructors = useMemo(
    () =>
      allStaff.filter(
        (s) => s.id !== 'staff-desk' && (s.lessonTypes ?? ['training']).includes(lessonType)
      ),
    [allStaff, lessonType]
  );
  const isAny = trainerId === ANY_INSTRUCTOR;
  const activeTrainer = instructors.find((t) => t.id === trainerId) ?? null;

  const allowedLengths = useMemo<(30 | 60)[]>(() => {
    const pool = isAny ? instructors : activeTrainer ? [activeTrainer] : [];
    const set = new Set<30 | 60>();
    for (const s of pool) sessionLengthsFor(s).forEach((l) => set.add(l));
    const out = ([30, 60] as const).filter((l) => set.has(l));
    return out.length > 0 ? out : [30, 60];
  }, [isAny, instructors, activeTrainer]);

  useEffect(() => {
    if (!allowedLengths.includes(duration)) {
      setDuration(allowedLengths[0]);
    }
  }, [allowedLengths, duration]);

  const staffName = useCallback(
    (id: string) => allStaff.find((s) => s.id === id)?.name ?? 'Instructor',
    [allStaff]
  );

  const loadTimes = useCallback(async () => {
    if (!trainerId || memberId === '') {
      return;
    }
    try {
      const open = await sessionRequestRepo.bookableTimes(api, memberId, {
        lessonType,
        durationMin: duration,
        from: today,
        to: addDays(today, 13),
        staffId: trainerId === ANY_INSTRUCTOR ? undefined : trainerId,
      });
      const list = trainerId === ANY_INSTRUCTOR ? dedupeByStart(open) : open;
      setTimes(list);
      const first = list[0];
      setSelectedDay(first ? localDayKey(first.start) : today);
      setTimeKey(null);
    } catch {
      setError(true);
    }
  }, [api, memberId, trainerId, lessonType, duration, today]);

  const pickerTimes = useMemo<PickerTime[]>(
    () =>
      times.map((t) => ({
        key: `${t.staffId}|${t.start}`,
        start: t.start,
        end: t.end,
        location: t.location,
        instant: t.instant,
        label: isAny ? staffName(t.staffId) : undefined,
      })),
    [times, isAny, staffName]
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
      try {
        const hh = await householdRepo.get(api, memberId);
        setFamily(hh.members.map((p) => ({ id: p.id, name: p.name })));
      } catch {
        setFamily([]);
      }
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
    if (trainerId && (trainerId === ANY_INSTRUCTOR || instructors.some((i) => i.id === trainerId))) {
      return;
    }
    const preferred = instructors.find((i) => i.id === assignedId) ?? instructors[0];
    setTrainerId(preferred.id);
  }, [instructors, trainerId, assignedId]);

  useEffect(() => {
    void loadTimes();
  }, [loadTimes]);

  // Open the enroll sheet when arriving from the aquatics guide.
  useEffect(() => {
    if (typeof params.classId === 'string') {
      const c = AQUATICS_CLASSES.find((x) => x.id === params.classId);
      if (c && !swimClasses.hidden.includes(c.id)) {
        setEnrollTarget(c);
      }
    }
  }, [params.classId, swimClasses.hidden]);

  const selectedTime = times.find((t) => `${t.staffId}|${t.start}` === timeKey) ?? null;
  const selectedInstructor = selectedTime ? allStaff.find((s) => s.id === selectedTime.staffId) ?? null : null;
  const effectiveTiming: PaymentTiming = isChange ? (oldLesson?.paymentTiming ?? 'before') : paymentTiming;
  const instant = Boolean(selectedTime?.instant);
  const priceCents = lessonPriceCents(pricing, lessonType, duration);
  // Money moves only once the session is confirmed, and only when paying before.
  const chargeCents = isChange ? 0 : priceCents;
  const dueNowCents = !isChange && instant && effectiveTiming === 'before' ? priceCents : 0;
  const cardBrand = membership?.paymentBrand ?? 'Visa';
  const cardLast4 = membership?.paymentLast4 ?? '4242';

  const handleSelectType = (t: LessonType) => {
    setLessonType(t);
    setTrainerId(null);
    setTimeKey(null);
  };

  const doBookLesson = async () => {
    if (!selectedTime || memberId === '') {
      return;
    }
    setBusy(true);
    try {
      const req = await sessionRequestRepo.create(api, memberId, {
        staffId: selectedTime.staffId,
        lessonType,
        durationMin: duration,
        start: selectedTime.start,
        paymentTiming: effectiveTiming,
        swimmerName: lessonType === 'swim' ? swimmerName : undefined,
        stageCode: lessonType === 'swim' ? stageCode : undefined,
        notes: notes || undefined,
        replacesLessonId: isChange ? params.changeLessonId : undefined,
      });
      setCheckoutOpen(false);
      const who = selectedInstructor?.name ?? 'your instructor';
      const confirmed = req.status === 'accepted';
      dialog.show({
        title: confirmed ? 'Lesson booked' : 'Request sent',
        message: confirmed
          ? `${formatSlot(selectedTime.start)} with ${who} is on your schedule.${
              dueNowCents > 0
                ? `\n\nReceipt: ${formatCents(dueNowCents)} charged to ${cardBrand} ending ${cardLast4}.`
                : effectiveTiming === 'after'
                  ? '\n\nYou will be charged after the session.'
                  : ''
            }`
          : `${who} will accept, decline, or offer another time for ${formatSlot(selectedTime.start)}. We will notify you.${
              effectiveTiming === 'before'
                ? `\n\nYour card is only charged (${formatCents(priceCents)}) once the session is confirmed.`
                : '\n\nYou will be charged after the session.'
            }`,
        icon: 'checkmark',
        buttons: [{ text: 'OK', style: 'default', onPress: () => router.back() }],
      });
    } catch (e) {
      setCheckoutOpen(false);
      void loadTimes();
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
              } catch {
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
      !swimClasses.hidden.includes(c.id) &&
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

      {!isChange && tabOptions.length > 1 ? (
        <View style={styles.tabsWrap}>
          <BookingTabs
            tabs={tabOptions}
            value={activeTab}
            onChange={setTab}
          />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {activeTab === 'private' ? (
          <>
            {!isChange ? <MySessionRequests onChanged={() => void loadTimes()} /> : null}
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
                  {allowedLengths.map((d) => {
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
                  {[ANY_STAFF, ...instructors].map((t) => (
                    <InstructorCard
                      key={t.id}
                      staff={t}
                      selected={t.id === trainerId}
                      isAssigned={t.id === assignedId}
                      onPress={() => {
                        setTrainerId(t.id);
                        setTimeKey(null);
                      }}
                    />
                  ))}
                </ScrollView>
              )
            ) : (
              <Text style={{ color: colors.textMuted }} allowFontScaling>
                Same instructor: {allStaff.find((s) => s.id === trainerId)?.name ?? 'your trainer'}. No new
                charge for changing the time. Your current lesson stays until the new time is confirmed.
              </Text>
            )}

            {!isChange ? (
              <Text style={[styles.section, { color: colors.text }]} allowFontScaling>
                4. Day and time
              </Text>
            ) : null}
            <DaySlotPicker
              today={today}
              times={pickerTimes}
              selectedDay={selectedDay}
              onSelectDay={(d) => {
                setSelectedDay(d);
                setTimeKey(null);
              }}
              selectedKey={timeKey}
              onSelect={setTimeKey}
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
                  household={family.filter((p) => p.id !== memberId)}
                  onOpenGuide={() => router.push('/(member)/aquatics-guide')}
                />
              </>
            ) : null}

            {!isChange ? (
              <>
                <Text style={[styles.section, { color: colors.text }]} allowFontScaling>
                  {lessonType === 'swim' ? '6. Payment' : '5. Payment'}
                </Text>
                <View style={styles.durationRow}>
                  {(
                    [
                      { key: 'before', title: 'Pay now', sub: 'Charged when confirmed' },
                      { key: 'after', title: 'Pay after', sub: 'Charged after the session' },
                    ] as const
                  ).map((o) => {
                    const active = paymentTiming === o.key;
                    return (
                      <Pressable
                        key={o.key}
                        onPress={() => setPaymentTiming(o.key)}
                        style={[
                          styles.duration,
                          {
                            backgroundColor: active ? colors.primary : colors.cardBg,
                            borderColor: active ? colors.primary : colors.cardBorder,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${o.title}. ${o.sub}`}
                      >
                        <Text style={{ color: active ? '#FFFFFF' : colors.text, fontWeight: '800', fontSize: 16 }}>
                          {o.title}
                        </Text>
                        <Text style={{ color: active ? '#FFFFFF' : colors.textMuted, fontSize: 12 }}>{o.sub}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <Text style={[styles.policy, { color: colors.textMuted }]} allowFontScaling>
              Your instructor reviews each request and can accept, decline, or offer another time. Need to cancel? Cancel from My Schedule before your lesson. Silver Spring pool hours: Mon-Fri
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
                spotsLeft={swimClassCapacity(swimClasses, c.id) - (counts[c.id] ?? 0)}
                enrolled={enrolledIds.has(c.id)}
                onPress={() => setEnrollTarget(c)}
              />
            ))}
          </>
        )}
      </ScrollView>

      {activeTab === 'private' ? (
        <BookingSummaryBar
          title={
            selectedTime
              ? `${selectedInstructor?.name ?? 'Instructor'} · ${formatSlot(selectedTime.start)}`
              : 'Select a day and time'
          }
          detail={`${lessonType === 'swim' ? 'Private swim lesson' : 'Personal training'} · ${duration} min · ${
            isChange ? 'No new charge' : formatCents(chargeCents)
          }`}
          buttonLabel={
            instant
              ? isChange
                ? 'Confirm change'
                : dueNowCents > 0
                  ? `Book & Pay ${formatCents(dueNowCents)}`
                  : 'Book'
              : 'Send request'
          }
          disabled={!selectedTime || busy}
          loading={busy && !checkoutOpen}
          onPress={() => setCheckoutOpen(true)}
        />
      ) : null}

      <LessonCheckoutSheet
        visible={checkoutOpen}
        title={instant ? (isChange ? 'Confirm new time' : 'Review and book') : 'Review your request'}
        lines={[
          { label: 'Lesson', value: lessonType === 'swim' ? 'Private swim lesson' : 'Personal training' },
          { label: 'Instructor', value: selectedInstructor?.name ?? '' },
          { label: 'When', value: selectedTime ? formatSlot(selectedTime.start) : '' },
          { label: 'Length', value: `${duration} minutes` },
          ...(selectedTime ? [{ label: 'Where', value: selectedTime.location }] : []),
          { label: 'Price', value: isChange ? 'No new charge' : formatCents(priceCents) },
          {
            label: 'Payment',
            value: effectiveTiming === 'before' ? 'Pay now (when confirmed)' : 'Pay after the session',
          },
          ...(lessonType === 'swim' && !isChange
            ? [{ label: 'Swimmer', value: swimmerName.trim() || member?.name || 'Myself' }]
            : []),
        ]}
        totalCents={dueNowCents}
        totalText={dueNowCents > 0 ? undefined : 'Nothing charged yet'}
        confirmLabel={instant ? (dueNowCents > 0 ? undefined : 'Book') : 'Send request'}
        paymentBrand={cardBrand}
        paymentLast4={cardLast4}
        busy={busy}
        footnote={
          instant
            ? 'Instant booking is on for you with this instructor. Cancel before your lesson from My Schedule.'
            : 'Your instructor will accept, decline, or offer another time. Your card is not charged until the session is confirmed.'
        }
        onConfirm={() => void doBookLesson()}
        onClose={() => setCheckoutOpen(false)}
      />

      <SwimEnrollSheet
        offering={enrollTarget && !checkoutClass ? enrollTarget : null}
        priceCents={enrollTarget ? swimClassPriceCents(pricing, enrollTarget, tier) : 0}
        defaultName={member?.name ?? ''}
        household={family}
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
