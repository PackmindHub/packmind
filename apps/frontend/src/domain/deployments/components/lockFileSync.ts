export const SYNC_FROM_REPOSITORY_LABEL = 'Sync from repository';

export const syncFromRepositoryTooltip = (branch: string) =>
  `Read the packmind-lock.json files on ${branch} and show what each target really runs.`;

export const SYNC_NEEDS_GIT_CONNECTION =
  'Fix the Git connection first: Packmind cannot read this repository.';

export const SYNC_CHECKING_GIT_CONNECTION = 'Checking the Git connection…';

export const syncedToastTitle = (branch: string) => `Synced from ${branch}`;

export const syncedToastDescription = (updatedTargetCount: number) =>
  updatedTargetCount === 0
    ? 'Everything already matched the lock files.'
    : `${updatedTargetCount} target${updatedTargetCount === 1 ? '' : 's'} updated from their lock files.`;

export const SYNC_WARNINGS_TITLE = "Some lock files weren't fully recorded";

export const OLDER_CLI_LOCK_MESSAGE =
  'Written by an older CLI, so its package versions were ignored. Distribute to this target again to refresh its lock file.';

export const unknownPackagesMessage = (count: number) =>
  count === 1
    ? "Not a package of this organization, so it wasn't recorded:"
    : "Not packages of this organization, so they weren't recorded:";
