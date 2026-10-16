import { LiveSalesforceAdapter } from '@/salesforce/LiveSalesforceAdapter';
import { MockSalesforceAdapter } from '@/salesforce/MockSalesforceAdapter';
import type { SalesforcePort } from '@/salesforce/SalesforcePort';

export function createSalesforceClient(): SalesforcePort {
  const mode = process.env.EXPO_PUBLIC_SALESFORCE_MODE ?? 'mock';
  if (mode === 'live') return new LiveSalesforceAdapter();
  return new MockSalesforceAdapter();
}
