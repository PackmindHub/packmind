import { DistributionId } from './DistributionId';
import { DistributedPackage } from './DistributedPackage';
import { GitCommit } from '../git/GitCommit';
import { OrganizationId } from '../accounts/Organization';
import { UserId } from '../accounts/User';
import { Target } from './Target';
import { DistributionStatus } from './DistributionStatus';
import { RenderMode } from './RenderMode';

export type DistributionSource = 'app' | 'cli';

export type Distribution = {
  id: DistributionId;
  distributedPackages: DistributedPackage[];
  createdAt: string;
  authorId: UserId;
  organizationId: OrganizationId;
  gitCommit?: GitCommit; // Optional - undefined for failed distributions
  target: Target; // Required - always present
  status: DistributionStatus; // Required - success or failure
  error?: string; // Optional - only present for failed distributions
  renderModes: RenderMode[]; // Defaults to empty array
  source: DistributionSource;
};
