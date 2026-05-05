import { recipeFactory } from '@packmind/recipes/test/recipeFactory';
import { recipeVersionFactory } from '@packmind/recipes/test/recipeVersionFactory';
import { gitRepoFactory } from '@packmind/git/test/gitRepoFactory';
import {
  RecipeDeploymentStatus,
  RepositoryDeploymentInfo,
  TargetDeploymentInfo,
  DeployedRecipeTargetInfo,
} from '@packmind/types';
import { targetFactory } from './targetFactory';

export const createRepositoryDeploymentInfo = (
  repositoryDeploymentInfo?: Partial<RepositoryDeploymentInfo>,
): RepositoryDeploymentInfo => {
  return {
    gitRepo: gitRepoFactory(),
    deployedVersion: recipeVersionFactory(),
    isUpToDate: false,
    deploymentDate: new Date().toISOString(),
    ...repositoryDeploymentInfo,
  };
};

export const createRecipeDeploymentStatus = (
  recipeDeploymentStatus?: Partial<RecipeDeploymentStatus>,
): RecipeDeploymentStatus => {
  const recipe = recipeFactory();
  return {
    recipe,
    latestVersion: recipeVersionFactory({ recipeId: recipe.id }),
    deployments: [createRepositoryDeploymentInfo()],
    targetDeployments: [createTargetDeploymentInfo()],
    hasOutdatedDeployments: true,
    ...recipeDeploymentStatus,
  };
};

export const createDeployedRecipeTargetInfo = (
  deployedRecipeTargetInfo?: Partial<DeployedRecipeTargetInfo>,
): DeployedRecipeTargetInfo => {
  const recipe = recipeFactory();
  const deployedVersion = recipeVersionFactory({ recipeId: recipe.id });
  const latestVersion = recipeVersionFactory({
    recipeId: recipe.id,
    version: deployedVersion.version + 1,
  });

  return {
    recipe,
    deployedVersion,
    latestVersion,
    isUpToDate: false,
    deploymentDate: new Date().toISOString(),
    ...deployedRecipeTargetInfo,
  };
};

export const createTargetDeploymentInfo = (
  targetDeploymentInfo?: Partial<TargetDeploymentInfo>,
): TargetDeploymentInfo => {
  const target = targetFactory();
  return {
    target,
    gitRepo: gitRepoFactory({ id: target.gitRepoId }),
    deployedVersion: recipeVersionFactory(),
    isUpToDate: false,
    deploymentDate: new Date().toISOString(),
    ...targetDeploymentInfo,
  };
};
