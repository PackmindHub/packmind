import { LLMServiceConfig, OrganizationId } from '@packmind/types';

export type StoredLLMConfiguration = {
  config: LLMServiceConfig;
  configuredAt: Date;
};

export interface ILLMConfigurationRepository {
  save(orgId: OrganizationId, config: LLMServiceConfig): Promise<void>;
  get(orgId: OrganizationId): Promise<StoredLLMConfiguration | null>;
  exists(orgId: OrganizationId): Promise<boolean>;
}
