import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/typography';
import { PrimaryButton } from '@/components/PrimaryButton';

export const YMCA_AVATAR_PRESETS = [
  {
    id: 'silhouette',
    label: 'Clean Silhouette',
    url: '',
    isSilhouette: true,
  },
  {
    id: 'wellness-1',
    label: 'Jordan (Member)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  },
  {
    id: 'wellness-2',
    label: 'Alex (Trainer)',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  },
  {
    id: 'wellness-3',
    label: 'Sarah (AOA Coach)',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
  },
  {
    id: 'wellness-4',
    label: 'Pat (Director)',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
  },
  {
    id: 'wellness-5',
    label: 'David (IT Admin)',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
  },
  {
    id: 'wellness-6',
    label: 'Elena (Aquatics)',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
  },
];

export type UserAvatarProps = {
  uri?: string | null;
  name?: string;
  size?: number;
  role?: string;
  editable?: boolean;
  onSavePhoto?: (nextUrl: string) => Promise<void> | void;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function UserAvatar({
  uri,
  name,
  size = 48,
  role,
  editable = false,
  onSavePhoto,
  onPress,
  accessibilityLabel,
}: UserAvatarProps) {
  const { colors: tc, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const radius = size / 2;
  const iconSize = Math.round(size * 0.58);
  const hasImage = Boolean(uri && uri.trim() !== '');

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (editable) {
      setModalVisible(true);
    }
  };

  const handleSave = async (chosenUrl: string) => {
    if (!onSavePhoto) return;
    setSaving(true);
    try {
      await onSavePhoto(chosenUrl);
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        disabled={!onPress && !editable}
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
            borderColor: tc.cardBorder,
            borderWidth: 1.5,
          },
        ]}
        accessibilityRole={editable || onPress ? 'button' : 'image'}
        accessibilityLabel={accessibilityLabel ?? (name ? `${name}'s profile avatar` : 'User silhouette avatar')}
      >
        {hasImage ? (
          <Image
            source={{ uri: uri! }}
            style={{ width: size - 3, height: size - 3, borderRadius: radius }}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.silhouetteWrapper, { width: size, height: size, borderRadius: radius }]}>
            <Ionicons
              name="person"
              size={iconSize}
              color={isDark ? '#94A3B8' : '#64748B'}
            />
          </View>
        )}

        {editable ? (
          <View
            style={[
              styles.editBadge,
              {
                backgroundColor: colors.primary,
                width: Math.max(18, Math.round(size * 0.35)),
                height: Math.max(18, Math.round(size * 0.35)),
                borderRadius: Math.round(size * 0.2),
              },
            ]}
          >
            <Ionicons name="camera" size={Math.round(size * 0.2)} color="#FFFFFF" />
          </View>
        ) : null}
      </Pressable>

      {/* PHOTO / SILHOUETTE SELECTOR MODAL */}
      {editable ? (
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
              ]}
            >
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: tc.text }]}>
                    Profile Photo & Avatar
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: tc.textMuted }]}>
                    Select a photo of yourself, a community portrait, or a sleek silhouette.
                  </Text>
                </View>
                <Pressable
                  onPress={() => setModalVisible(false)}
                  style={styles.closeBtn}
                  hitSlop={10}
                  accessibilityLabel="Close photo picker"
                >
                  <Ionicons name="close" size={24} color={tc.text} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 14 }}>
                {/* PRESETS GRID */}
                <Text style={[styles.sectionLabel, { color: tc.text }]}>
                  Community Portraits & Silhouettes
                </Text>
                <View style={styles.presetsGrid}>
                  {YMCA_AVATAR_PRESETS.map((preset) => {
                    const isSelected =
                      selectedPreset === preset.id ||
                      (selectedPreset === null &&
                        (preset.isSilhouette ? !hasImage : uri === preset.url));

                    return (
                      <Pressable
                        key={preset.id}
                        onPress={() => {
                          setSelectedPreset(preset.id);
                          setCustomUrl(preset.url);
                        }}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                            borderColor: isSelected ? colors.primary : tc.border,
                            borderWidth: isSelected ? 2 : 1,
                          },
                        ]}
                      >
                        <View style={styles.presetAvatarBox}>
                          {preset.isSilhouette ? (
                            <View style={[styles.silhouetteBox, { backgroundColor: '#E2E8F0' }]}>
                              <Ionicons name="person" size={26} color="#64748B" />
                            </View>
                          ) : (
                            <Image
                              source={{ uri: preset.url }}
                              style={styles.presetImg}
                            />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.presetLabel,
                            { color: isSelected ? colors.primary : tc.text, fontWeight: isSelected ? '700' : '500' },
                          ]}
                          numberOfLines={1}
                        >
                          {preset.label}
                        </Text>
                        {isSelected ? (
                          <View style={styles.checkBadge}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                {/* CUSTOM IMAGE URL */}
                <View style={{ gap: 6, marginTop: 4 }}>
                  <Text style={[styles.sectionLabel, { color: tc.text }]}>
                    Or Enter Image URL
                  </Text>
                  <TextInput
                    value={customUrl}
                    onChangeText={(val) => {
                      setCustomUrl(val);
                      setSelectedPreset('custom');
                    }}
                    placeholder="https://example.com/my-photo.jpg"
                    placeholderTextColor={tc.textMuted}
                    style={[
                      styles.urlInput,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                        color: tc.text,
                        borderColor: tc.border,
                      },
                    ]}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <PrimaryButton
                  title={saving ? 'Saving...' : 'Set Avatar Picture'}
                  onPress={() => void handleSave(customUrl)}
                  loading={saving}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  silhouetteWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetChip: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    gap: 8,
    position: 'relative',
  },
  presetAvatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  silhouetteBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  presetLabel: {
    fontSize: 12,
    flex: 1,
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  urlInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalActions: {
    marginTop: 8,
    paddingTop: 8,
  },
});
