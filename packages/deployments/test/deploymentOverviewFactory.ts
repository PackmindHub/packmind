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
} from '@packmind/shared';

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
    hasOutdatedDeployments: true,
    ...recipeDeploymentStatus,
  };
};

export const createDeploymentOverview: Factory<DeploymentOverview> = (
  deploymentOverview?: Partial<DeploymentOverview>,
) => {
  return {
    repositories: [createRepositoryDeploymentStatus()],
    recipes: [createRecipeDeploymentStatus()],
    ...deploymentOverview,
  };
};
