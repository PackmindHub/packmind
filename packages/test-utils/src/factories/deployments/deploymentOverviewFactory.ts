import { commandFactory } from '../commands/commandFactory';
import { commandVersionFactory } from '../commands/commandVersionFactory';
import { gitRepoFactory } from '../git/gitRepoFactory';
import {
  CommandDeploymentStatus,
  RepositoryDeploymentInfo,
  TargetDeploymentInfo,
  DeployedCommandTargetInfo,
} from '@packmind/types';
import { targetFactory } from './targetFactory';

export const createRepositoryDeploymentInfo = (
  repositoryDeploymentInfo?: Partial<RepositoryDeploymentInfo>,
): RepositoryDeploymentInfo => {
  return {
    gitRepo: gitRepoFactory(),
    deployedVersion: commandVersionFactory(),
    isUpToDate: false,
    deploymentDate: new Date().toISOString(),
    ...repositoryDeploymentInfo,
  };
};

export const createCommandDeploymentStatus = (
  commandDeploymentStatus?: Partial<CommandDeploymentStatus>,
): CommandDeploymentStatus => {
  const recipe = commandFactory();
  return {
    recipe,
    latestVersion: commandVersionFactory({ recipeId: recipe.id }),
    deployments: [createRepositoryDeploymentInfo()],
    targetDeployments: [createTargetDeploymentInfo()],
    hasOutdatedDeployments: true,
    ...commandDeploymentStatus,
  };
};

export const createDeployedCommandTargetInfo = (
  deployedCommandTargetInfo?: Partial<DeployedCommandTargetInfo>,
): DeployedCommandTargetInfo => {
  const recipe = commandFactory();
  const deployedVersion = commandVersionFactory({ recipeId: recipe.id });
  const latestVersion = commandVersionFactory({
    recipeId: recipe.id,
    version: deployedVersion.version + 1,
  });

  return {
    recipe,
    deployedVersion,
    latestVersion,
    isUpToDate: false,
    deploymentDate: new Date().toISOString(),
    ...deployedCommandTargetInfo,
  };
};

export const createTargetDeploymentInfo = (
  targetDeploymentInfo?: Partial<TargetDeploymentInfo>,
): TargetDeploymentInfo => {
  const target = targetFactory();
  return {
    target,
    gitRepo: gitRepoFactory({ id: target.gitRepoId }),
    deployedVersion: commandVersionFactory(),
    isUpToDate: false,
    deploymentDate: new Date().toISOString(),
    ...targetDeploymentInfo,
  };
};
