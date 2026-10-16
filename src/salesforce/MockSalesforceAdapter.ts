import { hasCapability } from '@/domain/staffCapabilities';
import type { ExportKey } from '@/export/salesforceMappings';
import type { SalesforcePort, SalesforcePushResult } from '@/salesforce/SalesforcePort';
import { loadStore, saveStore, type DemoState } from '@/storage/demoStore';

function requireExport(state: DemoState, requesterUserId: string) {
  const role = state.credentials.find((c) => c.userId === requesterUserId)?.role;
  if (!hasCapability(role, 'exportData')) throw new Error('You do not have permission to export data.');
}

/** Records pushes in the demo store; nothing leaves the device. */
export class MockSalesforceAdapter implements SalesforcePort {
  async isConnected(): Promise<boolean> {
    return true;
  }

  async push(key: ExportKey, csv: string, requesterUserId: string): Promise<SalesforcePushResult> {
    const state = await loadStore();
    requireExport(state, requesterUserId);
    // Header line is not a record.
    const rowCount = Math.max(0, csv.replace(/^﻿/, '').split(/\r\n/).filter(Boolean).length - 1);
    const result: SalesforcePushResult = { key, rowCount, pushedAt: new Date().toISOString(), status: 'sent' };
    state.salesforcePushes = [...(state.salesforcePushes ?? []), result];
    await saveStore(state);
    return result;
  }

  async history(requesterUserId: string): Promise<SalesforcePushResult[]> {
    const state = await loadStore();
    requireExport(state, requesterUserId);
    return [...(state.salesforcePushes ?? [])].reverse();
  }
}
