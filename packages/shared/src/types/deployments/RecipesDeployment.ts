import { Branded, brandedIdFactory } from '../brandedTypes';
import { RecipeVersion } from '../recipes';
import { GitRepo, GitCommit } from '../git';
import { OrganizationId, UserId } from '../accounts';

export type RecipesDeploymentId = Branded<'RecipesDeploymentId'>;
export const createRecipesDeploymentId =
  brandedIdFactory<RecipesDeploymentId>();

export type RecipesDeployment = {
  id: RecipesDeploymentId;
  recipeVersions: RecipeVersion[];
  gitRepos: GitRepo[];
  gitCommits: GitCommit[];
  createdAt: string;
  authorId: UserId;
  organizationId: OrganizationId;
};
