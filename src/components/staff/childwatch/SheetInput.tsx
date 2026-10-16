import { Text, TextInput, type TextInputProps } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { radii } from '@/theme/typography';

export const DANGER = '#C62828';

export function SheetInput(props: TextInputProps) {
  const { colors: tc } = useTheme();
  return (
    <TextInput
      placeholderTextColor={tc.textMuted}
      {...props}
      style={[
        {
          borderWidth: 1,
          borderColor: tc.cardBorder,
          borderRadius: radii.md,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 15,
          color: tc.text,
        },
        props.multiline ? { minHeight: 72, textAlignVertical: 'top' } : null,
        props.style,
      ]}
    />
  );
}

export function SheetError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text accessibilityRole="alert" style={{ color: DANGER, fontSize: 13, fontWeight: '600' }}>
      {message}
    </Text>
  );
}
