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

export const olderCliLocksMessage = (count: number) =>
  count === 1
    ? 'Lock written by an older CLI, so its package versions were ignored. Distribute to this target again to refresh it:'
    : 'Locks written by an older CLI, so their package versions were ignored. Distribute to these targets again to refresh them:';

export const unknownPackagesMessage = (count: number) =>
  count === 1
    ? "Packmind has no package with this name. It was renamed or deleted, or it's in a space you can't access:"
    : "Packmind has no packages with these names. They were renamed or deleted, or they're in a space you can't access:";

export const unknownPackagesFix = (count: number) =>
  `Fix or remove ${count === 1 ? 'it' : 'them'} in packmind.json, then run packmind install and push.`;
