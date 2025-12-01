import { AIProviderId } from './AIProviderId';
import { OrganizationId } from '../accounts/Organization';
import { LLMServiceConfig } from './LLMServiceConfig';

/**
 * AI Provider entity stored in the database.
 * Each organization can have one active AI provider configuration.
 * The config field stores the provider-specific configuration as JSON.
 * Secrets (API keys) are encrypted at the repository layer.
 */
export type AIProvider = {
  id: AIProviderId;
  organizationId: OrganizationId;
  config: LLMServiceConfig;
  configuredAt: Date;
};
