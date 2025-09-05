import { Factory } from '@packmind/shared/test';
import {
  StandardDeploymentOverview,
  RepositoryStandardDeploymentStatus,
  DeployedStandardInfo,
  StandardDeploymentStatus,
  RepositoryStandardDeploymentInfo,
} from '../src/domain/types/StandardDeploymentOverview';
import { GitRepo } from '@packmind/git/types';
import {
  Standard,
  StandardVersion,
  createStandardVersionId,
  createStandardId,
} from '@packmind/standards';
import { createGitRepoId, createGitProviderId } from '@packmind/git';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { v4 as uuidv4 } from 'uuid';

export const createStandardDeploymentOverview: Factory<
  StandardDeploymentOverview
> = (overview?: Partial<StandardDeploymentOverview>) => {
  return {
    repositories: [],
    standards: [],
    ...overview,
  };
};

export const createRepositoryStandardDeploymentStatus: Factory<
  RepositoryStandardDeploymentStatus
> = (status?: Partial<RepositoryStandardDeploymentStatus>) => {
  return {
    gitRepo: {
      id: createGitRepoId(uuidv4()),
      name: 'Test Repository',
      owner: 'testowner',
      repo: 'testrepo',
      branch: 'main',
      providerId: createGitProviderId(uuidv4()),
      organizationId: createOrganizationId(uuidv4()),
    } as GitRepo,
    deployedStandards: [],
    hasOutdatedStandards: false,
    ...status,
  };
};

export const createDeployedStandardInfo: Factory<DeployedStandardInfo> = (
  info?: Partial<DeployedStandardInfo>,
) => {
  const standardId = createStandardId('test-standard-id');
  const standardVersion: StandardVersion = {
    id: createStandardVersionId(uuidv4()),
    standardId,
    name: 'Test Standard',
    slug: 'test-standard',
    version: 1,
    description: 'Test standard description',
    summary: null,
    userId: createUserId(uuidv4()),
    scope: null,
  };

  return {
    standard: {
      id: standardId,
      name: 'Test Standard',
      slug: 'test-standard',
      version: 1,
      description: 'Test standard description',
      userId: createUserId(uuidv4()),
      organizationId: createOrganizationId(uuidv4()),
      scope: null,
    } as Standard,
    deployedVersion: standardVersion,
    latestVersion: standardVersion,
    isUpToDate: true,
    deploymentDate: new Date().toISOString(),
    ...info,
  };
};

export const createStandardDeploymentStatus: Factory<
  StandardDeploymentStatus
> = (status?: Partial<StandardDeploymentStatus>) => {
  const standardId = createStandardId('test-standard-id');
  const standardVersion: StandardVersion = {
    id: createStandardVersionId(uuidv4()),
    standardId,
    name: 'Test Standard',
    slug: 'test-standard',
    version: 1,
    description: 'Test standard description',
    summary: null,
    userId: createUserId(uuidv4()),
    scope: null,
  };

  return {
    standard: {
      id: standardId,
      name: 'Test Standard',
      slug: 'test-standard',
      version: 1,
      description: 'Test standard description',
      userId: createUserId(uuidv4()),
      organizationId: createOrganizationId(uuidv4()),
      scope: null,
    } as Standard,
    latestVersion: standardVersion,
    deployments: [],
    hasOutdatedDeployments: false,
    ...status,
  };
};

export const createRepositoryStandardDeploymentInfo: Factory<
  RepositoryStandardDeploymentInfo
> = (info?: Partial<RepositoryStandardDeploymentInfo>) => {
  const standardId = createStandardId('test-standard-id');
  return {
    gitRepo: {
      id: createGitRepoId(uuidv4()),
      name: 'Test Repository',
      owner: 'testowner',
      repo: 'testrepo',
      branch: 'main',
      providerId: createGitProviderId(uuidv4()),
      organizationId: createOrganizationId(uuidv4()),
    } as GitRepo,
    deployedVersion: {
      id: createStandardVersionId(uuidv4()),
      standardId,
      name: 'Test Standard',
      slug: 'test-standard',
      version: 1,
      description: 'Test standard description',
      summary: null,
      userId: createUserId(uuidv4()),
      scope: null,
    },
    isUpToDate: true,
    deploymentDate: new Date().toISOString(),
    ...info,
  };
};
