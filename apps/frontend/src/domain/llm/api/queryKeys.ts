import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const LLM_QUERY_SCOPE = 'llm';

export enum LLMQueryKeys {
  TEST_CONNECTION = 'test-connection',
  GET_CONFIGURATION = 'get-configuration',
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
