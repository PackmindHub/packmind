import { Distribution } from './Distribution';
import { DistributedPackage } from './DistributedPackage';

type ArtifactVersions = keyof Pick<
  DistributedPackage,
  'standardVersions' | 'recipeVersions' | 'skillVersions'
>;

/**
 * `versionSpec` is projected out alongside the artifact versions: the history
 * answers what went out and when, and the spec a destination was left on is a
 * fact about where that destination stands now, which is what
 * `ActiveDistributedPackage` carries. Add it back here only when a history row
 * is actually meant to name the version it sent.
 */
export type DistributedPackageHistoryEntry = Omit<
  DistributedPackage,
  ArtifactVersions | 'versionSpec'
>;

export type DistributedPackageArtifactHistoryEntry<V extends ArtifactVersions> =
  DistributedPackageHistoryEntry & Pick<DistributedPackage, V>;

export type DistributionHistoryEntryOf<
  DP extends DistributedPackageHistoryEntry,
> = Omit<Distribution, 'distributedPackages'> & {
  distributedPackages: DP[];
};

export type DistributionHistoryEntry =
  DistributionHistoryEntryOf<DistributedPackageHistoryEntry>;

export type CommandDistributionHistoryEntry = DistributionHistoryEntryOf<
  DistributedPackageArtifactHistoryEntry<'recipeVersions'>
>;

export type StandardDistributionHistoryEntry = DistributionHistoryEntryOf<
  DistributedPackageArtifactHistoryEntry<'standardVersions'>
>;

export type SkillDistributionHistoryEntry = DistributionHistoryEntryOf<
  DistributedPackageArtifactHistoryEntry<'skillVersions'>
>;
