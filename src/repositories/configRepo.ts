import type { AppConfig, AppConfigPatch, AppConfigSection, ConfigAuditEntry } from '@/domain/appConfig';
import type { ProtivityPort } from '@/protivity/ProtivityPort';

export const configRepo = {
  get(api: ProtivityPort): Promise<AppConfig> {
    return api.getAppConfig();
  },

  update<S extends AppConfigSection>(
    api: ProtivityPort,
    section: S,
    patch: AppConfigPatch<S>,
    requesterUserId: string
  ): Promise<AppConfig> {
    return api.updateAppConfig(section, patch, requesterUserId);
  },

  resetSection(api: ProtivityPort, section: AppConfigSection, requesterUserId: string): Promise<AppConfig> {
    return api.resetAppConfigSection(section, requesterUserId);
  },

  listAudit(api: ProtivityPort, requesterUserId: string): Promise<ConfigAuditEntry[]> {
    return api.listConfigAudit(requesterUserId);
  },
};
