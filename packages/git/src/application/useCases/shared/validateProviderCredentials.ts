import { InvalidGitProviderCredentialsError } from '@packmind/types';

export type CredentialView = {
  authMethod: 'token' | 'app';
  token: string | null;
  appInstallationId: number | null;
};

function isMissing(value: string | number | null | undefined): boolean {
  return value === undefined || value === null || value === '';
}

function isPresent(value: string | number | null | undefined): boolean {
  return !isMissing(value);
}

export function validateProviderCredentials(
  view: CredentialView,
  _edition: 'cloud' | 'oss',
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
}
