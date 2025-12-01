import { LLMServiceConfig, OrganizationId } from '@packmind/types';

export type StoredAIProvider = {
  config: LLMServiceConfig;
  configuredAt: Date;
};

export interface IAIProviderRepository {
  save(orgId: OrganizationId, config: LLMServiceConfig): Promise<void>;
  get(orgId: OrganizationId): Promise<StoredAIProvider | null>;
  exists(orgId: OrganizationId): Promise<boolean>;
}
