import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';
import { OrganizationId } from '@packmind/types';

export const LLM_QUERY_SCOPE = 'llm';

export enum LLMQueryKeys {
  TEST_CONNECTION = 'test-connection',
  GET_CONFIGURATION = 'get-configuration',
  TEST_SAVED_CONFIGURATION = 'test-saved-configuration',
  GET_AVAILABLE_PROVIDERS = 'get-available-providers',
}

// Base query key arrays for reuse
export const TEST_LLM_CONNECTION_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  LLM_QUERY_SCOPE,
  LLMQueryKeys.TEST_CONNECTION,
] as const;

export const GET_LLM_CONFIGURATION_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  LLM_QUERY_SCOPE,
  LLMQueryKeys.GET_CONFIGURATION,
] as const;

export const TEST_SAVED_LLM_CONFIGURATION_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  LLM_QUERY_SCOPE,
  LLMQueryKeys.TEST_SAVED_CONFIGURATION,
] as const;

export const GET_AVAILABLE_PROVIDERS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  LLM_QUERY_SCOPE,
  LLMQueryKeys.GET_AVAILABLE_PROVIDERS,
] as const;

// Query key builders with identifiers
export const getLLMConfigurationKey = (organizationId: OrganizationId) =>
  [...GET_LLM_CONFIGURATION_KEY, organizationId] as const;

export const getTestSavedLLMConfigurationKey = (
  organizationId: OrganizationId,
) => [...TEST_SAVED_LLM_CONFIGURATION_KEY, organizationId] as const;

export const getAvailableProvidersKey = (organizationId: OrganizationId) =>
  [...GET_AVAILABLE_PROVIDERS_KEY, organizationId] as const;
