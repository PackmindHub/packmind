import { gitRepoFactory } from '@packmind/git/test/gitRepoFactory';
import {
  ActiveDistributedPackage,
  ActiveDistributedPackagesByTarget,
  createPackageId,
  createSpaceId,
  createUserId,
  DistributionStatus,
  Package,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { targetFactory } from './targetFactory';

const buildPackage = (id = createPackageId(uuidv4())): Package => ({
  id,
  name: 'package',
  slug: 'package',
  description: '',
  spaceId: createSpaceId(uuidv4()),
  createdBy: createUserId(uuidv4()),
  recipes: [],
  standards: [],
  skills: [],
});

export const createActivePackage = (
  overrides?: Partial<ActiveDistributedPackage>,
): ActiveDistributedPackage => {
  const pkg = overrides?.package ?? buildPackage(overrides?.packageId);
  return {
    packageId: pkg.id,
    package: pkg,
    lastDistributionStatus: DistributionStatus.success,
    lastDistributedAt: new Date().toISOString(),
    deployedRecipes: [],
    deployedStandards: [],
    deployedSkills: [],
    pendingRecipes: [],
    pendingStandards: [],
    pendingSkills: [],
    ...overrides,
  };
};

export const createActiveDistributedPackagesByTarget = (
  overrides?: Partial<ActiveDistributedPackagesByTarget>,
): ActiveDistributedPackagesByTarget => {
  const target = overrides?.target ?? targetFactory();
  return {
    targetId: target.id,
    target,
    gitRepo: gitRepoFactory({ id: target.gitRepoId }),
    packages: [],
    ...overrides,
  };
};
