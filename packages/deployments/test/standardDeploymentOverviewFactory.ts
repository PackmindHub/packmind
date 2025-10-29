import { Factory } from '@packmind/shared/test';
import { gitRepoFactory } from '@packmind/git/test/gitRepoFactory';
import {
  StandardDeploymentOverview,
  RepositoryStandardDeploymentStatus,
  TargetStandardDeploymentStatus,
  StandardDeploymentStatus,
  DeployedStandardInfo,
  DeployedStandardTargetInfo,
  RepositoryStandardDeploymentInfo,
  TargetStandardDeploymentInfo,
  Standard,
  StandardVersion,
  createUserId,
  createStandardVersionId,
  createStandardId,
} from '@packmind/shared';
import { targetFactory } from './targetFactory';
import { standardFactory } from '@packmind/standards/test';

// Mock standard and standard version for testing
export const createMockStandard = (standard?: Partial<Standard>): Standard =>
  standardFactory({
    name: 'Test Standard',
    slug: 'test-standard',
    scope: 'test-scope',
    ...standard,
  });

export const createMockStandardVersion = (
  standardVersion?: Partial<StandardVersion>,
): StandardVersion => ({
  id: createStandardVersionId('test-standard-version-id'),
  standardId: createStandardId('test-standard-id'),
  name: 'Test Standard',
  slug: 'test-standard',
  version: 1,
  description: 'Test standard description',
  summary: null,
  userId: createUserId('test-user-id'),
  scope: null,
  ...standardVersion,
});

export const createDeployedStandardInfo = (
  deployedStandardInfo?: Partial<DeployedStandardInfo>,
): DeployedStandardInfo => {
  const standard = createMockStandard();
  const deployedVersion = createMockStandardVersion({
    standardId: standard.id,
  });
  const latestVersion = createMockStandardVersion({
    standardId: standard.id,
    version: deployedVersion.version + 1,
  });

  return {
    standard,
    deployedVersion,
    latestVersion,
    isUpToDate: false,
    deploymentDate: new Date().toISOString(),
    ...deployedStandardInfo,
  };
};

export const createDeployedStandardTargetInfo = (
  deployedStandardTargetInfo?: Partial<DeployedStandardTargetInfo>,
): DeployedStandardTargetInfo => {
  const standard = createMockStandard();
  const deployedVersion = createMockStandardVersion({
    standardId: standard.id,
  });
  const latestVersion = createMockStandardVersion({
    standardId: standard.id,
    version: deployedVersion.version + 1,
  });

  return {
    standard,
    deployedVersion,
    latestVersion,
    isUpToDate: false,
    deploymentDate: new Date().toISOString(),
    ...deployedStandardTargetInfo,
  };
};

export const createRepositoryStandardDeploymentStatus = (
  repositoryStandardDeploymentStatus?: Partial<RepositoryStandardDeploymentStatus>,
): RepositoryStandardDeploymentStatus => {
  return {
    gitRepo: gitRepoFactory(),
    deployedStandards: [createDeployedStandardInfo()],
    hasOutdatedStandards: true,
    ...repositoryStandardDeploymentStatus,
  };
};

export const createTargetStandardDeploymentStatus = (
  targetStandardDeploymentStatus?: Partial<TargetStandardDeploymentStatus>,
): TargetStandardDeploymentStatus => {
  const target = targetFactory();
  return {
    target,
    gitRepo: gitRepoFactory({ id: target.gitRepoId }),
    deployedStandards: [createDeployedStandardTargetInfo()],
    hasOutdatedStandards: true,
    ...targetStandardDeploymentStatus,
  };
};

export const createRepositoryStandardDeploymentInfo = (
  repositoryStandardDeploymentInfo?: Partial<RepositoryStandardDeploymentInfo>,
): RepositoryStandardDeploymentInfo => {
  return {
    gitRepo: gitRepoFactory(),
    deployedVersion: createMockStandardVersion(),
    isUpToDate: false,
    deploymentDate: new Date().toISOString(),
    ...repositoryStandardDeploymentInfo,
  };
};

export const createTargetStandardDeploymentInfo = (
  targetStandardDeploymentInfo?: Partial<TargetStandardDeploymentInfo>,
): TargetStandardDeploymentInfo => {
  const target = targetFactory();
  return {
    target,
    gitRepo: gitRepoFactory({ id: target.gitRepoId }),
    deployedVersion: createMockStandardVersion(),
    isUpToDate: false,
    deploymentDate: new Date().toISOString(),
    ...targetStandardDeploymentInfo,
  };
};

export const createStandardDeploymentStatus = (
  standardDeploymentStatus?: Partial<StandardDeploymentStatus>,
): StandardDeploymentStatus => {
  const standard = createMockStandard();
  return {
    standard,
    latestVersion: createMockStandardVersion({ standardId: standard.id }),
    deployments: [createRepositoryStandardDeploymentInfo()],
    targetDeployments: [createTargetStandardDeploymentInfo()],
    hasOutdatedDeployments: true,
    ...standardDeploymentStatus,
  };
};

export const createStandardDeploymentOverview: Factory<
  StandardDeploymentOverview
> = (standardDeploymentOverview?: Partial<StandardDeploymentOverview>) => {
  return {
    repositories: [createRepositoryStandardDeploymentStatus()],
    targets: [createTargetStandardDeploymentStatus()],
    standards: [createStandardDeploymentStatus()],
    ...standardDeploymentOverview,
  };
};
