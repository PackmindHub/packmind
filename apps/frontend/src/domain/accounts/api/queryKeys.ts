import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const ACCOUNTS_QUERY_SCOPE = 'accounts';

export enum AccountQueryKeys {
  GET_ME = 'get-me',
  GET_USERS_IN_MY_ORGANIZATION = 'get-users-in-my-organization',
  GET_USER_STATUSES = 'get-user-statuses',
  GET_USER_ORGANIZATIONS = 'get-user-organizations',
  GET_MCP_TOKEN = 'get-mcp-token',
  GET_MCP_URL = 'get-mcp-url',
  GET_MCP_CONFIG = 'get-mcp-config',
  GET_CURRENT_API_KEY = 'get-current-api-key',
  VALIDATE_INVITATION = 'validate-invitation',
  VALIDATE_PASSWORD_RESET_TOKEN = 'validate-password-reset-token',
  SELECT_ORGANIZATION = 'select-organization',
  GET_ONBOARDING_STATUS = 'get-onboarding-status',
  GET_SOCIAL_PROVIDERS = 'get-social-providers',
}

// Base query key arrays for reuse
export const GET_ME_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  ACCOUNTS_QUERY_SCOPE,
  AccountQueryKeys.GET_ME,
] as const;

export const GET_USERS_IN_MY_ORGANIZATION_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  ACCOUNTS_QUERY_SCOPE,
  AccountQueryKeys.GET_USERS_IN_MY_ORGANIZATION,
] as const;

export const GET_USER_STATUSES_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  ACCOUNTS_QUERY_SCOPE,
  AccountQueryKeys.GET_USER_STATUSES,
] as const;

export const GET_USER_ORGANIZATIONS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  ACCOUNTS_QUERY_SCOPE,
  AccountQueryKeys.GET_USER_ORGANIZATIONS,
] as const;

export const GET_MCP_TOKEN_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  ACCOUNTS_QUERY_SCOPE,
  AccountQueryKeys.GET_MCP_TOKEN,
] as const;

export const GET_MCP_URL_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  ACCOUNTS_QUERY_SCOPE,
  AccountQueryKeys.GET_MCP_URL,
] as const;

export const GET_MCP_CONFIG_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  ACCOUNTS_QUERY_SCOPE,
  AccountQueryKeys.GET_MCP_CONFIG,
] as const;

export const GET_CURRENT_API_KEY_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  ACCOUNTS_QUERY_SCOPE,
  AccountQueryKeys.GET_CURRENT_API_KEY,
] as const;

export const VALIDATE_INVITATION_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  ACCOUNTS_QUERY_SCOPE,
  AccountQueryKeys.VALIDATE_INVITATION,
] as const;

export const VALIDATE_PASSWORD_RESET_TOKEN_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  ACCOUNTS_QUERY_SCOPE,
  AccountQueryKeys.VALIDATE_PASSWORD_RESET_TOKEN,
] as const;

export const SELECT_ORGANIZATION_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  ACCOUNTS_QUERY_SCOPE,
  AccountQueryKeys.SELECT_ORGANIZATION,
] as const;

export const GET_ONBOARDING_STATUS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  ACCOUNTS_QUERY_SCOPE,
  AccountQueryKeys.GET_ONBOARDING_STATUS,
] as const;

export const GET_SOCIAL_PROVIDERS_KEY = [
  ACCOUNTS_QUERY_SCOPE,
  AccountQueryKeys.GET_SOCIAL_PROVIDERS,
] as const;
