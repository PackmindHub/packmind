import { Factory } from '@packmind/shared/test';
import {} from '@packmind/accounts';
import {
  createOrganizationId,
  createUserId,
  createRecipesDeploymentId,
  RecipesDeployment,
  DistributionStatus,
} from '@packmind/shared/types';
import { v4 as uuidv4 } from 'uuid';
import { targetFactory } from './targetFactory';

export const deploymentFactory: Factory<RecipesDeployment> = (
  deployment?: Partial<RecipesDeployment>,
) => {
  return {
    id: createRecipesDeploymentId(uuidv4()),
    authorId: createUserId('test-author-id'),
    organizationId: createOrganizationId(uuidv4()),
    recipeVersions: [],
    target: targetFactory(),
    status: DistributionStatus.success,
    createdAt: new Date().toISOString(),
    renderModes: [],
    ...deployment,
  };
};
