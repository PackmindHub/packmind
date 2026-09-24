import { LLMServiceConfig, OrganizationId } from '@packmind/types';

export type StoredAIProvider = {
  config: LLMServiceConfig;
  // Set when a stored API key exists but cannot be decrypted. That key is
  // then an empty string, and the admin must enter it again.
  secretsUnreadable?: boolean;
};

export interface IAIProviderRepository {
  save(orgId: OrganizationId, config: LLMServiceConfig): Promise<void>;
  get(orgId: OrganizationId): Promise<StoredAIProvider | null>;
  exists(orgId: OrganizationId): Promise<boolean>;
}
