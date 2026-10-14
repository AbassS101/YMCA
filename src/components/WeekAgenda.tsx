import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { useTheme } from '@/context/ThemeContext';
import { getClassFullDescription, requiresAdvanceRegistration } from '@/domain/classCatalog';
import { DEFAULT_LESSON_PRICING, lessonPriceCents } from '@/domain/lessonPricing';
import type { PrivateLesson, ScheduleItem } from '@/domain/types';
import { radii, spacing, typography } from '@/theme/typography';

export type WeekItem =
  | { kind: 'class'; item: ScheduleItem; paidAmountCents?: number; starredOnly?: boolean }
  | { kind: 'lesson'; item: PrivateLesson };

type Tone = 'blue' | 'green' | 'gold' | 'purple';

type Display = {
  label: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: Tone;
  status: string;
  statusTone: Tone;
  summary: string;
  instructor: string;
};

const TONES: Record<Tone, { fg: string; bg: string; darkBg: string }> = {
  blue: { fg: '#0369A1', bg: '#E0F2FE', darkBg: '#0C4A6E' },
  green: { fg: '#15803D', bg: '#DCFCE7', darkBg: '#14532D' },
  gold: { fg: '#B45309', bg: '#FEF3C7', darkBg: '#78350F' },
  purple: { fg: '#6D28D9', bg: '#EDE9FE', darkBg: '#4C1D95' },
};

function cents(value: number): string {
  return `$${(value / 100).toFixed(value % 100 === 0 ? 0 : 2)}`;
}

function lessonAmount(l: PrivateLesson): number {
  if (l.paidAmountCents && l.paidAmountCents > 0) return l.paidAmountCents;
  return lessonPriceCents(DEFAULT_LESSON_PRICING, l.lessonType ?? 'training', l.durationMin === 60 ? 60 : 30);
}

function describe(w: WeekItem, staffNames: Record<string, string>): Display {
  if (w.kind === 'class') {
    const { item } = w;
    const price = item.priceCents ?? 0;
    const registered = !w.starredOnly;
    let status = 'Included with membership';
    let statusTone: Tone = 'green';
    if (w.starredOnly) {
      status = 'Starred · drop-in';
      statusTone = 'gold';
    } else if (price > 0) {
      status = `Paid ${cents(w.paidAmountCents ?? price)}`;
      statusTone = 'blue';
    } else if (registered && requiresAdvanceRegistration(item)) {
      status = 'Registered';
    }
    return {
      label: item.category === 'event' ? 'EVENT' : w.starredOnly ? 'STARRED CLASS' : 'BOOKED CLASS',
      title: item.title,
      icon: w.starredOnly ? 'star' : item.category === 'event' ? 'calendar' : 'fitness',
      tone: w.starredOnly ? 'gold' : item.category === 'event' ? 'purple' : 'blue',
      status,
      statusTone,
      summary: getClassFullDescription(item),
      instructor: item.instructorName,
    };
  }

  const l = w.item;
  const swim = l.lessonType === 'swim';
  const trainer = staffNames[l.staffId] ?? 'Your trainer';
  let status: string;
  let statusTone: Tone;
  if (l.isOrientation) {
    status = 'Free orientation';
    statusTone = 'green';
  } else if (l.paymentStatus === 'due') {
    status = `${cents(lessonAmount(l))} due after session`;
    statusTone = 'gold';
  } else {
    status = `Paid ${cents(lessonAmount(l))}`;
    statusTone = 'blue';
  }
  return {
    label: l.isOrientation ? 'WELLNESS ORIENTATION' : swim ? 'SWIM LESSON' : 'PRIVATE SESSION',
    title: l.isOrientation ? 'Wellness Orientation' : swim ? 'Private Swim Lesson' : 'Personal Training',
    icon: swim ? 'water' : l.isOrientation ? 'compass' : 'barbell',
    tone: l.isOrientation ? 'green' : swim ? 'blue' : 'purple',
    status,
    statusTone,
    summary:
      l.notes ??
      (swim
        ? 'One-on-one coaching in the pool, tailored to your swimmer.'
        : 'One-on-one coaching tailored to your goals.'),
    instructor: trainer,
  };
}

function minutesBetween(startIso: string, endIso: string): number {
  return Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
}

function timeRange(startIso: string, endIso: string): string {
  const f = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${f(startIso)} – ${f(endIso)}`;
}

function weekday(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
}

function dayNumber(iso: string): string {
  return String(new Date(iso).getDate());
}

function longDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

type Props = {
  items: WeekItem[];
  staffNames: Record<string, string>;
  onBrowse: () => void;
  onBookLesson?: () => void;
  onUnstar: (scheduleItemId: string) => Promise<void> | void;
};

export function WeekAgenda({ items, staffNames, onBrowse, onBookLesson, onUnstar }: Props) {
  const { colors, isDark } = useTheme();
  const [selected, setSelected] = useState<WeekItem | null>(null);

  const tone = (t: Tone) => ({
    fg: isDark ? '#E2E8F0' : TONES[t].fg,
    bg: isDark ? TONES[t].darkBg : TONES[t].bg,
  });

  const detail = selected ? describe(selected, staffNames) : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>This Week</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {items.length === 0
              ? 'Nothing planned yet'
              : `${items.length} ${items.length === 1 ? 'plan' : 'plans'} · classes & sessions`}
          </Text>
        </View>
        <Pressable onPress={onBrowse} hitSlop={8} accessibilityRole="button" accessibilityLabel="See full schedule">
          <Text style={[styles.seeAll, { color: colors.primary }]}>Full schedule ›</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <Ionicons name="calendar-outline" size={28} color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Star drop-in classes for reminders or reserve a spot in a program.
          </Text>
          <PrimaryButton title="Explore Classes & Events" onPress={onBrowse} />
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
          {items.map((w) => {
            const d = describe(w, staffNames);
            const t = tone(d.tone);
            const s = tone(d.statusTone);
            return (
              <Pressable
                key={`${w.kind}-${w.item.id}`}
                onPress={() => setSelected(w)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, opacity: pressed ? 0.85 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${d.title}, ${longDay(w.item.start)}. Tap for details`}
              >
                <View style={[styles.dateTile, { backgroundColor: t.bg }]}>
                  <Text style={[styles.dateDow, { color: t.fg }]}>{weekday(w.item.start)}</Text>
                  <Text style={[styles.dateNum, { color: t.fg }]}>{dayNumber(w.item.start)}</Text>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.labelRow}>
                    <Ionicons name={d.icon} size={11} color={t.fg} />
                    <Text style={[styles.label, { color: t.fg }]} numberOfLines={1}>
                      {d.label}
                    </Text>
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                    {d.title}
                  </Text>
                  <Text style={[styles.cardTime, { color: colors.textMuted }]} numberOfLines={1}>
                    {timeRange(w.item.start, w.item.end)} · {w.item.location}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                    <Text style={[styles.statusText, { color: s.fg }]} numberOfLines={1}>
                      {d.status}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={selected != null} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelected(null)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.cardBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            {selected && detail ? (
              <>
                <View style={styles.sheetHeader}>
                  <View style={[styles.sheetIcon, { backgroundColor: tone(detail.tone).bg }]}>
                    <Ionicons name={detail.icon} size={22} color={tone(detail.tone).fg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: tone(detail.tone).fg }]}>{detail.label}</Text>
                    <Text style={[styles.sheetTitle, { color: colors.text }]}>{detail.title}</Text>
                  </View>
                  <Pressable onPress={() => setSelected(null)} hitSlop={10} accessibilityLabel="Close details">
                    <Ionicons name="close" size={24} color={colors.textMuted} />
                  </Pressable>
                </View>

                <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 12 }}>
                  <InfoRow icon="calendar-outline" text={longDay(selected.item.start)} />
                  <InfoRow
                    icon="time-outline"
                    text={`${timeRange(selected.item.start, selected.item.end)} (${minutesBetween(selected.item.start, selected.item.end)} min)`}
                  />
                  <InfoRow icon="location-outline" text={selected.item.location} />
                  <InfoRow
                    icon="person-outline"
                    text={selected.kind === 'lesson' ? `With ${detail.instructor}` : `Instructor: ${detail.instructor}`}
                  />
                  <InfoRow icon="pricetag-outline" text={detail.status} strong />
                  {selected.kind === 'lesson' && !selected.item.isOrientation ? (
                    <Text style={[styles.note, { color: colors.textMuted }]}>
                      Private sessions are a paid add-on to your membership. Only the wellness orientation is free.
                    </Text>
                  ) : null}
                  <Text style={[styles.body, { color: colors.text }]}>{detail.summary}</Text>
                </ScrollView>

                <View style={{ gap: 8, marginTop: spacing.md }}>
                  <PrimaryButton
                    title="Open Class Schedule"
                    onPress={() => {
                      setSelected(null);
                      onBrowse();
                    }}
                  />
                  {selected.kind === 'class' && selected.starredOnly ? (
                    <SecondaryButton
                      title="Remove Star"
                      onPress={async () => {
                        await onUnstar(selected.item.id);
                        setSelected(null);
                      }}
                    />
                  ) : null}
                  {selected.kind === 'lesson' && onBookLesson ? (
                    <SecondaryButton
                      title="Book Another Session"
                      onPress={() => {
                        setSelected(null);
                        onBookLesson();
                      }}
                    />
                  ) : null}
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function InfoRow({ icon, text, strong }: { icon: keyof typeof Ionicons.glyphMap; text: string; strong?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.infoText, { color: colors.text, fontWeight: strong ? '700' : '500' }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  title: { ...typography.title, fontSize: 22 },
  subtitle: { fontSize: 13, marginTop: 1 },
  seeAll: { fontSize: 13, fontWeight: '700' },
  list: { gap: 10, paddingVertical: 4, paddingRight: 8 },
  card: {
    width: 290,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  dateTile: { width: 52, height: 64, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateDow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  dateNum: { fontSize: 24, fontWeight: '800', lineHeight: 28 },
  cardBody: { flex: 1, gap: 3 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardTime: { fontSize: 12 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  statusText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 10, padding: spacing.md, borderRadius: radii.card, borderWidth: 1 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.md, paddingBottom: spacing.lg },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.md },
  sheetIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { flex: 1, fontSize: 15 },
  note: { fontSize: 12, lineHeight: 17 },
  body: { fontSize: 14, lineHeight: 21 },
});
