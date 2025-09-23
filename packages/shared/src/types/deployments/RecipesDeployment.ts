import { Branded, brandedIdFactory } from '../brandedTypes';
import { RecipeVersion } from '../recipes';
import { GitCommit } from '../git';
import { OrganizationId, UserId } from '../accounts';
import { Target } from './Target';
import { DistributionStatus } from './DistributionStatus';

export type RecipesDeploymentId = Branded<'RecipesDeploymentId'>;
export const createRecipesDeploymentId =
  brandedIdFactory<RecipesDeploymentId>();

export type RecipesDeployment = {
  id: RecipesDeploymentId;
  recipeVersions: RecipeVersion[];
  createdAt: string;
  authorId: UserId;
  organizationId: OrganizationId;
  gitCommit?: GitCommit; // Optional - undefined for failed deployments
  target: Target; // Required - always present
  status: DistributionStatus; // Required - success or failure
  error?: string; // Optional - only present for failed deployments
};
