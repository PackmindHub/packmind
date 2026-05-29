import { InvalidGitProviderCredentialsError } from '@packmind/types';

export type CredentialView = {
  authMethod: 'token' | 'app';
  token: string | null;
  appId: number | null;
  appInstallationId: number | null;
  appPrivateKey: string | null;
};

function isMissing(value: string | number | null | undefined): boolean {
  return value === undefined || value === null || value === '';
}

function isPresent(value: string | number | null | undefined): boolean {
  return !isMissing(value);
}

export function validateProviderCredentials(
  view: CredentialView,
  edition: 'cloud' | 'oss',
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

    const hasAppFields =
      isPresent(view.appId) &&
      isPresent(view.appInstallationId) &&
      isPresent(view.appPrivateKey);

    if (hasAppFields) {
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

  if (edition === 'cloud') {
    if (isPresent(view.appId)) {
      throw new InvalidGitProviderCredentialsError(
        'App ID is managed by the Packmind Cloud instance and must not be provided by the client',
      );
    }

    if (isPresent(view.appPrivateKey)) {
      throw new InvalidGitProviderCredentialsError(
        'App private key is managed by the Packmind Cloud instance and must not be provided by the client',
      );
    }

    if (isMissing(view.appInstallationId)) {
      throw new InvalidGitProviderCredentialsError(
        'GitHub App installation ID is required',
      );
    }

    return;
  }

  // edition === 'oss'
  if (isMissing(view.appId)) {
    throw new InvalidGitProviderCredentialsError('GitHub App ID is required');
  }

  if (isMissing(view.appInstallationId)) {
    throw new InvalidGitProviderCredentialsError(
      'GitHub App installation ID is required',
    );
  }

  if (isMissing(view.appPrivateKey)) {
    throw new InvalidGitProviderCredentialsError(
      'GitHub App private key is required',
    );
  }
}
