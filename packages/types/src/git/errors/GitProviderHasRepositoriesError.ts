import { GitError } from './GitError';

export class GitProviderHasRepositoriesError extends GitError {
  constructor(
    public readonly gitProviderId: string,
    public readonly repositoryCount: number,
  ) {
    super(
      'invalid_input',
      'git_provider_has_repositories',
      { gitProviderId, repositoryCount },
      `Cannot delete git provider: ${repositoryCount} repositories are still associated with this provider.`,
    );
    this.name = 'GitProviderHasRepositoriesError';
  }
}
