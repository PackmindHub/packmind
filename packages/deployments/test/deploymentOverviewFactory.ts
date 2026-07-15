import { commandFactory } from '@packmind/commands/test/commandFactory';
import { commandVersionFactory } from '@packmind/commands/test/commandVersionFactory';
import { gitRepoFactory } from '@packmind/git/test/gitRepoFactory';
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
    command: recipe,
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
    command: recipe,
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
