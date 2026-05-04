import { gitRepoFactory } from '@packmind/git/test/gitRepoFactory';
import {
  ActiveDistributedPackage,
  ActiveDistributedPackagesByTarget,
  createPackageId,
  DistributionStatus,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { targetFactory } from './targetFactory';

export const createActivePackage = (
  overrides?: Partial<ActiveDistributedPackage>,
): ActiveDistributedPackage => ({
  packageId: createPackageId(uuidv4()),
  lastDistributionStatus: DistributionStatus.success,
  lastDistributedAt: new Date().toISOString(),
  ...overrides,
});

export const createActiveDistributedPackagesByTarget = (
  overrides?: Partial<ActiveDistributedPackagesByTarget>,
): ActiveDistributedPackagesByTarget => {
  const target = overrides?.target ?? targetFactory();
  return {
    targetId: target.id,
    target,
    gitRepo: gitRepoFactory({ id: target.gitRepoId }),
    packages: [],
    deployedRecipes: [],
    deployedStandards: [],
    deployedSkills: [],
    ...overrides,
  };
};
