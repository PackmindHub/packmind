import { StandardsDeploymentId } from './StandardsDeploymentId';
import { StandardVersion } from '../standards/StandardVersion';
import { GitCommit } from '../git/GitCommit';
import { OrganizationId } from '../accounts/Organization';
import { UserId } from '../accounts/User';
import { Target } from './Target';
import { DistributionStatus } from './DistributionStatus';
import { RenderMode } from './RenderMode';

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
  renderModes: RenderMode[]; // Defaults to empty array
};
