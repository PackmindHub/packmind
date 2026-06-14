import {
  GithubAppMode,
  InvalidGitProviderCredentialsError,
} from '@packmind/types';

export type CredentialView = {
  authMethod: 'token' | 'app';
  token: string | null;
  appInstallationId: number | null;
  organizationGitHubAppId: string | null;
};

function isMissing(value: string | number | null | undefined): boolean {
  return value === undefined || value === null || value === '';
}

function isPresent(value: string | number | null | undefined): boolean {
  return !isMissing(value);
}

export function validateProviderCredentials(
  view: CredentialView,
  mode: GithubAppMode,
  { allowTokenless = false }: { allowTokenless?: boolean } = {},
): void {
  if (view.authMethod !== 'token' && view.authMethod !== 'app') {
    throw new InvalidGitProviderCredentialsError('Unsupported authMethod');
  }

  if (view.authMethod === 'token') {
    if (isMissing(view.token) && !allowTokenless) {
      throw new InvalidGitProviderCredentialsError(
        'Git provider token is required',
      );
    }

    if (isPresent(view.appInstallationId)) {
      throw new InvalidGitProviderCredentialsError(
        'App credentials must not be set when authMethod is "token"',
      );
    }

    if (isPresent(view.organizationGitHubAppId)) {
      throw new InvalidGitProviderCredentialsError(
        'App credentials must not be set when authMethod is "token"',
      );
    }

    return;
  }

  // authMethod === 'app'
  if (isPresent(view.token)) {
    throw new InvalidGitProviderCredentialsError(
      'Token must not be set when authMethod is "app"',
    );
  }

  if (isMissing(view.appInstallationId)) {
    throw new InvalidGitProviderCredentialsError(
      'GitHub App installation ID is required',
    );
  }

  // Per-org mode binds each app-auth provider to a specific stored
  // OrganizationGitHubApp so re-running the manifest doesn't silently rebind
  // installations to a new App (which would 404 at JWT exchange). Shared mode
  // uses an env-configured App and has no on-prem App row.
  if (mode === 'on-prem' && isMissing(view.organizationGitHubAppId)) {
    throw new InvalidGitProviderCredentialsError(
      'organizationGitHubAppId is required when authMethod is "app"',
    );
  }
}
