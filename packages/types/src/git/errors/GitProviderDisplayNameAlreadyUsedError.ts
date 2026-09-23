import { GitError } from './GitError';

export class GitProviderDisplayNameAlreadyUsedError extends GitError {
  constructor(
    public readonly displayName: string,
    public readonly organizationId: string,
  ) {
    super(
      'conflict',
      'git_provider_display_name_already_used',
      { displayName, organizationId },
      `A connection with display name '${displayName}' already exists in this organization`,
    );
    this.name = 'GitProviderDisplayNameAlreadyUsedError';
  }
}
