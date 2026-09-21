import { GitError } from './GitError';

export class GitProviderNotFoundError extends GitError {
  constructor(public readonly gitProviderId: string) {
    super(
      'not_found',
      'git_provider_not_found',
      { gitProviderId },
      'Git provider not found',
    );
    this.name = 'GitProviderNotFoundError';
  }
}
