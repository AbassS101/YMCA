import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import {
  SWIM_STAGES,
  type SwimStage,
  type SwimTrack,
} from '@/domain/aquaticsGuideData';
import { radii, spacing } from '@/theme/typography';

interface SwimStagesDiagramProps {
  onSelectStage?: (stage: SwimStage) => void;
}

export function SwimStagesDiagram({ onSelectStage }: SwimStagesDiagramProps) {
  const { colors: tc, isDark } = useTheme();
  const [selectedStageId, setSelectedStageId] = useState<string>('stage-1');
  const [activeTrackFilter, setActiveTrackFilter] = useState<SwimTrack | 'all'>('all');

  const selectedStage = SWIM_STAGES.find((s) => s.id === selectedStageId) || SWIM_STAGES[0];

  const filteredStages =
    activeTrackFilter === 'all'
      ? SWIM_STAGES
      : SWIM_STAGES.filter((s) => s.track === activeTrackFilter);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderColor: isDark ? '#1E293B' : '#E2E8F0',
        },
      ]}
    >
      {/* Title & Philosophy Banner */}
      <View style={styles.header}>
        <View style={styles.headerBadgeRow}>
          <View style={[styles.badgePill, { backgroundColor: '#E0F2FE' }]}>
            <Ionicons name="school" size={12} color="#0369A1" />
            <Text style={styles.badgePillText}>YMCA NATIONALLY CERTIFIED CURRICULUM</Text>
          </View>
        </View>
        <Text style={[styles.title, { color: tc.text }]}>
          Swim Lesson Progression Stages
        </Text>
        <Text style={[styles.subtitle, { color: tc.textMuted }]}>
          All age groups learn the same core aquatic skills divided according to their developmental milestones.
        </Text>
      </View>

      {/* Track Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.trackScroll}
      >
        {[
          { key: 'all' as const, label: 'All 8 Stages' },
          { key: 'starters' as const, label: '1. Swim Starters (A–B)' },
          { key: 'basics' as const, label: '2. Swim Basics (1–3)' },
          { key: 'strokes' as const, label: '3. Swim Strokes (4–6)' },
        ].map((t) => {
          const active = activeTrackFilter === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setActiveTrackFilter(t.key)}
              style={[
                styles.trackChip,
                {
                  backgroundColor: active
                    ? tc.primary
                    : isDark
                    ? '#1E293B'
                    : '#F1F5F9',
                  borderColor: active ? tc.primary : tc.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.trackChipText,
                  { color: active ? '#FFFFFF' : tc.text },
                  active && { fontWeight: '700' },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Visual Stages Pathway Ribbon */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pathwayScroll}
      >
        {filteredStages.map((stage) => {
          const isSelected = stage.id === selectedStageId;
          return (
            <Pressable
              key={stage.id}
              onPress={() => {
                setSelectedStageId(stage.id);
                onSelectStage?.(stage);
              }}
              style={[
                styles.stagePillButton,
                {
                  backgroundColor: isSelected
                    ? stage.color
                    : isDark
                    ? '#1E293B'
                    : '#F8FAFC',
                  borderColor: stage.color,
                },
                isSelected && styles.stagePillButtonActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Stage ${stage.code}: ${stage.name}`}
            >
              <View
                style={[
                  styles.codeCircle,
                  {
                    backgroundColor: isSelected ? '#FFFFFF' : stage.badgeBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.codeText,
                    { color: isSelected ? stage.color : stage.badgeText },
                  ]}
                >
                  {stage.code}
                </Text>
              </View>
              <Text
                style={[
                  styles.stagePillName,
                  { color: isSelected ? '#FFFFFF' : tc.text },
                ]}
                numberOfLines={1}
              >
                {stage.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Selected Stage Detail Card */}
      <View
        style={[
          styles.detailCard,
          {
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            borderColor: selectedStage.color,
          },
        ]}
      >
        <View style={styles.detailCardTop}>
          <View
            style={[
              styles.largeCodeBox,
              { backgroundColor: selectedStage.badgeBg, borderColor: selectedStage.color },
            ]}
          >
            <Text style={[styles.largeCodeText, { color: selectedStage.badgeText }]}>
              STAGE {selectedStage.code}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.detailStageTitle, { color: tc.text }]}>
              {selectedStage.name}
            </Text>
            <Text style={[styles.detailTrackLabel, { color: selectedStage.color }]}>
              {selectedStage.trackName} · {selectedStage.ageGroupLabel}
            </Text>
          </View>
        </View>

        <Text style={[styles.detailDescription, { color: tc.text }]}>
          {selectedStage.description}
        </Text>

        {/* Two Landmark YMCA Safety Benchmarks Callout (if in basics) */}
        {selectedStage.track === 'basics' ? (
          <View
            style={[
              styles.benchmarkCallout,
              {
                backgroundColor: isDark ? '#0C2A4A' : '#EFF6FF',
                borderColor: isDark ? '#1D4ED8' : '#BFDBFE',
              },
            ]}
          >
            <Ionicons name="shield-checkmark" size={16} color="#0284C7" />
            <View style={{ flex: 1 }}>
              <Text style={styles.benchmarkTitle}>
                YMCA Safety Benchmark Skills
              </Text>
              <Text style={[styles.benchmarkDesc, { color: tc.textMuted }]}>
                1. <Text style={{ fontWeight: '700' }}>Swim, Float, Swim:</Text> front glide, roll, back float, roll, front glide, safe exit.{'\n'}
                2. <Text style={{ fontWeight: '700' }}>Jump, Push, Turn, Grab:</Text> water safety & self-rescue in event of accidental falling.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Key Competencies / Skills */}
        <View style={styles.skillsSection}>
          <Text style={[styles.skillsHeading, { color: tc.text }]}>
            Key Milestones Mastered in Stage {selectedStage.code}:
          </Text>
          <View style={styles.skillsList}>
            {selectedStage.keySkills.map((skill, index) => (
              <View key={index} style={styles.skillItemRow}>
                <Ionicons name="checkmark-circle" size={14} color={selectedStage.color} />
                <Text style={[styles.skillItemText, { color: tc.textMuted }]}>
                  {skill}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.sm,
    gap: 4,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  trackScroll: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.sm,
  },
  trackChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  trackChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pathwayScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: spacing.sm,
  },
  stagePillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1.5,
  },
  stagePillButtonActive: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  codeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  stagePillName: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailCard: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    padding: spacing.md,
    marginTop: 4,
    gap: spacing.sm,
  },
  detailCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  largeCodeBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.xs,
    borderWidth: 1,
  },
  largeCodeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailStageTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  detailTrackLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  detailDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  benchmarkCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  benchmarkTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
    marginBottom: 2,
  },
  benchmarkDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  skillsSection: {
    gap: 4,
  },
  skillsHeading: {
    fontSize: 12,
    fontWeight: '700',
  },
  skillsList: {
    gap: 4,
    marginTop: 2,
  },
  skillItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skillItemText: {
    fontSize: 12,
  },
});
