import { Factory } from '@packmind/shared/test';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { v4 as uuidv4 } from 'uuid';
import { createRecipesDeploymentId, RecipesDeployment } from '../src';

export const deploymentFactory: Factory<RecipesDeployment> = (
  deployment?: Partial<RecipesDeployment>,
) => {
  return {
    id: createRecipesDeploymentId(uuidv4()),
    authorId: createUserId('test-author-id'),
    organizationId: createOrganizationId(uuidv4()),
    recipeVersions: [],
    gitRepos: [],
    gitCommits: [],
    createdAt: new Date().toISOString(),
    ...deployment,
  };
};
