import { GitError } from './GitError';

export type GitRepoHolder = {
  gitProviderId: string;
  cliManaged: boolean;
};

function holderSuffix(holder: GitRepoHolder | undefined): string {
  if (!holder) {
    return '';
  }
  return holder.cliManaged
    ? ' under a CLI-managed connection'
    : ' under another git provider';
}

export class GitRepoAlreadyExistsError extends GitError {
  constructor(
    public readonly owner: string,
    public readonly repo: string,
    public readonly branch: string,
    public readonly organizationId: string,
    public readonly holder?: GitRepoHolder,
  ) {
    super(
      'conflict',
      'git_repo_already_exists',
      {
        owner,
        repo,
        branch,
        organizationId,
        ...(holder && {
          existingGitProviderId: holder.gitProviderId,
          existingProviderCliManaged: holder.cliManaged,
        }),
      },
      `Repository ${owner}/${repo} on branch '${branch}' already exists in this organization${holderSuffix(holder)}`,
    );
    this.name = 'GitRepoAlreadyExistsError';
  }
}
