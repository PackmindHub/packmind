import { GitError } from './GitError';

export class GitHubAppRevokedError extends GitError {
  constructor(public readonly providerId: string) {
    super(
      'forbidden',
      'github_app_revoked',
      { gitProviderId: providerId },
      'The GitHub App bound to this provider has been revoked. Re-install the current GitHub App to restore access.',
    );
    this.name = 'GitHubAppRevokedError';
  }
}
