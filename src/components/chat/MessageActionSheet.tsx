import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { filterProfanity } from '@/domain/types';
import { useChatTheme } from './chatTheme';
import { QUICK_EMOJIS, type ChatMessage } from './chatTypes';

type Props = {
  message: ChatMessage | null;
  meId: string;
  canEdit: boolean;
  canDelete: boolean;
  canPin: boolean;
  deleteLabel?: string;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit: () => void;
  onPin: () => void;
  onDelete: () => void;
  onReport: () => void;
};

function Action({
  icon,
  label,
  onPress,
  danger,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  theme: ReturnType<typeof useChatTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && { backgroundColor: theme.hover }]}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={20} color={danger ? theme.danger : theme.text} />
      <Text style={[styles.actionLabel, { color: danger ? theme.danger : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

export function MessageActionSheet({
  message,
  meId,
  canEdit,
  canDelete,
  canPin,
  deleteLabel,
  onClose,
  onReact,
  onReply,
  onEdit,
  onPin,
  onDelete,
  onReport,
}: Props) {
  const theme = useChatTheme();

  const copy = () => {
    if (message && Platform.OS === 'web' && typeof navigator !== 'undefined') {
      void navigator.clipboard?.writeText(message.content).catch(() => {});
    }
    onClose();
  };

  return (
    <Modal visible={Boolean(message)} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          {message ? (
            <>
              <View style={styles.emojiRow}>
                {QUICK_EMOJIS.map((e) => {
                  const mine = (message.reactions[e] ?? []).includes(meId);
                  return (
                    <Pressable
                      key={e}
                      onPress={() => {
                        onReact(e);
                        onClose();
                      }}
                      style={[
                        styles.emojiBtn,
                        { backgroundColor: mine ? theme.reactionActiveBg : theme.reactionBg },
                      ]}
                      accessibilityLabel={`React ${e}`}
                    >
                      <Text style={styles.emoji}>{e}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.preview, { color: theme.muted }]} numberOfLines={2}>
                {message.authorName}: {filterProfanity(message.content)}
              </Text>

              <Action theme={theme} icon="arrow-undo-outline" label="Reply" onPress={onReply} />
              {canEdit ? <Action theme={theme} icon="create-outline" label="Edit message" onPress={onEdit} /> : null}
              {Platform.OS === 'web' ? <Action theme={theme} icon="copy-outline" label="Copy text" onPress={copy} /> : null}
              {canPin ? (
                <Action theme={theme}
                  icon={message.pinned ? 'pin' : 'pin-outline'}
                  label={message.pinned ? 'Unpin message' : 'Pin message'}
                  onPress={onPin}
                />
              ) : null}
              {message.authorId !== meId ? (
                <Action theme={theme} icon="flag-outline" label="Report to IT" onPress={onReport} />
              ) : null}
              {canDelete ? (
                <Action theme={theme}
                  icon="trash-outline"
                  label={deleteLabel ?? 'Delete message'}
                  onPress={onDelete}
                  danger
                />
              ) : null}
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingBottom: 24,
    paddingTop: 8,
    gap: 2,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  grabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, marginBottom: 8 },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 6 },
  emojiBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24 },
  preview: { fontSize: 12, paddingHorizontal: 6, paddingBottom: 6 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 10, borderRadius: 10 },
  actionLabel: { fontSize: 15, fontWeight: '600' },
});
