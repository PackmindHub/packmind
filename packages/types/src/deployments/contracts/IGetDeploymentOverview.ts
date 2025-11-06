import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { GitRepo } from '../../git/GitRepo';
import { Recipe } from '../../recipes/Recipe';
import { RecipeVersion } from '../../recipes/RecipeVersion';
import { Target } from '../Target';

export type GetDeploymentOverviewCommand = PackmindCommand & {
  organizationId: OrganizationId;
};

export interface DeploymentOverview {
  repositories: RepositoryDeploymentStatus[]; // Legacy support - keep for backward compatibility
  targets: TargetDeploymentStatus[]; // New target-centric view
  recipes: RecipeDeploymentStatus[];
}

export interface RepositoryDeploymentStatus {
  gitRepo: GitRepo;
  deployedRecipes: DeployedRecipeInfo[];
  hasOutdatedRecipes: boolean;
}

export interface TargetDeploymentStatus {
  target: Target;
  gitRepo: GitRepo; // Include repo info for display
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
}

export interface RecipeDeploymentStatus {
  recipe: Recipe;
  latestVersion: RecipeVersion;
  deployments: RepositoryDeploymentInfo[]; // Legacy support
  targetDeployments: TargetDeploymentInfo[]; // New target-based deployments
  hasOutdatedDeployments: boolean;
}

export interface RepositoryDeploymentInfo {
  gitRepo: GitRepo;
  deployedVersion: RecipeVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}

export interface TargetDeploymentInfo {
  target: Target;
  gitRepo: GitRepo; // Include repo info for display
  deployedVersion: RecipeVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}

export type IGetDeploymentOverview = IUseCase<
  GetDeploymentOverviewCommand,
  DeploymentOverview
>;
