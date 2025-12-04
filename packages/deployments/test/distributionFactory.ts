import { Factory } from '@packmind/test-utils';
import {
  createDistributionId,
  createDistributedPackageId,
  createOrganizationId,
  createPackageId,
  createUserId,
  Distribution,
  DistributionStatus,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { targetFactory } from './targetFactory';

export const distributionFactory: Factory<Distribution> = (
  distribution?: Partial<Distribution>,
) => {
  const distributionId = createDistributionId(uuidv4());
  return {
    id: distributionId,
    distributedPackages: [
      {
        id: createDistributedPackageId(uuidv4()),
        distributionId,
        packageId: createPackageId(uuidv4()),
        recipeVersions: [],
        standardVersions: [],
      },
    ],
    createdAt: new Date().toISOString(),
    authorId: createUserId('test-author-id'),
    organizationId: createOrganizationId(uuidv4()),
    target: targetFactory(),
    status: DistributionStatus.success,
    renderModes: [],
    ...distribution,
  };
};
