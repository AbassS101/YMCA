import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { WellnessPackageModal } from '@/components/WellnessPackageModal';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { getDemoToday } from '@/domain/demoClock';
import type { LessonSlot, Staff } from '@/domain/types';
import { lessonRepo } from '@/repositories/lessonRepo';
import { staffRepo } from '@/repositories/staffRepo';
import { cardStyle } from '@/theme/card';
import { radii, spacing, tapTarget, typography } from '@/theme/typography';

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatSlot(isoStart: string): string {
  const d = new Date(isoStart);
  const day = d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

export default function BookLessonScreen() {
  const router = useRouter();
  const { changeLessonId, staffId: paramStaffId } = useLocalSearchParams<{
    changeLessonId?: string;
    staffId?: string;
  }>();
  const { session, api } = useSession();
  const { colors, isDark } = useTheme();
  const memberId = session?.userId ?? '';

  const [trainers, setTrainers] = useState<Staff[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(
    typeof paramStaffId === 'string' && paramStaffId.length > 0 ? paramStaffId : null
  );
  const [slots, setSlots] = useState<LessonSlot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [packageModalVisible, setPackageModalVisible] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const isChange = typeof changeLessonId === 'string' && changeLessonId.length > 0;

  const load = useCallback(async () => {
    if (memberId === '') {
      return;
    }
    try {
      setError(false);
      const [assigned, allStaff] = await Promise.all([
        staffRepo.getAssignedTrainer(api, memberId),
        staffRepo.listStaff(api),
      ]);

      // Only staff who provide private training lessons
      const eligibleTrainers = allStaff.filter((s) => s.id !== 'staff-desk');
      setTrainers(eligibleTrainers);

      const activeTrainerId =
        selectedTrainerId ??
        (typeof paramStaffId === 'string' && paramStaffId.length > 0 ? paramStaffId : null) ??
        assigned?.id ??
        eligibleTrainers[0]?.id ??
        'staff-alex';

      setSelectedTrainerId(activeTrainerId);

      const today = getDemoToday();
      const open = await lessonRepo.listOpenSlots(api, activeTrainerId, today, addDays(today, 6));
      open.sort((a, b) => a.start.localeCompare(b.start));
      setSlots(open);
    } catch {
      setError(true);
    }
  }, [api, memberId, selectedTrainerId, paramStaffId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleSelectTrainer = async (trainerId: string) => {
    setSelectedTrainerId(trainerId);
    setSelectedId(null);
    try {
      const today = getDemoToday();
      const open = await lessonRepo.listOpenSlots(api, trainerId, today, addDays(today, 6));
      open.sort((a, b) => a.start.localeCompare(b.start));
      setSlots(open);
    } catch {
      // Retain existing state on error
    }
  };

  const activeTrainer = useMemo(
    () => trainers.find((t) => t.id === selectedTrainerId) ?? null,
    [trainers, selectedTrainerId]
  );

  const confirmBook = () => {
    if (!selectedId) {
      return;
    }
    const slot = slots.find((s) => s.id === selectedId);
    if (!slot) {
      return;
    }
    dialog.show({
      title: isChange ? 'Change lesson time?' : 'Book private lesson?',
      message: `${formatSlot(slot.start)} at ${slot.location} with ${activeTrainer?.name ?? 'your trainer'}.`,
      icon: 'calendar',
      buttons: [
        { text: 'Not now', style: 'cancel' },
        {
          text: isChange ? 'Change' : 'Book',
          style: 'default',
          onPress: () => void doBook(slot),
        },
      ],
    });
  };

  const doBook = async (slot: LessonSlot) => {
    if (memberId === '') {
      return;
    }
    setBusy(true);
    try {
      if (isChange && changeLessonId) {
        await lessonRepo.change(api, memberId, changeLessonId, slot.id);
      } else {
        await lessonRepo.book(api, memberId, slot.id);
      }
      dialog.show({
        title: isChange ? 'Lesson updated' : 'Lesson booked',
        message: `${formatSlot(slot.start)} is on your schedule.`,
        icon: 'checkmark',
        buttons: [{ text: 'OK', style: 'default', onPress: () => router.back() }],
      });
    } catch (e) {
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

  const cardTheme = {
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
  };

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
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Wellness Training Rates & Packages Info Card */}
        <Pressable
          onPress={() => setPackageModalVisible(true)}
          style={[
            styles.packageBanner,
            {
              backgroundColor: isDark ? '#0F172A' : '#EFF6FF',
              borderColor: colors.primary,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="View Wellness Training Packages, Rates, and Assessments"
        >
          <View style={styles.packageBannerLeft}>
            <View
              style={[
                styles.packageBannerIcon,
                { backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE' },
              ]}
            >
              <Ionicons name="pricetag" size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.packageBannerTitle, { color: colors.text }]} allowFontScaling>
                Wellness Training Rates & Packages
              </Text>
              <Text style={[styles.packageBannerSubtitle, { color: colors.primary }]} allowFontScaling>
                60-Min ($60) · 30-Min ($35) · Save up to $180 on multi-packs
              </Text>
            </View>
          </View>
          <View style={[styles.packageBannerBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.packageBannerBtnText}>Rates</Text>
            <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
          </View>
        </Pressable>

        {/* Trainer Selection Bar */}
        <View style={styles.trainerSelectorSection}>
          <Text style={[styles.trainerSelectorLabel, { color: colors.textMuted }]} allowFontScaling>
            Select Trainer:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trainerChipsScroll}
          >
            {trainers.map((t) => {
              const isSelected = t.id === selectedTrainerId;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => void handleSelectTrainer(t.id)}
                  style={[
                    styles.trainerChip,
                    {
                      backgroundColor: isSelected ? colors.primaryLight : colors.cardBg,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${t.name}, ${t.roleLabel}`}
                >
                  <Text
                    style={[
                      styles.trainerChipName,
                      {
                        color: isSelected
                          ? isDark
                            ? colors.primary
                            : colors.primaryDark
                          : colors.text,
                        fontWeight: isSelected ? '700' : '600',
                      },
                    ]}
                    allowFontScaling
                  >
                    {t.name}
                  </Text>
                  <Text
                    style={[
                      styles.trainerChipRole,
                      {
                        color: isSelected
                          ? colors.primary
                          : colors.textMuted,
                      },
                    ]}
                    numberOfLines={1}
                    allowFontScaling
                  >
                    {t.roleLabel}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <Text style={[styles.lead, { color: colors.text }]} allowFontScaling>
          {activeTrainer
            ? `Open times with ${activeTrainer.name} (${activeTrainer.roleLabel}):`
            : 'Select a trainer above to view available private lesson times.'}
        </Text>

        {slots.length === 0 && activeTrainer ? (
          <View style={[styles.emptyCard, cardTheme]}>
            <Text style={[styles.empty, { color: colors.textMuted }]} allowFontScaling>
              No open times this week for {activeTrainer.name}. Try selecting another trainer above or check back later.
            </Text>
          </View>
        ) : null}

        {slots.map((slot) => {
          const selected = selectedId === slot.id;
          return (
            <Pressable
              key={slot.id}
              onPress={() => setSelectedId(slot.id)}
              style={[
                styles.slot,
                cardTheme,
                selected && {
                  borderColor: colors.primary,
                  borderWidth: 2,
                  backgroundColor: colors.primaryLight,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={formatSlot(slot.start)}
              accessibilityHint="Select this time"
            >
              <Text
                style={[
                  styles.slotWhen,
                  { color: selected ? (isDark ? colors.primary : colors.primaryDark) : colors.text },
                ]}
                allowFontScaling
              >
                {formatSlot(slot.start)}
              </Text>
              <Text
                style={[
                  styles.slotMeta,
                  { color: colors.textMuted },
                ]}
                allowFontScaling
              >
                {slot.location}
              </Text>
            </Pressable>
          );
        })}

        <View style={styles.submitSection}>
          <PrimaryButton
            title={isChange ? 'Confirm change' : 'Confirm booking'}
            onPress={confirmBook}
            disabled={!selectedId || busy}
            loading={busy}
            accessibilityHint={
              isChange ? 'Change your lesson to the selected time' : 'Book the selected time'
            }
          />
        </View>
      </ScrollView>

      <WellnessPackageModal
        visible={packageModalVisible}
        onClose={() => setPackageModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  back: {
    minHeight: tapTarget,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  backText: {
    ...typography.bodyStrong,
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  packageBanner: {
    ...cardStyle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1.5,
    gap: 10,
    marginBottom: 4,
  },
  packageBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  packageBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  packageBannerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  packageBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  packageBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  trainerSelectorSection: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  trainerSelectorLabel: {
    ...typography.label,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trainerChipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  trainerChip: {
    borderRadius: radii.card,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 140,
    gap: 2,
  },
  trainerChipName: {
    ...typography.bodyStrong,
    fontSize: 14,
  },
  trainerChipRole: {
    ...typography.caption,
    fontSize: 12,
  },
  lead: {
    ...typography.bodyStrong,
    marginVertical: spacing.xs,
    fontSize: 16,
  },
  emptyCard: {
    ...cardStyle,
    padding: spacing.lg,
    alignItems: 'center',
  },
  empty: {
    ...typography.body,
    textAlign: 'center',
  },
  slot: {
    ...cardStyle,
    minHeight: tapTarget + 8,
    justifyContent: 'center',
    gap: 2,
  },
  slotWhen: {
    ...typography.bodyStrong,
  },
  slotMeta: {
    ...typography.caption,
  },
  submitSection: {
    marginTop: spacing.sm,
  },
});
