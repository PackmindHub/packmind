import { LLMServiceConfig, OrganizationId } from '@packmind/types';

export type StoredAIProvider = {
  config: LLMServiceConfig;
};

export interface IAIProviderRepository {
  save(orgId: OrganizationId, config: LLMServiceConfig): Promise<void>;
  get(orgId: OrganizationId): Promise<StoredAIProvider | null>;
  exists(orgId: OrganizationId): Promise<boolean>;
}
