import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import type { AnnouncementCategory } from '@/domain/types';
import { announcementRepo } from '@/repositories/announcementRepo';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

type BroadcastNoticeModalProps = {
  visible: boolean;
  onClose: () => void;
  defaultCategory?: AnnouncementCategory;
};

export function BroadcastNoticeModal({ visible, onClose, defaultCategory = 'facility' }: BroadcastNoticeModalProps) {
  const { session, api } = useSession();
  const { colors: tc, isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [popup, setPopup] = useState(false);
  const [highPriority, setHighPriority] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Please provide both a title and message body.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const me = await api.getStaff(session?.userId ?? '');
      await announcementRepo.create(api, {
        branchId: BRANCH_ID,
        title: title.trim(),
        body: body.trim(),
        category: defaultCategory,
        priority: highPriority ? 'high' : 'normal',
        authorName: `${me.name} (${me.roleLabel || 'Staff'})`,
        pinned: highPriority,
        popupNotice: popup,
      }, session?.userId);
      onClose();
      setTitle('');
      setBody('');
      setPopup(false);
      setHighPriority(false);
      dialog.alert(
        'Notice Broadcasted!',
        popup
          ? 'Notice published and configured to pop up when members open the app!'
          : 'Your announcement was published to the branch board and an in-app alert dispatched.',
        [{ text: 'OK' }],
        'checkmark'
      );
    } catch (err: any) {
      setError(err?.message || 'Could not broadcast announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRow = (active: boolean, onPress: () => void, label: string, hint: string, accent: string) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.toggle,
        {
          backgroundColor: active ? `${accent}14` : isDark ? '#1F2937' : '#F8FAFC',
          borderColor: active ? accent : tc.border,
        },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
    >
      <Ionicons name={active ? 'checkbox' : 'square-outline'} size={22} color={active ? accent : tc.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: active ? accent : tc.text }}>{label}</Text>
        <Text style={{ fontSize: 12, color: tc.textMuted, marginTop: 2 }}>{hint}</Text>
      </View>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="megaphone" size={22} color={tc.primary} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: tc.text }}>Broadcast Member Notice</Text>
            </View>
            <Pressable onPress={onClose} disabled={submitting} hitSlop={8} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={tc.textMuted} />
            </Pressable>
          </View>

          {error ? <ErrorBanner message={error} /> : null}

          <ScrollView style={{ maxHeight: 440 }} contentContainerStyle={{ gap: 10 }}>
            <TextField label="Notice Title *" value={title} onChangeText={setTitle} placeholder="e.g. Lap Pool Lanes 1-3 Maintenance" />
            <TextField
              label="Announcement Details *"
              value={body}
              onChangeText={setBody}
              placeholder="Provide details..."
              multiline
              numberOfLines={4}
            />
            {toggleRow(
              highPriority,
              () => setHighPriority(!highPriority),
              'High Priority & Pinned',
              'Pins the notice to the top of the member board.',
              colors.gold
            )}
            {toggleRow(
              popup,
              () => setPopup(!popup),
              'Pop-up Notice on App Open',
              'Displays as an instant modal alert when members open the app.',
              colors.scarlet
            )}
            <View style={{ marginTop: 6 }}>
              <PrimaryButton title="Publish Notice & Alert Members" onPress={() => void handleSubmit()} loading={submitting} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  box: {
    width: '100%',
    maxWidth: 480,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
});
