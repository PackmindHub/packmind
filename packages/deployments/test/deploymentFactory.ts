import { Factory } from '@packmind/shared/test';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { DistributionStatus } from '@packmind/shared';
import { v4 as uuidv4 } from 'uuid';
import { createRecipesDeploymentId, RecipesDeployment } from '../src';
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
