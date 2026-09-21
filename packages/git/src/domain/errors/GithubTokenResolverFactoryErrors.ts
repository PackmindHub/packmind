import { GitInternalError } from './GitInternalError';

/**
 * The guards `GithubTokenResolverFactory` runs before it can build a token
 * resolver. Each one names a different broken precondition — a provider row
 * that contradicts itself, an env var we never set, an App row that has gone
 * missing — and none of them is something a request carries or can correct,
 * so every one of them is a 500. They live together because they are read
 * together: the reason is what separates them.
 */

export class GithubProviderTokenEmptyError extends GitInternalError {
  constructor() {
    super(
      'github_provider_token_empty',
      { authMethod: 'token' },
      'GithubTokenResolverFactory: provider.authMethod is "token" but provider.token is empty',
    );
    this.name = 'GithubProviderTokenEmptyError';
  }
}

export class GithubAppProviderNotSavedError extends GitInternalError {
  constructor() {
    super(
      'github_app_provider_not_saved',
      { authMethod: 'app' },
      'GithubTokenResolverFactory: provider.authMethod is "app" but the provider has not been saved yet',
    );
    this.name = 'GithubAppProviderNotSavedError';
  }
}

export class GithubAppInstallationIdMissingError extends GitInternalError {
  constructor(gitProviderId: string) {
    super(
      'github_app_installation_id_missing',
      { gitProviderId, authMethod: 'app' },
      'GithubTokenResolverFactory: provider.authMethod is "app" but provider.appInstallationId is missing',
    );
    this.name = 'GithubAppInstallationIdMissingError';
  }
}

export class GithubAppInstallationIdInvalidError extends GitInternalError {
  constructor(gitProviderId: string, installationId: string | number) {
    super(
      'github_app_installation_id_invalid',
      { gitProviderId, installationId, authMethod: 'app' },
      'GithubTokenResolverFactory: provider.appInstallationId must be a positive integer',
    );
    this.name = 'GithubAppInstallationIdInvalidError';
  }
}

export class GithubAppIdNotConfiguredError extends GitInternalError {
  constructor(gitProviderId: string) {
    super(
      'github_app_id_not_configured',
      { gitProviderId },
      'GithubTokenResolverFactory: GITHUB_APP_ID is not configured (shared mode)',
    );
    this.name = 'GithubAppIdNotConfiguredError';
  }
}

export class GithubAppPrivateKeyNotConfiguredError extends GitInternalError {
  constructor(gitProviderId: string) {
    super(
      'github_app_private_key_not_configured',
      { gitProviderId },
      'GithubTokenResolverFactory: GITHUB_APP_PRIVATE_KEY is not configured (shared mode)',
    );
    this.name = 'GithubAppPrivateKeyNotConfiguredError';
  }
}

export class GithubAppRepositoryNotProvidedError extends GitInternalError {
  constructor(gitProviderId: string) {
    super(
      'github_app_repository_not_provided',
      { gitProviderId },
      'GithubTokenResolverFactory: orgGitHubAppRepository is required for on-prem mode with app auth',
    );
    this.name = 'GithubAppRepositoryNotProvidedError';
  }
}

export class GithubAppOrganizationAppIdMissingError extends GitInternalError {
  constructor(gitProviderId: string) {
    super(
      'github_app_organization_app_id_missing',
      { gitProviderId, authMethod: 'app' },
      `GithubTokenResolverFactory: provider ${gitProviderId} has authMethod 'app' but no organizationGitHubAppId (on-prem mode)`,
    );
    this.name = 'GithubAppOrganizationAppIdMissingError';
  }
}

export class GithubOrganizationAppNotFoundError extends GitInternalError {
  constructor(gitProviderId: string, organizationGitHubAppId: string) {
    super(
      'github_organization_app_not_found',
      { gitProviderId, organizationGitHubAppId },
      `GithubTokenResolverFactory: OrganizationGitHubApp ${organizationGitHubAppId} not found (on-prem mode)`,
    );
    this.name = 'GithubOrganizationAppNotFoundError';
  }
}

export class GithubAppIdInvalidError extends GitInternalError {
  constructor(gitProviderId: string, appId: string | number) {
    super(
      'github_app_id_invalid',
      { gitProviderId, appId },
      'GithubTokenResolverFactory: appId must be a positive integer',
    );
    this.name = 'GithubAppIdInvalidError';
  }
}

export class GithubAppPrivateKeyMissingError extends GitInternalError {
  constructor(gitProviderId: string) {
    super(
      'github_app_private_key_missing',
      { gitProviderId },
      'GithubTokenResolverFactory: appPrivateKey is missing',
    );
    this.name = 'GithubAppPrivateKeyMissingError';
  }
}

export class GithubUnsupportedAuthMethodError extends GitInternalError {
  constructor(authMethod: string) {
    super(
      'github_unsupported_auth_method',
      { authMethod },
      `GithubTokenResolverFactory: unsupported authMethod "${authMethod}"`,
    );
    this.name = 'GithubUnsupportedAuthMethodError';
  }
}
