import { Distribution } from './Distribution';
import { DistributedPackage } from './DistributedPackage';

export type DistributedPackageHistoryEntry = Omit<
  DistributedPackage,
  'standardVersions' | 'recipeVersions' | 'skillVersions'
>;

export type DistributionHistoryEntry = Omit<
  Distribution,
  'distributedPackages'
> & {
  distributedPackages: DistributedPackageHistoryEntry[];
};
