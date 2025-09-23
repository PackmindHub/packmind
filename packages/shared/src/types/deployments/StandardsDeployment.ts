import { StandardVersion } from '../standards';
import { GitCommit } from '../git';
import { OrganizationId, UserId } from '../accounts';
import { Branded, brandedIdFactory } from '../brandedTypes';
import { Target } from './Target';
import { DistributionStatus } from './DistributionStatus';

export type StandardsDeploymentId = Branded<'StandardDeploymentId'>;
export const createStandardsDeploymentId =
  brandedIdFactory<StandardsDeploymentId>();

export type StandardsDeployment = {
  id: StandardsDeploymentId;
  standardVersions: StandardVersion[];
  createdAt: string;
  authorId: UserId;
  organizationId: OrganizationId;
  // Single target model fields
  gitCommit?: GitCommit; // Optional - undefined for failed deployments
  target: Target; // Required - always present
  status: DistributionStatus; // Required - success or failure
  error?: string; // Optional - only present for failed deployments
};
