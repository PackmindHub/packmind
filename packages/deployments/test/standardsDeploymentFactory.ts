import { Factory } from '@packmind/test-utils';
import {
  DistributionStatus,
  createStandardsDeploymentId,
  StandardsDeployment,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
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
    renderModes: [],
    ...deployment,
  };
};
