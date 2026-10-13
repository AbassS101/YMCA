import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { SWIM_STAGES } from '@/domain/aquaticsGuideData';
import { radii, spacing } from '@/theme/typography';

export const NOT_SURE_STAGE = 'unsure';

export function SwimDetailsForm({
  swimmerName,
  onSwimmerName,
  stageCode,
  onStageCode,
  notes,
  onNotes,
  memberName,
  onOpenGuide,
}: {
  swimmerName: string;
  onSwimmerName: (v: string) => void;
  stageCode: string;
  onStageCode: (v: string) => void;
  notes: string;
  onNotes: (v: string) => void;
  memberName: string;
  onOpenGuide: () => void;
}) {
  const { colors } = useTheme();
  const stages = [...SWIM_STAGES.map((s) => s.code), NOT_SURE_STAGE];
  const isMyself = swimmerName.trim() === '' || swimmerName === memberName;

  return (
    <View style={[styles.box, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      <Text style={[styles.label, { color: colors.text }]} allowFontScaling>
        Who is swimming?
      </Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => onSwimmerName('')}
          style={[
            styles.pill,
            {
              backgroundColor: isMyself ? colors.primary : colors.cardBg,
              borderColor: isMyself ? colors.primary : colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: isMyself }}
        >
          <Text style={{ color: isMyself ? '#FFFFFF' : colors.text, fontWeight: '700' }}>Myself</Text>
        </Pressable>
        <TextInput
          value={isMyself ? '' : swimmerName}
          onChangeText={onSwimmerName}
          placeholder="Or a child's name"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          accessibilityLabel="Swimmer name"
        />
      </View>

      <View style={styles.stageHeader}>
        <Text style={[styles.label, { color: colors.text }]} allowFontScaling>
          Swim stage
        </Text>
        <Pressable onPress={onOpenGuide} accessibilityRole="link" accessibilityLabel="Which stage?">
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Which stage?</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {stages.map((code) => {
          const active = stageCode === code;
          return (
            <Pressable
              key={code}
              onPress={() => onStageCode(code)}
              style={[
                styles.stage,
                {
                  backgroundColor: active ? colors.primary : colors.cardBg,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={code === NOT_SURE_STAGE ? 'Not sure' : `Stage ${code}`}
            >
              <Text style={{ color: active ? '#FFFFFF' : colors.text, fontWeight: '800' }}>
                {code === NOT_SURE_STAGE ? 'Not sure' : code}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.label, { color: colors.text }]} allowFontScaling>
        Notes for the instructor (optional)
      </Text>
      <TextInput
        value={notes}
        onChangeText={onNotes}
        placeholder="Goals, comfort level, medical notes"
        placeholderTextColor={colors.textMuted}
        multiline
        style={[styles.input, styles.notes, { color: colors.text, borderColor: colors.border }]}
        accessibilityLabel="Notes for the instructor"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: radii.card, padding: spacing.sm, gap: spacing.xs },
  label: { fontSize: 14, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { borderWidth: 1.5, borderRadius: radii.full, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
  input: { flex: 1, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: 12, minHeight: 44, fontSize: 15 },
  notes: { minHeight: 72, textAlignVertical: 'top', paddingTop: 10, flex: 0 },
  stage: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
