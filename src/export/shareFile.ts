import { Platform } from 'react-native';

/** Saves/shares a CSV. Resolves true when the file was handed off to the user. */
export async function shareCsv(filename: string, csv: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return false;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  // Requires: npx expo install expo-file-system expo-sharing
  const FileSystem = await import('expo-file-system/legacy');
  const Sharing = await import('expo-sharing');
  if (!(await Sharing.isAvailableAsync())) return false;
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
  return true;
}
