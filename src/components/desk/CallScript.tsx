import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { radii } from '@/theme/typography';

/** Collapsible talk track shown under a call queue item. */
export function CallScript({ script }: { script: string }) {
  const { colors: tc, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Hide call script' : 'Show call script'}
      >
        <Ionicons name={open ? 'chevron-up' : 'document-text-outline'} size={14} color={tc.primary} />
        <Text style={{ color: tc.primary, fontSize: 12, fontWeight: '700' }}>{open ? 'Hide call script' : 'Call script'}</Text>
      </Pressable>
      {open ? (
        <View style={[styles.box, { backgroundColor: isDark ? '#0F1B2E' : '#F8FAFC', borderColor: tc.cardBorder }]}>
          <Text style={{ color: tc.text, fontSize: 13, lineHeight: 19 }}>{script}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  box: { borderWidth: 1, borderRadius: radii.sm, padding: 10, marginTop: 4 },
});
