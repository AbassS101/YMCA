import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import type { Message } from '@/domain/types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';

type MessageThreadProps = {
  messages: Message[];
  currentUserId: string;
  onSend: (body: string) => void;
  emptyHint?: string;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function MessageThread({
  messages,
  currentUserId,
  onSend,
  emptyHint = 'Say hello.',
}: MessageThreadProps) {
  const [draft, setDraft] = useState('');

  const handleSend = () => {
    const body = draft.trim();
    if (!body) return;
    onSend(body);
    setDraft('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{emptyHint}</Text>}
        renderItem={({ item }) => {
          const mine = item.fromId === currentUserId;
          return (
            <View style={[styles.bubbleWrap, mine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                  {item.body}
                </Text>
                <Text style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>{formatTime(item.createdAt)}</Text>
              </View>
            </View>
          );
        }}
      />
      <View style={styles.composer}>
        <TextField
          value={draft}
          onChangeText={setDraft}
          placeholder="Message"
          style={styles.composerInput}
          multiline
        />
        <PrimaryButton title="Send" onPress={handleSend} disabled={!draft.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  list: {
    padding: 16,
    gap: 8,
    flexGrow: 1,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  empty: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  bubbleWrap: {
    marginBottom: 8,
  },
  bubbleWrapMine: {
    alignItems: 'flex-end',
  },
  bubbleWrapTheirs: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  bubbleMine: {
    backgroundColor: colors.scarlet,
  },
  bubbleTheirs: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    ...typography.body,
  },
  bubbleTextMine: {
    color: colors.white,
  },
  bubbleTextTheirs: {
    color: colors.nearBlack,
  },
  time: {
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  timeMine: {
    color: 'rgba(255,255,255,0.75)',
  },
  timeTheirs: {
    color: colors.muted,
  },
  composer: {
    padding: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  composerInput: {
    maxHeight: 100,
  },
});
