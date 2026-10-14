export const SYNC_FROM_REPOSITORY_LABEL = 'Sync from repository';

export const syncFromRepositoryTooltip = (branch: string) =>
  `Read the lock files on ${branch}.`;

export const syncRepositoryLabel = (repoName: string) => `Sync ${repoName}`;

export const syncRepositoryTooltip = (repoName: string, branch: string) =>
  `Sync ${repoName} from ${branch}`;

export const SYNC_CLI_ONLY =
  'Installed with the CLI. Run `packmind distribution record` in this repository.';

export const syncBrokenConnection = (reason: string) =>
  `Git connection broken. ${reason}`;

export const SYNC_CHECKING_GIT_CONNECTION = 'Checking the Git connection…';

export const syncedToastTitle = (branch: string) => `Synced from ${branch}`;

export const syncedToastDescription = (updatedTargetCount: number) =>
  updatedTargetCount === 0
    ? 'Nothing changed.'
    : `${updatedTargetCount} target${updatedTargetCount === 1 ? '' : 's'} updated.`;

export const SYNC_WARNINGS_TITLE = "Some lock files weren't fully recorded";

export const olderCliLocksMessage = (count: number) =>
  count === 1
    ? 'Written by an older CLI. Distribute again to update it:'
    : 'Written by an older CLI. Distribute again to update them:';

export const unknownPackagesMessage = (count: number) =>
  count === 1
    ? "Unknown package (renamed, deleted, or in a space you can't access):"
    : "Unknown packages (renamed, deleted, or in a space you can't access):";

export const unknownPackagesFix = (count: number) =>
  `Fix or remove ${count === 1 ? 'it' : 'them'} in packmind.json, run packmind install, then push.`;
