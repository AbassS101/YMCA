import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';

import { useAppConfig } from '@/context/AppConfigContext';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { CONFIG_SECTION_LABELS, type AppConfigPatch, type AppConfigSection } from '@/domain/appConfig';
import { configRepo } from '@/repositories/configRepo';

/**
 * Editable form state that starts from `source` and starts over whenever its content changes (e.g. after a
 * save or reset). Compared by content, not identity, so saving another section keeps unsaved edits here.
 */
export function useDraftFrom<T, D>(source: T, build: (source: T) => D): [D, Dispatch<SetStateAction<D>>] {
  const key = JSON.stringify(source);
  const [draft, setDraft] = useState(() => build(source));
  const [seen, setSeen] = useState(key);
  if (seen !== key) {
    setSeen(key);
    setDraft(build(source));
  }
  return [draft, setDraft];
}

/** Shared plumbing for the Admin Control Center editors: access check, save, reset, and refresh on focus. */
export function useConfigEditor<S extends AppConfigSection>(section: S) {
  const { api, session } = useSession();
  const { config, refresh, update } = useAppConfig();
  const { canEditSection, theme } = useStaffCapabilities();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      setError('');
      void refresh();
    }, [refresh])
  );

  /** Saves the section; resolves true on success and sets `error` (from the adapter) on failure. */
  const save = async (patch: AppConfigPatch<S>, savedMessage?: string): Promise<boolean> => {
    setBusy(true);
    setError('');
    try {
      await update(section, patch);
      if (savedMessage) dialog.alert('Saved', savedMessage, [{ text: 'OK' }], 'checkmark');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save these settings.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const resetToDefaults = () =>
    dialog.show({
      title: 'Reset section to defaults?',
      message: `Your ${CONFIG_SECTION_LABELS[section]} settings will go back to the standard values. The change is recorded in the change log.`,
      icon: 'alert',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setError('');
            configRepo
              .resetSection(api, section, session?.userId ?? '')
              .then(refresh)
              .catch((e) => setError(e instanceof Error ? e.message : 'Could not reset these settings.'));
          },
        },
      ],
    });

  return {
    value: config[section],
    allowed: canEditSection(section),
    accent: theme.color,
    busy,
    error,
    setError,
    save,
    resetToDefaults,
  };
}
