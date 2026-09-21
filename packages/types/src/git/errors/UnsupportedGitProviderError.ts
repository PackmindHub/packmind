import { GitError } from './GitError';

export class UnsupportedGitProviderError extends GitError {
  constructor(public readonly gitRemoteUrl: string) {
    super(
      'invalid_input',
      'unsupported_git_provider',
      { gitRemoteUrl },
      `Unsupported git provider for URL '${gitRemoteUrl}'. Only GitHub is currently supported.`,
    );
    this.name = 'UnsupportedGitProviderError';
  }
}
