import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts';
import { GitRepo } from '../../git';
import { Recipe, RecipeVersion } from '../../recipes';

export type GetDeploymentOverviewCommand = PackmindCommand & {
  organizationId: OrganizationId;
};

export interface DeploymentOverview {
  repositories: RepositoryDeploymentStatus[];
  recipes: RecipeDeploymentStatus[];
}

export interface RepositoryDeploymentStatus {
  gitRepo: GitRepo;
  deployedRecipes: DeployedRecipeInfo[];
  hasOutdatedRecipes: boolean;
}

export interface DeployedRecipeInfo {
  recipe: Recipe;
  deployedVersion: RecipeVersion;
  latestVersion: RecipeVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}

export interface RecipeDeploymentStatus {
  recipe: Recipe;
  latestVersion: RecipeVersion;
  deployments: RepositoryDeploymentInfo[];
  hasOutdatedDeployments: boolean;
}

export interface RepositoryDeploymentInfo {
  gitRepo: GitRepo;
  deployedVersion: RecipeVersion;
  isUpToDate: boolean;
  deploymentDate: string;
}

export type IGetDeploymentOverview = IUseCase<
  GetDeploymentOverviewCommand,
  DeploymentOverview
>;
