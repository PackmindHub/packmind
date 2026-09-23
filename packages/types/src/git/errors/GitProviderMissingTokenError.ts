import { GitError } from './GitError';

export class GitProviderMissingTokenError extends GitError {
  constructor(public readonly gitProviderId: string) {
    super(
      'invalid_input',
      'git_provider_missing_token',
      { gitProviderId },
      'Git provider has no token configured. Cannot add repositories to providers without authentication.',
    );
    this.name = 'GitProviderMissingTokenError';
  }
}
