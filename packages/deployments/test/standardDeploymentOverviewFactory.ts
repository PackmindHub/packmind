import { gitRepoFactory } from '@packmind/git/test/gitRepoFactory';
import { createUserId } from '@packmind/types';
import {
  DeployedStandardTargetInfo,
  RepositoryStandardDeploymentInfo,
  StandardDeploymentStatus,
  TargetStandardDeploymentInfo,
  Standard,
  StandardVersion,
  createStandardVersionId,
  createStandardId,
} from '@packmind/types';
import { targetFactory } from './targetFactory';
import { standardFactory } from '@packmind/standards/test';

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
