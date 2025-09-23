import { Factory } from '@packmind/shared/test';
import { recipeFactory } from '@packmind/recipes/test/recipeFactory';
import { recipeVersionFactory } from '@packmind/recipes/test/recipeVersionFactory';
import { gitRepoFactory } from '@packmind/git/test/gitRepoFactory';
import {
  DeployedRecipeInfo,
  DeploymentOverview,
  RecipeDeploymentStatus,
  RepositoryDeploymentInfo,
  RepositoryDeploymentStatus,
  TargetDeploymentStatus,
  TargetDeploymentInfo,
  DeployedRecipeTargetInfo,
} from '@packmind/shared';
import { targetFactory } from './targetFactory';

export const createDeployedRecipeInfo = (
  deployedRecipeInfo?: Partial<DeployedRecipeInfo>,
): DeployedRecipeInfo => {
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
    ...deployedRecipeInfo,
  };
};

export const createRepositoryDeploymentStatus = (
  repositoryDeploymentStatus?: Partial<RepositoryDeploymentStatus>,
): RepositoryDeploymentStatus => {
  return {
    gitRepo: gitRepoFactory(),
    deployedRecipes: [createDeployedRecipeInfo()],
    hasOutdatedRecipes: true,
    ...repositoryDeploymentStatus,
  };
};

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

// Target-centric factory functions
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

export const createTargetDeploymentStatus = (
  targetDeploymentStatus?: Partial<TargetDeploymentStatus>,
): TargetDeploymentStatus => {
  const target = targetFactory();
  return {
    target,
    gitRepo: gitRepoFactory({ id: target.gitRepoId }),
    deployedRecipes: [createDeployedRecipeTargetInfo()],
    hasOutdatedRecipes: true,
    ...targetDeploymentStatus,
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

export const createDeploymentOverview: Factory<DeploymentOverview> = (
  deploymentOverview?: Partial<DeploymentOverview>,
) => {
  return {
    repositories: [createRepositoryDeploymentStatus()],
    targets: [createTargetDeploymentStatus()],
    recipes: [createRecipeDeploymentStatus()],
    ...deploymentOverview,
  };
};
