import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { radii, spacing } from '@/theme/typography';

type IconName = ComponentProps<typeof Ionicons>['name'];

type SectionCardProps = {
  title: string;
  icon: IconName;
  accent?: string;
  count?: number;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
};

export function SectionCard({
  title,
  icon,
  accent,
  count,
  subtitle,
  actionLabel,
  onAction,
  children,
}: SectionCardProps) {
  const { colors: tc } = useTheme();
  const color = accent ?? tc.primary;
  return (
    <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={17} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: tc.text }]} allowFontScaling accessibilityRole="header">
            {title}
            {count != null ? <Text style={{ color: tc.textMuted }}> ({count})</Text> : null}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: tc.textMuted }]} allowFontScaling>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} style={{ minHeight: 44, justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={`${actionLabel}: ${title}`}>
            <Text style={[styles.action, { color }]}>{actionLabel} ›</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

export function EmptyState({
  icon,
  text,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors: tc } = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={26} color={tc.textMuted} />
      <Text style={[styles.emptyText, { color: tc.textMuted }]} allowFontScaling>
        {text}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.emptyAction} accessibilityRole="button">
          <Text style={[styles.action, { color: tc.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  meta,
  left,
  right,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { colors: tc } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={onPress == null}
      style={({ pressed }) => [
        styles.listRow,
        { borderColor: tc.cardBorder },
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {left}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: tc.text }]} allowFontScaling>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: tc.textMuted }]} allowFontScaling numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={[styles.rowMeta, { color: tc.textMuted }]} allowFontScaling numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress && !right ? <Ionicons name="chevron-forward" size={16} color={tc.textMuted} /> : null}
    </Pressable>
  );
}

export function StatusPill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function ActionButton({
  label,
  icon,
  onPress,
  color,
  variant = 'solid',
  loading,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  color: string;
  variant?: 'solid' | 'outline';
  loading?: boolean;
}) {
  const solid = variant === 'solid';
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.actionBtn,
        solid ? { backgroundColor: color } : { borderWidth: 1, borderColor: color },
        (pressed || loading) && { opacity: 0.8 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon ? <Ionicons name={icon} size={15} color={solid ? '#FFFFFF' : color} /> : null}
      <Text style={[styles.actionBtnText, { color: solid ? '#FFFFFF' : color }]} allowFontScaling>
        {loading ? 'Working…' : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  iconWrap: {
    width: 22,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  action: {
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    gap: 8,
  },
  empty: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyAction: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    minHeight: 48,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  rowMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radii.button,
    flexGrow: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
