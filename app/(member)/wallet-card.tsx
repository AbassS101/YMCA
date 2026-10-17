import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScannedBarcode } from '@/components/ScannedBarcode';
import { SecondaryButton } from '@/components/SecondaryButton';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/typography';
import { boostBrightnessForScanner, restoreScreenBrightness } from '@/utils/brightness';
import { SCANNABLE_SYMBOLOGIES, type ScannableSymbology } from '@/utils/barcodeEncoders';
import {
  canRenderBarcode,
  loadWalletCard,
  removeWalletCard,
  saveWalletCard,
  type WalletCard,
} from '@/utils/walletCard';

type Mode = 'loading' | 'saved' | 'scanning' | 'confirm';

export default function WalletCardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const userId = session?.userId ?? '';

  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>('loading');
  const [card, setCard] = useState<WalletCard | null>(null);
  const [pending, setPending] = useState<{ value: string; type: ScannableSymbology } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.2);
  const [torch, setTorch] = useState(false);
  const handledRef = useRef(false);
  const prevBrightnessRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    void loadWalletCard(userId).then((c) => {
      setCard(c);
      setMode(c ? 'saved' : 'scanning');
    });
  }, [userId]);

  // Brighten the screen while a saved card is on display, restore on leave.
  useEffect(() => {
    if (mode !== 'saved') return;
    let active = true;
    void boostBrightnessForScanner()
      .then((prev) => {
        if (active) prevBrightnessRef.current = prev;
        else void restoreScreenBrightness(prev);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      void restoreScreenBrightness(prevBrightnessRef.current).catch(() => undefined);
      prevBrightnessRef.current = null;
    };
  }, [mode]);

  const startScan = useCallback(() => {
    handledRef.current = false;
    setScanError(null);
    setPending(null);
    setMode('scanning');
  }, []);

  const onScanned = useCallback(({ type, data }: { type: string; data: string }) => {
    if (handledRef.current) return;
    const value = data.trim();
    const symbology = normalizeSymbology(type);
    if (!symbology) {
      setScanError(`Unsupported barcode (type: ${type}, value: ${value}). Try the barcode on the back of your card.`);
      return;
    }
    if (!SCANNABLE_SYMBOLOGIES.includes(symbology) || !canRenderBarcode(value, symbology)) {
      setScanError(
        `Unsupported barcode (type: ${type}, value: ${value}). Try the barcode on the back of your card.`,
      );
      return;
    }
    handledRef.current = true;
    setPending({ value, type: symbology });
    setMode('confirm');
  }, []);

  const confirmSave = async () => {
    if (!pending || !userId) return;
    const saved = await saveWalletCard(userId, pending);
    setCard(saved);
    setPending(null);
    setMode('saved');
  };

  const confirmRemove = () => {
    dialog.alert(
      'Remove saved card?',
      'Your digital pass will go back to the standard member barcode.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            if (!userId) return;
            void removeWalletCard(userId).then(() => {
              setCard(null);
              startScan();
            });
          },
        },
      ],
    );
  };

  const cameraReady = permission?.granted;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.nearBlack} />
        </Pressable>
        <AppText style={styles.title}>Add physical card</AppText>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        {mode === 'scanning' ? (
          <>
            <AppText style={styles.lead}>
              {card ? 'Scanning a new card replaces your saved one. ' : ''}Line up the barcode on the back of your YMCA card inside the frame. It saves to this app so you can
              leave the plastic card at home.
            </AppText>
            {!permission ? null : cameraReady ? (
              <View style={styles.cameraWrap}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  autofocus="on"
                  zoom={zoom}
                  enableTorch={torch}
                  barcodeScannerSettings={{ barcodeTypes: SCANNABLE_SYMBOLOGIES }}
                  onBarcodeScanned={onScanned}
                />
                <View pointerEvents="none" style={styles.frame} />
              </View>
            ) : null}
            {cameraReady ? (
              <>
                <AppText style={styles.hint}>
                  Hold your phone about 6–8 inches (15–20 cm) from the card, and move closer or farther until the bars
                  look sharp. Use zoom to stay back if it&apos;s blurry.
                </AppText>
                <View style={styles.controlsRow}>
                  <Pressable
                    style={styles.control}
                    onPress={() => setZoom((z) => Math.max(0, +(z - 0.1).toFixed(2)))}
                    accessibilityRole="button"
                    accessibilityLabel="Zoom out"
                  >
                    <Ionicons name="remove" size={20} color={colors.primaryDark} />
                  </Pressable>
                  <AppText style={styles.controlLabel}>Zoom {Math.round(zoom * 100)}%</AppText>
                  <Pressable
                    style={styles.control}
                    onPress={() => setZoom((z) => Math.min(1, +(z + 0.1).toFixed(2)))}
                    accessibilityRole="button"
                    accessibilityLabel="Zoom in"
                  >
                    <Ionicons name="add" size={20} color={colors.primaryDark} />
                  </Pressable>
                  <Pressable
                    style={[styles.control, torch && styles.controlActive]}
                    onPress={() => setTorch((t) => !t)}
                    accessibilityRole="button"
                    accessibilityLabel="Toggle flashlight"
                  >
                    <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={20} color={colors.primaryDark} />
                  </Pressable>
                </View>
              </>
            ) : null}
            {permission && !cameraReady ? (
              <View style={styles.permissionBox}>
                <Ionicons name="camera-outline" size={32} color={colors.primary} />
                <AppText style={styles.permissionText}>
                  Camera access is needed to scan your card. The photo is never saved or uploaded.
                </AppText>
                {permission.canAskAgain ? (
                  <PrimaryButton title="Allow camera" onPress={() => void requestPermission()} />
                ) : (
                  <PrimaryButton title="Open settings" onPress={() => void Linking.openSettings()} />
                )}
              </View>
            ) : null}
            {scanError ? <AppText style={styles.error}>{scanError}</AppText> : null}
            {card ? <SecondaryButton title="Cancel" onPress={() => setMode('saved')} /> : null}
          </>
        ) : null}

        {mode === 'confirm' && pending ? (
          <>
            <AppText style={styles.lead}>Does this match the number on your card?</AppText>
            <View style={styles.passCard}>
              <ScannedBarcode value={pending.value} type={pending.type} height={90} />
              <AppText style={styles.number}>{pending.value}</AppText>
            </View>
            <StorageWarning />
            <PrimaryButton title="Save to app" onPress={() => void confirmSave()} />
            <SecondaryButton title="Scan again" onPress={startScan} />
          </>
        ) : null}

        {mode === 'saved' && card ? (
          <>
            <View style={styles.passCard} accessibilityLabel="Saved membership card">
              <AppText style={styles.kicker}>YMCA of Metropolitan Washington</AppText>
              <ScannedBarcode value={card.value} type={card.type} height={110} />
              <AppText style={styles.number}>{card.value}</AppText>
            </View>
            <PrimaryButton title="Scan a different card (replaces this one)" onPress={startScan} />
            <AppText style={styles.lead}>
              Hold this under the desk or turnstile scanner. Screen brightness is raised while this page is open, and
              this barcode now also shows on your Home pass.
            </AppText>
            <StorageWarning />
            <SecondaryButton title="Remove saved card" destructive onPress={confirmRemove} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** iOS reports native names like "org.iso.Code39"; Android reports "code39". */
function normalizeSymbology(type: string): ScannableSymbology | null {
  const t = type.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (t.includes('code39')) return 'code39';
  if (t.includes('code128')) return 'code128';
  if (t.includes('codabar')) return 'codabar';
  if (t.includes('itf') || t.includes('interleaved2of5')) return 'itf14';
  return null;
}

function StorageWarning() {
  return (
    <View style={styles.warning} accessibilityRole="alert">
      <Ionicons name="warning" size={18} color="#92400E" />
      <AppText style={styles.warningText}>
        Storage: the saved card lives only on this device. It isn&apos;t synced to your account and is lost if the app
        is reinstalled. Keep your physical card.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, lineHeight: 18, color: '#334155', fontWeight: '600' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  control: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlActive: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
  controlLabel: { minWidth: 90, textAlign: 'center', fontSize: 13, fontWeight: '700', color: colors.nearBlack },
  warning: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  warningText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#92400E', fontWeight: '600' },
  screen: { flex: 1, backgroundColor: colors.white },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.nearBlack },
  content: { padding: spacing.md, gap: spacing.md },
  lead: { fontSize: 14, lineHeight: 20, color: colors.muted },
  cameraWrap: {
    height: 260,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '85%',
    height: 110,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 12,
  },
  permissionBox: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: '#F1F5F9',
  },
  permissionText: { fontSize: 14, textAlign: 'center', color: '#334155' },
  error: { fontSize: 13, color: '#B91C1C', fontWeight: '600' },
  passCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.card,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.primaryDark,
  },
  number: { fontSize: 20, fontWeight: '800', letterSpacing: 3, color: '#0F172A' },
});
