import { Factory } from '@packmind/shared/test';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import {
  DistributionStatus,
  createStandardsDeploymentId,
  StandardsDeployment,
} from '@packmind/shared';
import { targetFactory } from './targetFactory';

export const standardsDeploymentFactory: Factory<StandardsDeployment> = (
  deployment?: Partial<StandardsDeployment>,
) => {
  return {
    id: createStandardsDeploymentId('test-standard-deployment'),
    authorId: createUserId('test-author-id'),
    organizationId: createOrganizationId('test-organization'),
    standardVersions: [],
    target: targetFactory(),
    status: DistributionStatus.success,
    createdAt: new Date().toISOString(),
    ...deployment,
  };
};
