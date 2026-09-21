import { Distribution } from './Distribution';
import { DistributedPackage } from './DistributedPackage';

type ArtifactVersions = keyof Pick<
  DistributedPackage,
  'standardVersions' | 'recipeVersions' | 'skillVersions'
>;

export type DistributedPackageHistoryEntry = Omit<
  DistributedPackage,
  ArtifactVersions
>;

/**
 * A distributed package in one artifact's history: the versions of that
 * artifact it carried, filtered to that artifact by the listing's WHERE, and no
 * other collection. The other two hang off the same row, so joining them makes
 * SQL take their product.
 */
export type DistributedPackageArtifactHistoryEntry<V extends ArtifactVersions> =
  DistributedPackageHistoryEntry & Pick<DistributedPackage, V>;

/**
 * A distribution whose distributed packages are `DP`: the type says what a
 * listing loaded on them, rather than leaving arrays undefined behind a type
 * that requires them.
 */
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
