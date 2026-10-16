import type { ExportKey } from '@/export/salesforceMappings';
import { SalesforceNotConnected, type SalesforcePort, type SalesforcePushResult } from '@/salesforce/SalesforcePort';

/**
 * TODO: push through Salesforce Bulk API 2.0 using an OAuth JWT flow handled by a backend.
 * Credentials never live in the app.
 */
export class LiveSalesforceAdapter implements SalesforcePort {
  async isConnected(): Promise<boolean> {
    return false;
  }

  async push(_key: ExportKey, _csv: string, _requesterUserId: string): Promise<SalesforcePushResult> {
    throw new SalesforceNotConnected();
  }

  async history(_requesterUserId: string): Promise<SalesforcePushResult[]> {
    throw new SalesforceNotConnected();
  }
}
