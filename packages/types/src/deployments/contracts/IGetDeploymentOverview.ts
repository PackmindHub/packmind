import { GitRepo } from '../../git/GitRepo';
import { Recipe } from '../../recipes/Recipe';
import { RecipeVersion } from '../../recipes/RecipeVersion';
import { Target } from '../Target';

export interface RepositoryDeploymentStatus {
  gitRepo: GitRepo;
  deployedRecipes: DeployedRecipeInfo[];
  hasOutdatedRecipes: boolean;
}

export interface TargetDeploymentStatus {
  target: Target;
  gitRepo: GitRepo;
  deployedRecipes: DeployedRecipeTargetInfo[];
  hasOutdatedRecipes: boolean;
}

export interface DeployedRecipeInfo {
  recipe: Recipe;
  deployedVersion: RecipeVersion;
  latestVersion: RecipeVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}

export interface DeployedRecipeTargetInfo {
  recipe: Recipe;
  deployedVersion: RecipeVersion;
  latestVersion: RecipeVersion;
  isUpToDate: boolean;
  deploymentDate: string;
  isDeleted?: boolean;
}

export interface RecipeDeploymentStatus {
  recipe: Recipe;
  latestVersion: RecipeVersion;
  deployments: RepositoryDeploymentInfo[];
  targetDeployments: TargetDeploymentInfo[];
  hasOutdatedDeployments: boolean;
  isDeleted?: boolean;
}

export interface RepositoryDeploymentInfo {
  gitRepo: GitRepo;
  deployedVersion: RecipeVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}

export interface TargetDeploymentInfo {
  target: Target;
  gitRepo: GitRepo;
  deployedVersion: RecipeVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}
