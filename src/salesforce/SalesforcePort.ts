import type { ExportKey } from '@/export/salesforceMappings';

export type SalesforcePushResult = {
  key: ExportKey;
  rowCount: number;
  pushedAt: string;
  status: 'queued' | 'sent' | 'failed';
  message?: string;
};

export class SalesforceNotConnected extends Error {
  constructor() {
    super('Salesforce is not connected.');
    this.name = 'SalesforceNotConnected';
  }
}

export interface SalesforcePort {
  isConnected(): Promise<boolean>;
  push(key: ExportKey, csv: string, requesterUserId: string): Promise<SalesforcePushResult>;
  history(requesterUserId: string): Promise<SalesforcePushResult[]>;
}
