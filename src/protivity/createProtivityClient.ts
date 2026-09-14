import { LiveProtivityAdapter } from '@/protivity/LiveProtivityAdapter';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export function createProtivityClient(): ProtivityPort {
  const mode = process.env.EXPO_PUBLIC_PROTIVITY_MODE ?? 'mock';
  if (mode === 'live') return new LiveProtivityAdapter();
  return new MockProtivityAdapter();
}
