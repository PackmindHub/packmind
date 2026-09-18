import { AIProviderId } from './AIProviderId';
import { OrganizationId } from '../accounts/Organization';
import { LLMServiceConfig } from './LLMServiceConfig';

/**
 * At most one active provider configuration per organization. `config` holds the
 * provider-specific shape as JSON, whose secrets (API keys) are encrypted and
 * decrypted in `AIProviderRepository`, not here — so an instance of this type
 * holds them in clear.
 */
export type AIProvider = {
  id: AIProviderId;
  organizationId: OrganizationId;
  config: LLMServiceConfig;
};
