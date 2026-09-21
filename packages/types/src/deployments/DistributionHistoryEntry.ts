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
